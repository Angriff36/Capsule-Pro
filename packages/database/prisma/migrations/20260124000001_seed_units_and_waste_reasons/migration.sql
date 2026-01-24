-- Seed Units
-- Weight units (metric and imperial)
INSERT INTO "core"."units" ("id", "code", "name", "name_plural", "unit_system", "unit_type", "is_base_unit") VALUES
(1, 'g', 'gram', 'grams', 'metric', 'weight', false),
(2, 'kg', 'kilogram', 'kilograms', 'metric', 'weight', true),
(3, 'mg', 'milligram', 'milligrams', 'metric', 'weight', false),
(4, 'oz', 'ounce', 'ounces', 'imperial', 'weight', false),
(5, 'lb', 'pound', 'pounds', 'imperial', 'weight', true),
(6, 't', 'ton', 'tons', 'imperial', 'weight', false),

-- Volume units (metric and imperial)
(10, 'ml', 'milliliter', 'milliliters', 'metric', 'volume', false),
(11, 'l', 'liter', 'liters', 'metric', 'volume', true),
(12, 'floz', 'fluid ounce', 'fluid ounces', 'imperial', 'volume', false),
(13, 'cup', 'cup', 'cups', 'imperial', 'volume', false),
(14, 'pt', 'pint', 'pints', 'imperial', 'volume', false),
(15, 'qt', 'quart', 'quarts', 'imperial', 'volume', false),
(16, 'gal', 'gallon', 'gallons', 'imperial', 'volume', true),

-- Count units
(20, 'ea', 'each', 'each', 'custom', 'count', true),
(21, 'doz', 'dozen', 'dozens', 'custom', 'count', false),
(22, 'pcs', 'piece', 'pieces', 'custom', 'count', false),

-- Length units
(30, 'mm', 'millimeter', 'millimeters', 'metric', 'length', false),
(31, 'cm', 'centimeter', 'centimeters', 'metric', 'length', false),
(32, 'm', 'meter', 'meters', 'metric', 'length', true),
(33, 'in', 'inch', 'inches', 'imperial', 'length', false),
(34, 'ft', 'foot', 'feet', 'imperial', 'length', true),

-- Temperature units
(40, 'c', 'celsius', 'celsius', 'metric', 'temperature', true),
(41, 'f', 'fahrenheit', 'fahrenheit', 'imperial', 'temperature', true),

-- Time units
(50, 's', 'second', 'seconds', 'metric', 'time', false),
(51, 'min', 'minute', 'minutes', 'metric', 'time', false),
(52, 'h', 'hour', 'hours', 'metric', 'time', false),
(53, 'd', 'day', 'days', 'metric', 'time', true)
ON CONFLICT ("id") DO NOTHING;

-- Seed Unit Conversions
INSERT INTO "core"."unit_conversions" ("from_unit_id", "to_unit_id", "multiplier") VALUES
-- Weight: metric
(1, 2, 0.001),  -- gram to kilogram
(3, 1, 0.001),  -- milligram to gram
(2, 1, 1000),   -- kilogram to gram

-- Weight: imperial
(4, 5, 0.0625), -- ounce to pound
(5, 4, 16),     -- pound to ounce

-- Weight: cross-system
(1, 4, 0.035274), -- gram to ounce
(2, 5, 2.20462),  -- kilogram to pound

-- Volume: metric
(10, 11, 0.001), -- milliliter to liter
(11, 10, 1000),  -- liter to milliliter

-- Volume: imperial
(12, 13, 0.125), -- fluid ounce to cup
(13, 14, 0.5),   -- cup to pint
(14, 15, 0.5),   -- pint to quart
(15, 16, 0.25),  -- quart to gallon
(16, 15, 4),     -- gallon to quart

-- Volume: cross-system
(11, 16, 0.264172), -- liter to gallon
(10, 12, 0.033814), -- milliliter to fluid ounce

-- Count
(20, 22, 1),     -- each to piece
(21, 20, 12),    -- dozen to each

-- Length: metric
(30, 31, 0.1),   -- millimeter to centimeter
(31, 32, 0.01),  -- centimeter to meter
(30, 32, 0.001), -- millimeter to meter

-- Length: imperial
(33, 34, 0.0833333), -- inch to foot
(34, 33, 12),        -- foot to inch

-- Length: cross-system
(31, 33, 0.393701),  -- centimeter to inch
(32, 34, 3.28084),   -- meter to foot

-- Time
(50, 51, 0.0166667), -- second to minute
(51, 52, 0.0166667), -- minute to hour
(52, 53, 0.0416667), -- hour to day
(51, 50, 60),        -- minute to second
(52, 51, 60),        -- hour to minute
(53, 52, 24)         -- day to hour
ON CONFLICT ("from_unit_id", "to_unit_id") DO NOTHING;

-- Seed Waste Reasons
INSERT INTO "core"."waste_reasons" ("id", "code", "name", "description", "color_hex", "is_active", "sort_order") VALUES
(1, 'spoilage', 'Spoilage', 'Food that has spoiled or expired', '#ef4444', true, 1),
(2, 'overproduction', 'Overproduction', 'Food prepared in excess of what was needed', '#f59e0b', true, 2),
(3, 'prep_error', 'Preparation Error', 'Mistakes made during food preparation', '#f97316', true, 3),
(4, 'burnt', 'Burnt', 'Food that was burnt during cooking', '#dc2626', true, 4),
(5, 'expired', 'Expired', 'Food that reached its expiration date before use', '#b91c1c', true, 5),
(6, 'quality', 'Quality Issues', 'Food that did not meet quality standards', '#eab308', true, 6),
(7, 'dropped', 'Dropped/Spilled', 'Food that was dropped or spilled', '#ca8a04', true, 7),
(8, 'leftovers', 'Leftovers', 'Uneaten food from events or service', '#84cc16', true, 8),
(9, 'customer_return', 'Customer Return', 'Food returned by customers', '#a3e635', true, 9),
(10, 'other', 'Other', 'Other waste reasons not covered above', '#6b7280', true, 10)
ON CONFLICT ("id") DO NOTHING;
