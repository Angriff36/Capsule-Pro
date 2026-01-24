-- Migration: Recipe Costing Engine
-- Description: Add fields for recipe cost calculations, waste factors, and unit conversions

-- Add cost fields to recipe_versions
ALTER TABLE tenant_kitchen.recipe_versions
ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_yield numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_calculated_at timestamptz NULL;

-- Add waste factor and cost fields to recipe_ingredients
ALTER TABLE tenant_kitchen.recipe_ingredients
ADD COLUMN IF NOT EXISTS waste_factor numeric(5,4) DEFAULT 1.0 CHECK (waste_factor > 0),
ADD COLUMN IF NOT EXISTS ingredient_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjusted_quantity numeric(10,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_calculated_at timestamptz NULL;

-- Create function to convert units
CREATE OR REPLACE FUNCTION core.convert_quantity(
    p_quantity numeric,
    p_from_unit_id smallint,
    p_to_unit_id smallint
) RETURNS numeric AS $$
DECLARE
    v_multiplier numeric(20,10);
    v_from_base_unit smallint;
    v_to_base_unit smallint;
BEGIN
    -- If units are the same, return original quantity
    IF p_from_unit_id = p_to_unit_id THEN
        RETURN p_quantity;
    END IF;

    -- Try direct conversion
    SELECT multiplier INTO v_multiplier
    FROM core.unit_conversions
    WHERE from_unit_id = p_from_unit_id AND to_unit_id = p_to_unit_id;

    IF v_multiplier IS NOT NULL THEN
        RETURN p_quantity * v_multiplier;
    END IF;

    -- Try conversion via base unit
    SELECT u.id INTO v_from_base_unit
    FROM core.units u
    WHERE u.id = p_from_unit_id AND u.is_base_unit = true;

    SELECT u.id INTO v_to_base_unit
    FROM core.units u
    WHERE u.id = p_to_unit_id AND u.is_base_unit = true;

    -- If both are base units of same type or can convert via base
    IF v_from_base_unit IS NOT NULL AND v_to_base_unit IS NOT NULL THEN
        -- Get multiplier from source to base
        SELECT multiplier INTO v_multiplier
        FROM core.unit_conversions
        WHERE from_unit_id = p_from_unit_id AND to_unit_id = v_from_base_unit;

        IF v_multiplier IS NOT NULL THEN
            -- Get multiplier from base to target
            DECLARE
                v_multiplier2 numeric(20,10);
            BEGIN
                SELECT multiplier INTO v_multiplier2
                FROM core.unit_conversions
                WHERE from_unit_id = v_to_base_unit AND to_unit_id = p_to_unit_id;

                IF v_multiplier2 IS NOT NULL THEN
                    RETURN p_quantity * v_multiplier * v_multiplier2;
                END IF;
            END;
        END IF;
    END IF;

    -- No conversion found, raise error
    RAISE EXCEPTION 'Cannot convert from unit % to unit %: no conversion path found',
        p_from_unit_id, p_to_unit_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate recipe ingredient cost
CREATE OR REPLACE FUNCTION tenant_kitchen.calculate_recipe_ingredient_cost(
    p_tenant_id uuid,
    p_recipe_ingredient_id uuid
) RETURNS numeric AS $$
DECLARE
    v_ingredient_id uuid;
    v_quantity numeric(10,4);
    v_unit_id smallint;
    v_waste_factor numeric(5,4);
    v_item_unit_cost numeric(10,2);
    v_item_unit_id smallint;
    v_adjusted_quantity numeric(10,4);
    v_cost numeric(12,2);
BEGIN
    -- Get recipe ingredient details
    SELECT
        ingredient_id,
        quantity,
        unit_id,
        COALESCE(waste_factor, 1.0)
    INTO v_ingredient_id, v_quantity, v_unit_id, v_waste_factor
    FROM tenant_kitchen.recipe_ingredients
    WHERE tenant_id = p_tenant_id AND id = p_recipe_ingredient_id;

    -- Find matching inventory item by ingredient name
    -- (Simplified: in production, you'd have a direct relationship)
    SELECT unit_cost, default_unit_id
    INTO v_item_unit_cost, v_item_unit_id
    FROM tenant_kitchen.ingredients i
    LEFT JOIN tenant_inventory.inventory_items ii
        ON ii.tenant_id = i.tenant_id
        AND ii.item_number = i.name
        AND ii.deleted_at IS NULL
    WHERE i.tenant_id = p_tenant_id AND i.id = v_ingredient_id
    AND i.deleted_at IS NULL
    LIMIT 1;

    IF v_item_unit_cost IS NULL THEN
        -- No inventory item found, cost is unknown
        RETURN NULL;
    END IF;

    -- Calculate adjusted quantity with waste factor
    v_adjusted_quantity := v_quantity * v_waste_factor;

    -- Convert units and calculate cost
    IF v_unit_id = v_item_unit_id THEN
        v_cost := v_adjusted_quantity * v_item_unit_cost;
    ELSE
        -- Convert quantity to inventory unit
        DECLARE
            v_converted_quantity numeric(10,4);
        BEGIN
            v_converted_quantity := core.convert_quantity(
                v_adjusted_quantity,
                v_unit_id,
                v_item_unit_id
            );
            v_cost := v_converted_quantity * v_item_unit_cost;
        EXCEPTION WHEN OTHERS THEN
            -- Conversion failed, cannot calculate cost
            RETURN NULL;
        END;
    END IF;

    -- Update recipe ingredient with cost
    UPDATE tenant_kitchen.recipe_ingredients
    SET
        adjusted_quantity = v_adjusted_quantity,
        ingredient_cost = v_cost,
        cost_calculated_at = now()
    WHERE tenant_id = p_tenant_id AND id = p_recipe_ingredient_id;

    RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate total recipe cost
CREATE OR REPLACE FUNCTION tenant_kitchen.calculate_recipe_cost(
    p_tenant_id uuid,
    p_recipe_version_id uuid
) RETURNS numeric AS $$
DECLARE
    v_total_cost numeric(12,2) := 0;
    v_yield_quantity numeric(10,2);
    v_cost_per_yield numeric(12,2);
BEGIN
    -- Calculate cost for each ingredient
    FOR v_total_cost IN
        SELECT COALESCE(ingredient_cost, 0)
        FROM tenant_kitchen.recipe_ingredients
        WHERE tenant_id = p_tenant_id
        AND recipe_version_id = p_recipe_version_id
        AND deleted_at IS NULL
    LOOP
        -- Sum is handled by aggregate, this is a placeholder
    END LOOP;

    -- Get actual sum using direct query
    SELECT COALESCE(SUM(ingredient_cost), 0)
    INTO v_total_cost
    FROM tenant_kitchen.recipe_ingredients
    WHERE tenant_id = p_tenant_id
    AND recipe_version_id = p_recipe_version_id
    AND deleted_at IS NULL;

    -- Get yield quantity
    SELECT yield_quantity INTO v_yield_quantity
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = p_tenant_id AND id = p_recipe_version_id;

    -- Calculate cost per yield unit
    IF v_yield_quantity IS NOT NULL AND v_yield_quantity > 0 THEN
        v_cost_per_yield := v_total_cost / v_yield_quantity;
    ELSE
        v_cost_per_yield := 0;
    END IF;

    -- Update recipe version with cost
    UPDATE tenant_kitchen.recipe_versions
    SET
        total_cost = v_total_cost,
        cost_per_yield = v_cost_per_yield,
        cost_calculated_at = now()
    WHERE tenant_id = p_tenant_id AND id = p_recipe_version_id;

    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate costs for all ingredients in a recipe
CREATE OR REPLACE FUNCTION tenant_kitchen.calculate_all_recipe_costs(
    p_tenant_id uuid,
    p_recipe_version_id uuid
) RETURNS void AS $$
BEGIN
    -- Calculate cost for each ingredient
    FOR ingredient_record IN
        SELECT id
        FROM tenant_kitchen.recipe_ingredients
        WHERE tenant_id = p_tenant_id
        AND recipe_version_id = p_recipe_version_id
        AND deleted_at IS NULL
    LOOP
        PERFORM tenant_kitchen.calculate_recipe_ingredient_cost(
            p_tenant_id,
            ingredient_record.id
        );
    END LOOP;

    -- Calculate total recipe cost
    PERFORM tenant_kitchen.calculate_recipe_cost(p_tenant_id, p_recipe_version_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION core.convert_quantity TO postgres;
GRANT EXECUTE ON FUNCTION tenant_kitchen.calculate_recipe_ingredient_cost TO postgres;
GRANT EXECUTE ON FUNCTION tenant_kitchen.calculate_recipe_cost TO postgres;
GRANT EXECUTE ON FUNCTION tenant_kitchen.calculate_all_recipe_costs TO postgres;
