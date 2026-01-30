-- Change menus.id from text to uuid to match menu_dishes.menu_id
-- This is required for the fk_menu_dishes_menu foreign key constraint

ALTER TABLE tenant_kitchen.menus
ALTER COLUMN id TYPE UUID USING (id::UUID),
ALTER COLUMN id SET DEFAULT gen_random_uuid();
