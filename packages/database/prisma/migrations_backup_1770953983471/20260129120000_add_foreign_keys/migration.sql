-- Migration: Add foreign key constraints for referential integrity
-- This migration adds database-level foreign key constraints to enforce referential integrity
-- All ON DELETE behaviors are chosen based on business logic:
-- - CASCADE: Child records should be deleted when parent is deleted
-- - SET NULL: Child records should remain but lose reference (for soft-delete scenarios)
-- - RESTRICT: Parent cannot be deleted if children exist (for critical entities)

-- =====================================================
-- tenant_crm schema foreign keys
-- =====================================================

-- client_contacts.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_contacts_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_contacts
        ADD CONSTRAINT fk_client_contacts_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- client_interactions.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- client_interactions.lead_id -> leads(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_lead'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_lead
        FOREIGN KEY (tenant_id, lead_id)
        REFERENCES tenant_crm.leads(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- client_interactions.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_employee'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- client_preferences.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_preferences_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_preferences
        ADD CONSTRAINT fk_client_preferences_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- clients.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_clients_assigned_to'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.clients
        ADD CONSTRAINT fk_clients_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- leads.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_leads_assigned_to'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.leads
        ADD CONSTRAINT fk_leads_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- leads.converted_to_client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_leads_converted_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.leads
        ADD CONSTRAINT fk_leads_converted_client
        FOREIGN KEY (tenant_id, converted_to_client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- proposal_line_items.proposal_id -> proposals(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposal_line_items_proposal'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposal_line_items
        ADD CONSTRAINT fk_proposal_line_items_proposal
        FOREIGN KEY (tenant_id, proposal_id)
        REFERENCES tenant_crm.proposals(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- proposals.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- proposals.lead_id -> leads(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_lead'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_lead
        FOREIGN KEY (tenant_id, lead_id)
        REFERENCES tenant_crm.leads(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- proposals.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_event'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- tenant_events schema foreign keys
-- =====================================================

-- battle_boards.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_battle_boards_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.battle_boards
        ADD CONSTRAINT fk_battle_boards_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- budget_line_items.budget_id -> event_budgets(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_line_items_budget'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.budget_line_items
        ADD CONSTRAINT fk_budget_line_items_budget
        FOREIGN KEY (tenant_id, budget_id)
        REFERENCES tenant_events.event_budgets(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- catering_orders.customer_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_catering_orders_customer'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.catering_orders
        ADD CONSTRAINT fk_catering_orders_customer
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- catering_orders.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_catering_orders_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.catering_orders
        ADD CONSTRAINT fk_catering_orders_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- command_board_cards.board_id -> command_boards(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_command_board_cards_board'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.command_board_cards
        ADD CONSTRAINT fk_command_board_cards_board
        FOREIGN KEY (tenant_id, board_id)
        REFERENCES tenant_events.command_boards(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- command_boards.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_command_boards_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.command_boards
        ADD CONSTRAINT fk_command_boards_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- contract_signatures.contract_id -> event_contracts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contract_signatures_contract'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.contract_signatures
        ADD CONSTRAINT fk_contract_signatures_contract
        FOREIGN KEY (tenant_id, contract_id)
        REFERENCES tenant_events.event_contracts(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_budgets.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_budgets_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_budgets
        ADD CONSTRAINT fk_event_budgets_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_contracts.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_contracts_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_contracts
        ADD CONSTRAINT fk_event_contracts_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_contracts.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_contracts_client'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_contracts
        ADD CONSTRAINT fk_event_contracts_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- event_dishes.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_dishes_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_dishes
        ADD CONSTRAINT fk_event_dishes_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_dishes.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_dishes_dish'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_dishes
        ADD CONSTRAINT fk_event_dishes_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- event_guests.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_guests_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_guests
        ADD CONSTRAINT fk_event_guests_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_imports.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_profitability.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_profitability_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_profitability
        ADD CONSTRAINT fk_event_profitability_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_staff_assignments.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_staff_assignments_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT fk_event_staff_assignments_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_staff_assignments.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_staff_assignments_employee'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT fk_event_staff_assignments_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- event_summaries.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_summaries_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_summaries
        ADD CONSTRAINT fk_event_summaries_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- event_timeline.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_timeline_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_timeline
        ADD CONSTRAINT fk_event_timeline_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- events.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_client'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- events.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_location'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- events.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_assigned_to'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- events.venue_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_venue'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_venue
        FOREIGN KEY (tenant_id, venue_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- timeline_tasks.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timeline_tasks_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.timeline_tasks
        ADD CONSTRAINT fk_timeline_tasks_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- timeline_tasks.assignee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timeline_tasks_assignee'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.timeline_tasks
        ADD CONSTRAINT fk_timeline_tasks_assignee
        FOREIGN KEY (tenant_id, assignee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- tenant_inventory schema foreign keys
-- =====================================================

-- inventory_alerts.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_alerts_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_alerts
        ADD CONSTRAINT fk_inventory_alerts_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- inventory_stock.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_stock_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_stock
        ADD CONSTRAINT fk_inventory_stock_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- inventory_stock.storage_location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_stock_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_stock
        ADD CONSTRAINT fk_inventory_stock_location
        FOREIGN KEY (tenant_id, storage_location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- inventory_transactions.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_transactions_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_transactions
        ADD CONSTRAINT fk_inventory_transactions_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- inventory_transactions.storage_location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_transactions_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_transactions
        ADD CONSTRAINT fk_inventory_transactions_location
        FOREIGN KEY (tenant_id, storage_location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- purchase_order_items.purchase_order_id -> purchase_orders(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_po'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_po
        FOREIGN KEY (tenant_id, purchase_order_id)
        REFERENCES tenant_inventory.purchase_orders(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- purchase_order_items.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- purchase_orders.vendor_id -> inventory_suppliers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_orders_vendor'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_orders
        ADD CONSTRAINT fk_purchase_orders_vendor
        FOREIGN KEY (tenant_id, vendor_id)
        REFERENCES tenant_inventory.inventory_suppliers(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- purchase_orders.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_orders_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_orders
        ADD CONSTRAINT fk_purchase_orders_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- shipment_items.shipment_id -> shipments(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipment_items_shipment'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipment_items
        ADD CONSTRAINT fk_shipment_items_shipment
        FOREIGN KEY (tenant_id, shipment_id)
        REFERENCES tenant_inventory.shipments(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- shipment_items.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipment_items_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipment_items
        ADD CONSTRAINT fk_shipment_items_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- shipments.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_event'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- shipments.supplier_id -> inventory_suppliers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_supplier'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_supplier
        FOREIGN KEY (tenant_id, supplier_id)
        REFERENCES tenant_inventory.inventory_suppliers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- shipments.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- storage_locations.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_storage_locations_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.storage_locations
        ADD CONSTRAINT fk_storage_locations_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- tenant_kitchen schema foreign keys
-- =====================================================

-- allergen_warnings.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- allergen_warnings.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- allergen_warnings.acknowledged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_acknowledged_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_acknowledged_by
        FOREIGN KEY (tenant_id, acknowledged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- containers.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_containers_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.containers
        ADD CONSTRAINT fk_containers_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- dishes.recipe_id -> recipes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dishes_recipe'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.dishes
        ADD CONSTRAINT fk_dishes_recipe
        FOREIGN KEY (tenant_id, recipe_id)
        REFERENCES tenant_kitchen.recipes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- dishes.default_container_id -> containers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dishes_container'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.dishes
        ADD CONSTRAINT fk_dishes_container
        FOREIGN KEY (tenant_id, default_container_id)
        REFERENCES tenant_kitchen.containers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- menu_dishes.menu_id -> menus(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_menu_dishes_menu'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.menu_dishes
        ADD CONSTRAINT fk_menu_dishes_menu
        FOREIGN KEY (tenant_id, menu_id)
        REFERENCES tenant_kitchen.menus(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- menu_dishes.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_menu_dishes_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.menu_dishes
        ADD CONSTRAINT fk_menu_dishes_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- prep_comments.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- prep_comments.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- prep_comments.resolved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_resolved_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_resolved_by
        FOREIGN KEY (tenant_id, resolved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_list_items.prep_list_id -> prep_lists(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_list'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_list
        FOREIGN KEY (tenant_id, prep_list_id)
        REFERENCES tenant_kitchen.prep_lists(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- prep_list_items.ingredient_id -> ingredients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_ingredient'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_ingredient
        FOREIGN KEY (tenant_id, ingredient_id)
        REFERENCES tenant_kitchen.ingredients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- prep_list_items.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_list_items.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_recipe_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_recipe_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_list_items.completed_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_completed_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_completed_by
        FOREIGN KEY (tenant_id, completed_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_lists.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_lists_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_lists
        ADD CONSTRAINT fk_prep_lists_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- prep_tasks.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- prep_tasks.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_tasks.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_recipe_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_recipe_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_tasks.method_id -> prep_methods(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_method'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_method
        FOREIGN KEY (tenant_id, method_id)
        REFERENCES tenant_kitchen.prep_methods(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_tasks.container_id -> containers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_container'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_container
        FOREIGN KEY (tenant_id, container_id)
        REFERENCES tenant_kitchen.containers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- prep_tasks.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- prep_tasks.import_id -> prep_list_imports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_import'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_import
        FOREIGN KEY (tenant_id, import_id)
        REFERENCES tenant_kitchen.prep_list_imports(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- recipe_ingredients.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_ingredients_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_ingredients
        ADD CONSTRAINT fk_recipe_ingredients_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- recipe_ingredients.ingredient_id -> ingredients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_ingredients_ingredient'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_ingredients
        ADD CONSTRAINT fk_recipe_ingredients_ingredient
        FOREIGN KEY (tenant_id, ingredient_id)
        REFERENCES tenant_kitchen.ingredients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- recipe_steps.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_steps_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_steps
        ADD CONSTRAINT fk_recipe_steps_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- recipe_versions.recipe_id -> recipes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_versions_recipe'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_versions
        ADD CONSTRAINT fk_recipe_versions_recipe
        FOREIGN KEY (tenant_id, recipe_id)
        REFERENCES tenant_kitchen.recipes(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- recipe_versions.locked_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_versions_locked_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_versions
        ADD CONSTRAINT fk_recipe_versions_locked_by
        FOREIGN KEY (tenant_id, locked_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- task_bundle_items.bundle_id -> task_bundles(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundle_items_bundle'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundle_items
        ADD CONSTRAINT fk_task_bundle_items_bundle
        FOREIGN KEY (tenant_id, bundle_id)
        REFERENCES tenant_kitchen.task_bundles(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- task_bundle_items.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundle_items_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundle_items
        ADD CONSTRAINT fk_task_bundle_items_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- task_bundles.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundles_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundles
        ADD CONSTRAINT fk_task_bundles_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- task_claims.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_claims_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_claims
        ADD CONSTRAINT fk_task_claims_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- task_claims.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_claims_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_claims
        ADD CONSTRAINT fk_task_claims_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- task_progress.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_progress_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_progress
        ADD CONSTRAINT fk_task_progress_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- task_progress.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_progress_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_progress
        ADD CONSTRAINT fk_task_progress_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- waste_entries.inventory_item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_item'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_item
        FOREIGN KEY (tenant_id, inventory_item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- waste_entries.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- waste_entries.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- waste_entries.logged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_logged_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_logged_by
        FOREIGN KEY (tenant_id, logged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- =====================================================
-- tenant_staff schema foreign keys
-- =====================================================

-- budget_alerts.budget_id -> labor_budgets(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_alerts_budget'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.budget_alerts
        ADD CONSTRAINT fk_budget_alerts_budget
        FOREIGN KEY (tenant_id, budget_id)
        REFERENCES tenant_staff.labor_budgets(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- budget_alerts.acknowledged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_alerts_acknowledged_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.budget_alerts
        ADD CONSTRAINT fk_budget_alerts_acknowledged_by
        FOREIGN KEY (tenant_id, acknowledged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- employee_availability.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_availability_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_availability
        ADD CONSTRAINT fk_employee_availability_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_certifications.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_certifications_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_certifications
        ADD CONSTRAINT fk_employee_certifications_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_locations.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_locations_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_locations
        ADD CONSTRAINT fk_employee_locations_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_locations.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_locations_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_locations
        ADD CONSTRAINT fk_employee_locations_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_seniority.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_seniority_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_seniority
        ADD CONSTRAINT fk_employee_seniority_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_skills.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- employee_skills.skill_id -> skills(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_skill'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_skill
        FOREIGN KEY (tenant_id, skill_id)
        REFERENCES tenant_staff.skills(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- employee_skills.verified_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_verified_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_verified_by
        FOREIGN KEY (tenant_id, verified_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- labor_budgets.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_labor_budgets_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.labor_budgets
        ADD CONSTRAINT fk_labor_budgets_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- labor_budgets.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_labor_budgets_event'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.labor_budgets
        ADD CONSTRAINT fk_labor_budgets_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- open_shifts.schedule_id -> schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_schedule'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_staff.schedules(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- open_shifts.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- open_shifts.claimed_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_claimed_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_claimed_by
        FOREIGN KEY (tenant_id, claimed_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- open_shifts.assigned_shift_id -> schedule_shifts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_assigned_shift'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_assigned_shift
        FOREIGN KEY (tenant_id, assigned_shift_id)
        REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- payroll_line_items.payroll_run_id -> payroll_runs(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_line_items_run'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_line_items
        ADD CONSTRAINT fk_payroll_line_items_run
        FOREIGN KEY (tenant_id, payroll_run_id)
        REFERENCES tenant_staff.payroll_runs(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- payroll_line_items.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_line_items_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_line_items
        ADD CONSTRAINT fk_payroll_line_items_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- payroll_runs.payroll_period_id -> payroll_periods(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_runs_period'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_runs
        ADD CONSTRAINT fk_payroll_runs_period
        FOREIGN KEY (tenant_id, payroll_period_id)
        REFERENCES tenant_staff.payroll_periods(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- payroll_runs.approved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_runs_approved_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_runs
        ADD CONSTRAINT fk_payroll_runs_approved_by
        FOREIGN KEY (tenant_id, approved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- schedule_shifts.schedule_id -> schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_schedule'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_staff.schedules(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- schedule_shifts.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- schedule_shifts.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- schedules.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedules_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedules
        ADD CONSTRAINT fk_schedules_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- schedules.published_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedules_published_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedules
        ADD CONSTRAINT fk_schedules_published_by
        FOREIGN KEY (tenant_id, published_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- time_entries.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- time_entries.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- time_entries.shift_id -> schedule_shifts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_shift'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_shift
        FOREIGN KEY (tenant_id, shift_id)
        REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- time_entries.approved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_approved_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_approved_by
        FOREIGN KEY (tenant_id, approved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- timecard_edit_requests.time_entry_id -> time_entries(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timecard_edit_requests_entry'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.timecard_edit_requests
        ADD CONSTRAINT fk_timecard_edit_requests_entry
        FOREIGN KEY (tenant_id, time_entry_id)
        REFERENCES tenant_staff.time_entries(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- timecard_edit_requests.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timecard_edit_requests_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.timecard_edit_requests
        ADD CONSTRAINT fk_timecard_edit_requests_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- =====================================================
-- tenant schema foreign keys
-- =====================================================

-- documents.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_event'
        AND table_schema = 'tenant'
    ) THEN
        ALTER TABLE tenant.documents
        ADD CONSTRAINT fk_documents_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- documents.battle_board_id -> battle_boards(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_battle_board'
        AND table_schema = 'tenant'
    ) THEN
        ALTER TABLE tenant.documents
        ADD CONSTRAINT fk_documents_battle_board
        FOREIGN KEY (tenant_id, battle_board_id)
        REFERENCES tenant_events.battle_boards(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- tenant_admin schema foreign keys
-- =====================================================

-- notifications.recipient_employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_notifications_recipient'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.notifications
        ADD CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (tenant_id, recipient_employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- report_history.report_id -> reports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_report'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_report
        FOREIGN KEY (tenant_id, report_id)
        REFERENCES tenant_admin.reports(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- report_history.schedule_id -> report_schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_schedule'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_admin.report_schedules(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- report_history.generated_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_generated_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_generated_by
        FOREIGN KEY (tenant_id, generated_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- report_schedules.report_id -> reports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_schedules_report'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_schedules
        ADD CONSTRAINT fk_report_schedules_report
        FOREIGN KEY (tenant_id, report_id)
        REFERENCES tenant_admin.reports(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- reports.created_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_reports_created_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.reports
        ADD CONSTRAINT fk_reports_created_by
        FOREIGN KEY (tenant_id, created_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- workflow_executions.workflow_id -> workflows(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_workflow'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_workflow
        FOREIGN KEY (tenant_id, workflow_id)
        REFERENCES tenant_admin.workflows(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- workflow_executions.triggered_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_triggered_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_triggered_by
        FOREIGN KEY (tenant_id, triggered_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- workflow_executions.current_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_step'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_step
        FOREIGN KEY (tenant_id, current_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- workflow_steps.workflow_id -> workflows(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_workflow'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_workflow
        FOREIGN KEY (tenant_id, workflow_id)
        REFERENCES tenant_admin.workflows(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- workflow_steps.on_success_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_success'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_success
        FOREIGN KEY (tenant_id, on_success_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- workflow_steps.on_failure_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_failure'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_failure
        FOREIGN KEY (tenant_id, on_failure_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
