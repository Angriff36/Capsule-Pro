#!/usr/bin/env python3
import re

# Read the schema file
with open('C:/projects/capsule-pro/packages/database/prisma/schema.prisma', 'r') as f:
    content = f.read()

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

# Find the exact location after prep_list_imports
pattern = r'(@@schema\("tenant_kitchen"\)\}\n\n)(/// This table contains check constraints)'
replacement = r'\1' + allergen_warning_model + r'\2'
content = re.sub(pattern, replacement, content)

# Write back to file
with open('C:/projects/capsule-pro/packages/database/prisma/schema.prisma', 'w') as f:
    f.write(content)

print("AllergenWarning model added successfully!")