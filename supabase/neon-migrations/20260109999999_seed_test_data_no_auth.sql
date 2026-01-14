-- Migration: 20260109999999_seed_test_data.sql
-- -- Purpose: Seed test data including auth users, tenant, employees, events, etc.
-- Runs automatically on supabase db reset
-- This migration uses the highest timestamp to run LAST (after all other migrations)

-- ============================================================
-- -- CREATE AUTH USERS (with proper passwords)
-- ============================================================

-- Disable triggers temporarily to avoid conflicts
-- SET session_replication_role = 'replica';

-- -- Create auth users with proper Supabase auth schema
-- Password: test123456 (bcrypt hash)
-- NOTE: All token/text fields must be empty string '', not NULL for GoTrue to work
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   last_sign_in_at,
--   raw_user_meta_data,
--   raw_app_meta_data
-- ) VALUES
--   (
--     '00000000-0000-0000-0000-000000000000',
--     '00000000-0000-0000-0000-000000000001'::uuid,
--     'authenticated',
--     'authenticated',
--     'admin@test.com',
--     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash for 'test123456'
--     '', -- confirmation_token
--     '', -- email_change
--     '', -- email_change_token_new
--     '', -- recovery_token
--     now(),
--     now(),
--     now(),
--     now(),
--     '{"first_name": "Super", "last_name": "Admin", "role": "super_admin"}'::jsonb,
--     '{"provider": "email", "tenant_id": "00000000-0000-0000-0000-000000000000"}'::jsonb
--   ),
--   (
--     '00000000-0000-0000-0000-000000000000',
--     '11111111-1111-1111-1111-111111111101'::uuid,
--     'authenticated',
--     'authenticated',
--     'test-tenant-admin@test.com',
--     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash for 'test123456'
--     '', -- confirmation_token
--     '', -- email_change
--     '', -- email_change_token_new
--     '', -- recovery_token
--     now(),
--     now(),
--     now(),
--     now(),
--     '{"first_name": "Test", "last_name": "Admin", "role": "admin"}'::jsonb,
--     '{"provider": "email", "tenant_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
--   ),
--   (
--     '00000000-0000-0000-0000-000000000000',
--     '11111111-1111-1111-1111-111111111102'::uuid,
--     'authenticated',
--     'authenticated',
--     'staff@test.com',
--     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash for 'test123456'
--     '', -- confirmation_token
--     '', -- email_change
--     '', -- email_change_token_new
--     '', -- recovery_token
--     now(),
--     now(),
--     now(),
--     now(),
--     '{"first_name": "Test", "last_name": "Staff", "role": "staff"}'::jsonb,
--     '{"provider": "email", "tenant_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
--   )
-- ON CONFLICT (id) DO NOTHING;
-- 
-- -- Re-enable triggers
-- -- SET session_replication_role = 'origin';
-- 
-- -- ============================================================
-- -- CREATE PLATFORM ACCOUNTS (Tenants)
-- -- ============================================================
-- 
-- -- Super Admin Account (for managing client accounts)
-- INSERT INTO platform.accounts (
--   id,
--   slug,
--   name,
--   subscription_status,
--   subscription_tier,
--   created_at,
--   updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'super-admin',
--   'Super Admin Account',
--   'active',
--   'enterprise',
--   now(),
--   now()
-- ) ON CONFLICT (id) DO NOTHING;
-- 
-- -- Test Tenant Account (for testing the application)
-- INSERT INTO platform.accounts (
--   id,
--   slug,
--   name,
--   subscription_status,
--   subscription_tier,
--   created_at,
--   updated_at
-- ) VALUES (
--   '11111111-1111-1111-1111-111111111111',
--   'test-tenant',
--   'Test Tenant',
--   'active',
--   'trial',
--   now(),
--   now()
-- ) ON CONFLICT (id) DO NOTHING;
-- 
-- -- ============================================================
-- -- CREATE EMPLOYEES
-- -- ============================================================
-- 
-- -- Super Admin Employee (platform-level admin for managing clients)
-- INSERT INTO tenant_staff.employees (
--   tenant_id,
--   id,
--   auth_user_id,
--   email,
--   first_name,
--   last_name,
--   role,
--   employment_type,
--   hourly_rate,
--   hire_date,
--   is_active,
--   created_at,
--   updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000001',
--   'admin@test.com',
--   'Super',
--   'Admin',
--   'super_admin',
--   'full_time',
--   0.00,
--   CURRENT_DATE,
--   true,
--   now(),
--   now()
-- );

-- Test Tenant Admin
INSERT INTO tenant_staff.employees (
  tenant_id,
  id,
  auth_user_id,
  email,
  first_name,
  last_name,
  role,
  employment_type,
  hourly_rate,
  hire_date,
  is_active,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111101',
  'test-tenant-admin@test.com',
  'Test',
  'Admin',
  'admin',
  'full_time',
  50.00,
  CURRENT_DATE,
  true,
  now(),
  now()
);

-- Additional test tenant staff member
INSERT INTO tenant_staff.employees (
  tenant_id,
  id,
  auth_user_id,
  email,
  first_name,
  last_name,
  role,
  employment_type,
  hourly_rate,
  hire_date,
  is_active,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111102',
  'staff@test.com',
  'Test',
  'Staff',
  'staff',
  'full_time',
  25.00,
  CURRENT_DATE,
  true,
  now(),
  now()
);

-- ============================================================
-- CREATE LOCATIONS
-- ============================================================

INSERT INTO tenant.locations (
  tenant_id,
  id,
  name,
  city,
  state_province,
  is_primary,
  is_active
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    'Main Kitchen',
    'New York',
    'NY',
    true,
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000002',
    'Prep Station',
    'New York',
    'NY',
    false,
    true
  );

-- ============================================================
-- CREATE CLIENTS
-- ============================================================

INSERT INTO tenant_crm.clients (
  tenant_id,
  id,
  client_type,
  company_name,
  first_name,
  last_name,
  email,
  phone,
  source,
  assigned_to
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '20000000-0000-0000-0000-000000000001',
    'company',
    'Acme Corporation',
    NULL,
    NULL,
    'events@acme.com',
    '212-555-0101',
    'referral',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '20000000-0000-0000-0000-000000000002',
    'individual',
    NULL,
    'Jane',
    'Smith',
    'jane.smith@gmail.com',
    '917-555-0202',
    'website',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '20000000-0000-0000-0000-000000000003',
    'company',
    'Tech Startup Inc',
    NULL,
    NULL,
    'hello@techstartup.com',
    '347-555-0303',
    'cold_outreach',
    '11111111-1111-1111-1111-111111111101'
  );

-- ============================================================
-- CREATE EVENTS
-- ============================================================

INSERT INTO tenant_events.events (
  tenant_id,
  id,
  title,
  client_id,
  location_id,
  event_type,
  event_date,
  guest_count,
  status,
  budget,
  notes,
  assigned_to
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '30000000-0000-0000-0000-000000000001',
    'Acme Annual Holiday Party',
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'corporate',
    '2024-12-15',
    150,
    'confirmed',
    5000.00,
    'Client requested gluten-free options available',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '30000000-0000-0000-0000-000000000002',
    'Jane Smith Wedding Reception',
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'wedding',
    '2024-12-20',
    120,
    'confirmed',
    8000.00,
    'Formal sit-down dinner, vegetarian options needed',
    '11111111-1111-1111-1111-111111111101'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '30000000-0000-0000-0000-000000000003',
    'Tech Startup Launch Event',
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'corporate',
    '2024-12-28',
    75,
    'tentative',
    3500.00,
    'Casual cocktail reception with hors d''oeuvres',
    '11111111-1111-1111-1111-111111111101'
  );

-- ============================================================
-- CREATE INGREDIENTS
-- ============================================================

INSERT INTO tenant_kitchen.ingredients (
  tenant_id,
  id,
  name,
  category,
  default_unit_id,
  allergens,
  is_active
) VALUES
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000001', 'All-Purpose Flour', 'dry_goods', 20, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000002', 'Butter', 'dairy', 31, ARRAY['dairy']::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000003', 'Atlantic Salmon', 'protein', 31, ARRAY['fish']::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000004', 'Olive Oil', 'oils', 2, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000005', 'Chicken Breast', 'protein', 31, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000006', 'Asparagus', 'produce', 31, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000007', 'Heavy Cream', 'dairy', 2, ARRAY['dairy']::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000008', 'Filet Mignon', 'protein', 31, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000009', 'Garlic', 'produce', 40, ARRAY[]::text[], true),
  ('11111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-000000000010', 'Lemon', 'produce', 40, ARRAY[]::text[], true);

-- ============================================================
-- CREATE RECIPES
-- ============================================================

INSERT INTO tenant_kitchen.recipes (
  tenant_id,
  id,
  name,
  category,
  cuisine_type,
  description,
  is_active
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '50000000-0000-0000-0000-000000000001',
    'Pan-Seared Salmon',
    'entree',
    'American',
    'Fresh salmon with lemon butter sauce',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '50000000-0000-0000-0000-000000000002',
    'Roasted Asparagus',
    'side',
    'American',
    'Fresh asparagus with olive oil and lemon',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '50000000-0000-0000-0000-000000000003',
    'Filet Mignon',
    'entree',
    'French',
    'Prime beef with herb butter',
    true
  );

-- ============================================================
-- CREATE PREP TASKS
-- ============================================================

INSERT INTO tenant_kitchen.prep_tasks (
  tenant_id,
  id,
  event_id,
  location_id,
  name,
  task_type,
  quantity_total,
  quantity_unit_id,
  start_by_date,
  due_by_date,
  status,
  priority
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Portion Salmon Fillets',
    'prep',
    45.0,
    31,
    '2024-12-14',
    '2024-12-15',
    'pending',
    3
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '60000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Trim and Wash Asparagus',
    'prep',
    20.0,
    31,
    '2024-12-14',
    '2024-12-15',
    'pending',
    2
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '60000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Prepare Filet Mignon',
    'prep',
    80.0,
    31,
    '2024-12-19',
    '2024-12-20',
    'pending',
    3
  );

-- ============================================================
-- CREATE INVENTORY ITEMS
-- ============================================================

INSERT INTO tenant_inventory.inventory_items (
  tenant_id,
  id,
  item_number,
  name,
  category,
  unit_cost,
  quantity_on_hand,
  reorder_level,
  tags
) VALUES
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', 'INV-001', 'All-Purpose Flour', 'dry_goods', 0.85, 100.000, 50.000, ARRAY['baking', 'essential']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000002', 'INV-002', 'Butter', 'dairy', 4.50, 40.000, 20.000, ARRAY['dairy', 'refrigerated']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000003', 'INV-003', 'Atlantic Salmon', 'seafood', 12.00, 25.000, 15.000, ARRAY['protein', 'fresh']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000004', 'INV-004', 'Olive Oil', 'oils_vinegars', 18.00, 12.000, 6.000, ARRAY['pantry', 'essential']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000005', 'INV-005', 'Chicken Breast', 'protein', 6.50, 60.000, 30.000, ARRAY['protein', 'versatile']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000006', 'INV-006', 'Asparagus', 'produce', 4.25, 15.000, 10.000, ARRAY['vegetable', 'seasonal']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000007', 'INV-007', 'Heavy Cream', 'dairy', 5.00, 8.000, 6.000, ARRAY['dairy', 'refrigerated']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000008', 'INV-008', 'Filet Mignon', 'protein', 22.00, 35.000, 20.000, ARRAY['protein', 'premium']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000009', 'INV-009', 'Garlic', 'produce', 1.50, 8.000, 5.000, ARRAY['aromatic', 'essential']::text[]),
  ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000010', 'INV-010', 'Lemon', 'produce', 0.75, 50.000, 20.000, ARRAY['citrus', 'garnish']::text[]);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Create a summary view of seeded data
DO $$
DECLARE
--   v_auth_users INTEGER;
  v_accounts INTEGER;
  v_employees INTEGER;
  v_locations INTEGER;
  v_clients INTEGER;
  v_events INTEGER;
  v_ingredients INTEGER;
  v_recipes INTEGER;
  v_prep_tasks INTEGER;
  v_inventory INTEGER;
BEGIN
--   SELECT COUNT(*) INTO v_auth_users FROM auth.users WHERE email LIKE '%@test.com';
  SELECT COUNT(*) INTO v_accounts FROM platform.accounts WHERE slug IN ('super-admin', 'test-tenant');
  SELECT COUNT(*) INTO v_employees FROM tenant_staff.employees;
  SELECT COUNT(*) INTO v_locations FROM tenant.locations;
  SELECT COUNT(*) INTO v_clients FROM tenant_crm.clients;
  SELECT COUNT(*) INTO v_events FROM tenant_events.events;
  SELECT COUNT(*) INTO v_ingredients FROM tenant_kitchen.ingredients;
  SELECT COUNT(*) INTO v_recipes FROM tenant_kitchen.recipes;
  SELECT COUNT(*) INTO v_prep_tasks FROM tenant_kitchen.prep_tasks;
  SELECT COUNT(*) INTO v_inventory FROM tenant_inventory.inventory_items;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'SEED DATA COMPLETE';
  RAISE NOTICE '==================================================';
--   RAISE NOTICE 'Auth Users: % (3 expected)', v_auth_users;
  RAISE NOTICE 'Accounts (Tenants): % (2 expected)', v_accounts;
  RAISE NOTICE 'Employees: % (3 expected)', v_employees;
  RAISE NOTICE 'Locations: % (2 expected)', v_locations;
  RAISE NOTICE 'Clients: % (3 expected)', v_clients;
  RAISE NOTICE 'Events: % (3 expected)', v_events;
  RAISE NOTICE 'Ingredients: % (10 expected)', v_ingredients;
  RAISE NOTICE 'Recipes: % (3 expected)', v_recipes;
  RAISE NOTICE 'Prep Tasks: % (3 expected)', v_prep_tasks;
  RAISE NOTICE 'Inventory Items: % (10 expected)', v_inventory;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE 'Super Admin: admin@test.com / test123456';
  RAISE NOTICE 'Test Tenant: test-tenant-admin@test.com / test123456';
  RAISE NOTICE 'Staff: staff@test.com / test123456';
  RAISE NOTICE '==================================================';
END $$;

