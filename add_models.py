#!/usr/bin/env python3
import re

# Read the schema file
with open('C:/projects/capsule-pro/packages/database/prisma/schema.prisma', 'r') as f:
    content = f.read()

# EventGuest model
event_guest_model = """
model EventGuest {
  tenantId             String    @map("tenant_id") @db.Uuid
  id                   String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventId              String    @map("event_id") @db.Uuid
  guestName            String    @map("guest_name")
  guestEmail           String?   @map("guest_email")
  guestPhone           String?   @map("guest_phone")
  isPrimaryContact     Boolean   @default(false) @map("is_primary_contact")
  dietaryRestrictions  String[]  @map("dietary_restrictions")
  allergenRestrictions String[]  @map("allergen_restrictions")
  notes                String?
  specialMealRequired  Boolean   @default(false) @map("special_meal_required")
  specialMealNotes     String?   @map("special_meal_notes")
  tableAssignment      String?   @map("table_assignment")
  mealPreference       String?   @map("meal_preference")
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz(6)
  tenant               Account   @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  // Note: eventId references tenant_events.events(tenant_id, id) - composite FK enforced at DB level

  @@id([tenantId, id])
  @@index([eventId])
  @@index([dietaryRestrictions], type: Gin)
  @@index([allergenRestrictions], type: Gin)
  @@map("event_guests")
  @@schema("tenant_events")
}

"""

# AllergenWarning model
allergen_warning_model = """
model AllergenWarning {
  tenantId           String    @map("tenant_id") @db.Uuid
  id                 String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventId            String    @map("event_id") @db.Uuid
  dishId             String?   @map("dish_id") @db.Uuid
  warningType        String    @map("warning_type")
  allergens          String[]
  affectedGuests     String[]  @map("affected_guests")
  severity           String    @default("warning")
  isAcknowledged     Boolean   @default(false) @map("is_acknowledged")
  acknowledgedBy     String?   @map("acknowledged_by") @db.Uuid
  acknowledgedAt     DateTime? @map("acknowledged_at") @db.Timestamptz(6)
  overrideReason     String?   @map("override_reason")
  resolved           Boolean   @default(false)
  resolvedAt         DateTime? @map("resolved_at") @db.Timestamptz(6)
  notes              String?
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt          DateTime? @map("deleted_at") @db.Timestamptz(6)
  tenant             Account   @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  // Note: eventId references tenant_events.events(tenant_id, id) - composite FK enforced at DB level
  // Note: dishId references tenant_kitchen.dishes(tenant_id, id) - composite FK enforced at DB level

  @@id([tenantId, id])
  @@index([eventId])
  @@index([dishId])
  @@index([warningType])
  @@index([isAcknowledged])
  @@index([allergens], type: Gin)
  @@map("allergen_warnings")
  @@schema("tenant_kitchen")
}

"""

# Add EventGuest model after CateringOrder
pattern1 = r'(@@schema\("tenant_events"\)\}\s*)(model InventoryItem {)'
replacement1 = r'\1' + event_guest_model + r'\2'
content = re.sub(pattern1, replacement1, content)

# Add AllergenWarning model after prep_list_imports
pattern2 = r'(@@schema\("tenant_kitchen"\)\}\s*\n\s*\n)(/// This table contains check constraints)'
replacement2 = r'\1' + allergen_warning_model + r'\2'
content = re.sub(pattern2, replacement2, content)

# Write back to file
with open('C:/projects/capsule-pro/packages/database/prisma/schema.prisma', 'w') as f:
    f.write(content)

print("Both models added successfully!")