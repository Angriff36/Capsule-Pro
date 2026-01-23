#!/usr/bin/env python3

import re

def insert_tables():
    # Read the original file
    with open('supabase/Schema Registry v2.txt', 'r') as f:
        content = f.read()

    # Define the event_guests table to insert after catering_orders
    event_guests_table = """
tenant_events.event_guests
  tenant_id uuid NOT NULL
  id uuid DEFAULT gen_random_uuid()
  PK: (tenant_id, id)
  UNIQUE: (tenant_id, id)  -- For composite FK
  event_id uuid NOT NULL
  guest_name text NOT NULL
  guest_email text
  guest_phone text
  is_primary_contact boolean NOT NULL DEFAULT false
  dietary_restrictions text[]  -- vegan, vegetarian, kosher, halal, etc.
  allergen_restrictions text[]  -- peanuts, dairy, gluten, shellfish, etc.
  special_meal_required boolean NOT NULL DEFAULT false
  special_meal_notes text
  meal_preference text
  table_assignment text
  notes text
  created_at, updated_at, deleted_at
  FK: (tenant_id, event_id) -> tenant_events.events
  UNIQUE (tenant_id, guest_name, event_id) WHERE deleted_at IS NULL

"""

    # Define the allergen_warnings table to insert after waste_entries
    allergen_warnings_table = """
tenant_kitchen.allergen_warnings
  tenant_id uuid NOT NULL
  id uuid DEFAULT gen_random_uuid()
  PK: (tenant_id, id)
  UNIQUE: (tenant_id, id)  -- For composite FK
  event_id uuid NOT NULL
  dish_id uuid  -- NULL for general menu warnings
  warning_type text NOT NULL  -- 'allergen_conflict', 'dietary_restriction', 'cross_contamination'
  allergens text[]
  severity text NOT NULL DEFAULT 'warning'  -- 'info', 'warning', 'critical'
  affected_guests text[]  -- Array of guest names or IDs
  is_acknowledged boolean NOT NULL DEFAULT false
  acknowledged_by uuid
  acknowledged_at timestamptz
  override_reason text
  resolved boolean NOT NULL DEFAULT false
  resolved_at timestamptz
  notes text
  created_at, updated_at, deleted_at
  CHECK: warning_type IN ('allergen_conflict', 'dietary_restriction', 'cross_contamination')
  CHECK: severity IN ('info', 'warning', 'critical')
  FK: (tenant_id, event_id) -> tenant_events.events
  FK: (tenant_id, dish_id) -> tenant_kitchen.dishes
  FK: (tenant_id, acknowledged_by) -> tenant_staff.employees

"""

    # Insert event_guests after catering_orders (after line 1006)
    lines = content.split('\n')
    insert_guests_line = None
    for i, line in enumerate(lines):
        if 'Includes status transition validation and auto-generated order numbers' in line:
            insert_guests_line = i + 1  # Insert after this line
            break

    if insert_guests_line is not None:
        lines.insert(insert_guests_line, event_guests_table.strip())

    # Insert allergen_warnings after waste_entries (before line 832)
    insert_allergen_line = None
    for i, line in enumerate(lines):
        if 'FK: (unit_id) -> core.units' in line:
            insert_allergen_line = i + 1  # Insert after this line
            break

    if insert_allergen_line is not None:
        lines.insert(insert_allergen_line, allergen_warnings_table.strip())

    # Write the updated content back
    with open('supabase/Schema Registry v2.txt', 'w') as f:
        f.write('\n'.join(lines))

    print("Tables inserted successfully")

if __name__ == "__main__":
    insert_tables()