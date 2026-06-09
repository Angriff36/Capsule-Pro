// Generated from packages/database/prisma/schema.prisma - DO NOT EDIT
// Produced by manifest/scripts/generate-prisma-model-metadata.mjs
// Re-run after any schema change. Consumed by GenericPrismaStore.
/* eslint-disable */

export interface PrismaFieldMeta {
  name: string;
  irName: string;
  type: string;
  isEnum: boolean;
  isList: boolean;
  optional: boolean;
  hasDefault: boolean;
  isUpdatedAt: boolean;
  isId: boolean;
}

export interface PrismaModelMeta {
  accessor: string;
  dbName: string | null;
  pgSchema: string | null;
  pkFields: string[];
  whereAccessor: string;
  hasDeletedAt: boolean;
  versionProperty?: string;
  fields: PrismaFieldMeta[];
}

export const PRISMA_MODEL_METADATA: Record<string, PrismaModelMeta> = {
  "Account": {
    "accessor": "account",
    "dbName": "accounts",
    "pgSchema": "platform",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slug",
        "irName": "slug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultTimezone",
        "irName": "defaultTimezone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "weekStart",
        "irName": "weekStart",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subscriptionTier",
        "irName": "subscriptionTier",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subscriptionStatus",
        "irName": "subscriptionStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxLocations",
        "irName": "maxLocations",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxEmployees",
        "irName": "maxEmployees",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Location": {
    "accessor": "location",
    "dbName": "locations",
    "pgSchema": "tenant",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countryCode",
        "irName": "countryCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timezone",
        "irName": "timezone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPrimary",
        "irName": "isPrimary",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Venue": {
    "accessor": "venue",
    "dbName": "venues",
    "pgSchema": "tenant",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueType",
        "irName": "venueType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countryCode",
        "irName": "countryCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacity",
        "irName": "capacity",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactName",
        "irName": "contactName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactPhone",
        "irName": "contactPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactEmail",
        "irName": "contactEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentList",
        "irName": "equipmentList",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferredVendors",
        "irName": "preferredVendors",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accessNotes",
        "irName": "accessNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cateringNotes",
        "irName": "cateringNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "layoutImageUrl",
        "irName": "layoutImageUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "User": {
    "accessor": "user",
    "dbName": "employees",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "firstName",
        "irName": "firstName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastName",
        "irName": "lastName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role",
        "irName": "role",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authUserId",
        "irName": "authUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeNumber",
        "irName": "employeeNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employmentType",
        "irName": "employmentType",
        "type": "EmploymentType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hourlyRate",
        "irName": "hourlyRate",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "salaryAnnual",
        "irName": "salaryAnnual",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hireDate",
        "irName": "hireDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "terminationDate",
        "irName": "terminationDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "avatarUrl",
        "irName": "avatarUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "roleId",
        "irName": "roleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payoutMethod",
        "irName": "payoutMethod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "departmentId",
        "irName": "departmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeBankAccount": {
    "accessor": "employeeBankAccount",
    "dbName": "employee_bank_accounts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bankName",
        "irName": "bankName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountType",
        "irName": "accountType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "routingNumber",
        "irName": "routingNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountNumber",
        "irName": "accountNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountNumberLast4",
        "irName": "accountNumberLast4",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountHolderName",
        "irName": "accountHolderName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isDefault",
        "irName": "isDefault",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verifiedAt",
        "irName": "verifiedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verificationMethod",
        "irName": "verificationMethod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositHistory",
        "irName": "depositHistory",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "KitchenTask": {
    "accessor": "kitchenTask",
    "dbName": "kitchen_tasks",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "summary",
        "irName": "summary",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "complexity",
        "irName": "complexity",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepTask": {
    "accessor": "prepTask",
    "dbName": "prep_tasks",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeVersionId",
        "irName": "recipeVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "methodId",
        "irName": "methodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "containerId",
        "irName": "containerId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taskType",
        "irName": "taskType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityTotal",
        "irName": "quantityTotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityUnitId",
        "irName": "quantityUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityCompleted",
        "irName": "quantityCompleted",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "servingsTotal",
        "irName": "servingsTotal",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startByDate",
        "irName": "startByDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueByDate",
        "irName": "dueByDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueByTime",
        "irName": "dueByTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isEventFinish",
        "irName": "isEventFinish",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedMinutes",
        "irName": "estimatedMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualMinutes",
        "irName": "actualMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "do_not_complete_until",
        "irName": "doNotCompleteUntil",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "import_id",
        "irName": "importId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "KitchenTaskClaim": {
    "accessor": "kitchenTaskClaim",
    "dbName": "task_claims",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "claimedAt",
        "irName": "claimedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "releasedAt",
        "irName": "releasedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "releaseReason",
        "irName": "releaseReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "KitchenTaskProgress": {
    "accessor": "kitchenTaskProgress",
    "dbName": "task_progress",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "progressType",
        "irName": "progressType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "oldStatus",
        "irName": "oldStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "newStatus",
        "irName": "newStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityCompleted",
        "irName": "quantityCompleted",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepList": {
    "accessor": "prepList",
    "dbName": "prep_lists",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "batchMultiplier",
        "irName": "batchMultiplier",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietaryRestrictions",
        "irName": "dietaryRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalItems",
        "irName": "totalItems",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalEstimatedTime",
        "irName": "totalEstimatedTime",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generatedAt",
        "irName": "generatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "finalizedAt",
        "irName": "finalizedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepTaskPlanWorkflow": {
    "accessor": "prepTaskPlanWorkflow",
    "dbName": "prep_task_plan_workflows",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "idempotencyKey",
        "irName": "idempotencyKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentStep",
        "irName": "currentStep",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalSteps",
        "irName": "totalSteps",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generationOptions",
        "irName": "generationOptions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generatedTasks",
        "irName": "generatedTasks",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedTasks",
        "irName": "reviewedTasks",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedTaskIds",
        "irName": "approvedTaskIds",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectedTaskIds",
        "irName": "rejectedTaskIds",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instantiatedTaskIds",
        "irName": "instantiatedTaskIds",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledWindows",
        "irName": "scheduledWindows",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "constraintOutcomes",
        "irName": "constraintOutcomes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errors",
        "irName": "errors",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "warnings",
        "irName": "warnings",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generatedCount",
        "irName": "generatedCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedCount",
        "irName": "approvedCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instantiatedCount",
        "irName": "instantiatedCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startedAt",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepListItem": {
    "accessor": "prepListItem",
    "dbName": "prep_list_items",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "prepListId",
        "irName": "prepListId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stationId",
        "irName": "stationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stationName",
        "irName": "stationName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ingredientId",
        "irName": "ingredientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ingredientName",
        "irName": "ingredientName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "baseQuantity",
        "irName": "baseQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "baseUnit",
        "irName": "baseUnit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scaledQuantity",
        "irName": "scaledQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scaledUnit",
        "irName": "scaledUnit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isOptional",
        "irName": "isOptional",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preparationNotes",
        "irName": "preparationNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allergens",
        "irName": "allergens",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietarySubstitutions",
        "irName": "dietarySubstitutions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishName",
        "irName": "dishName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeVersionId",
        "irName": "recipeVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isCompleted",
        "irName": "isCompleted",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedBy",
        "irName": "completedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Station": {
    "accessor": "station",
    "dbName": "stations",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stationType",
        "irName": "stationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacitySimultaneousTasks",
        "irName": "capacitySimultaneousTasks",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentList",
        "irName": "equipmentList",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Equipment": {
    "accessor": "equipment",
    "dbName": "equipment",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serialNumber",
        "irName": "serialNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "manufacturer",
        "irName": "manufacturer",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "model",
        "irName": "model",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "purchaseDate",
        "irName": "purchaseDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "warrantyExpiry",
        "irName": "warrantyExpiry",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastMaintenanceDate",
        "irName": "lastMaintenanceDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextMaintenanceDate",
        "irName": "nextMaintenanceDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maintenanceIntervalDays",
        "irName": "maintenanceIntervalDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "usageHours",
        "irName": "usageHours",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxUsageHours",
        "irName": "maxUsageHours",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "condition",
        "irName": "condition",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "iotDeviceId",
        "irName": "iotDeviceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "iotDeviceType",
        "irName": "iotDeviceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "connectionStatus",
        "irName": "connectionStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastHeartbeat",
        "irName": "lastHeartbeat",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentSensorData",
        "irName": "currentSensorData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "WorkOrder": {
    "accessor": "workOrder",
    "dbName": "work_orders",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentName",
        "irName": "equipmentName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedCost",
        "irName": "estimatedCost",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualCost",
        "irName": "actualCost",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedDate",
        "irName": "completedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "partsUsed",
        "irName": "partsUsed",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vendorId",
        "irName": "vendorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Event": {
    "accessor": "event",
    "dbName": "events",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventNumber",
        "irName": "eventNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueId",
        "irName": "venueId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueEntityId",
        "irName": "venueEntityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventDate",
        "irName": "eventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestCount",
        "irName": "guestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxCapacity",
        "irName": "maxCapacity",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budget",
        "irName": "budget",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ticketPrice",
        "irName": "ticketPrice",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ticketTier",
        "irName": "ticketTier",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventFormat",
        "irName": "eventFormat",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accessibilityOptions",
        "irName": "accessibilityOptions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "featuredMediaUrl",
        "irName": "featuredMediaUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueName",
        "irName": "venueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueAddress",
        "irName": "venueAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "templateId",
        "irName": "templateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventProfitability": {
    "accessor": "eventProfitability",
    "dbName": "event_profitability",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedRevenue",
        "irName": "budgetedRevenue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedFoodCost",
        "irName": "budgetedFoodCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedLaborCost",
        "irName": "budgetedLaborCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedOverhead",
        "irName": "budgetedOverhead",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedTotalCost",
        "irName": "budgetedTotalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedGrossMargin",
        "irName": "budgetedGrossMargin",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedGrossMarginPct",
        "irName": "budgetedGrossMarginPct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualRevenue",
        "irName": "actualRevenue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualFoodCost",
        "irName": "actualFoodCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualLaborCost",
        "irName": "actualLaborCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualOverhead",
        "irName": "actualOverhead",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualTotalCost",
        "irName": "actualTotalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualGrossMargin",
        "irName": "actualGrossMargin",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualGrossMarginPct",
        "irName": "actualGrossMarginPct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "revenueVariance",
        "irName": "revenueVariance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "foodCostVariance",
        "irName": "foodCostVariance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "laborCostVariance",
        "irName": "laborCostVariance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCostVariance",
        "irName": "totalCostVariance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "marginVariancePct",
        "irName": "marginVariancePct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "calculatedAt",
        "irName": "calculatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "calculationMethod",
        "irName": "calculationMethod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventSummary": {
    "accessor": "eventSummary",
    "dbName": "event_summaries",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "highlights",
        "irName": "highlights",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issues",
        "irName": "issues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "financialPerformance",
        "irName": "financialPerformance",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientFeedback",
        "irName": "clientFeedback",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "insights",
        "irName": "insights",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overallSummary",
        "irName": "overallSummary",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generatedAt",
        "irName": "generatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generationDurationMs",
        "irName": "generationDurationMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventReport": {
    "accessor": "eventReport",
    "dbName": "event_reports",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completion",
        "irName": "completion",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checklistData",
        "irName": "checklistData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedEventData",
        "irName": "parsedEventData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportConfig",
        "irName": "reportConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoFillScore",
        "irName": "autoFillScore",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewNotes",
        "irName": "reviewNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventBudget": {
    "accessor": "eventBudget",
    "dbName": "event_budgets",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalBudgetAmount",
        "irName": "totalBudgetAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalActualAmount",
        "irName": "totalActualAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "varianceAmount",
        "irName": "varianceAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variancePercentage",
        "irName": "variancePercentage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BudgetLineItem": {
    "accessor": "budgetLineItem",
    "dbName": "budget_line_items",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetId",
        "irName": "budgetId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetedAmount",
        "irName": "budgetedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualAmount",
        "irName": "actualAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "varianceAmount",
        "irName": "varianceAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Client": {
    "accessor": "client",
    "dbName": "clients",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientType",
        "irName": "clientType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "company_name",
        "irName": "companyName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "first_name",
        "irName": "firstName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_name",
        "irName": "lastName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "website",
        "irName": "website",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countryCode",
        "irName": "countryCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultPaymentTerms",
        "irName": "defaultPaymentTerms",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxExempt",
        "irName": "taxExempt",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxId",
        "irName": "taxId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "source",
        "irName": "source",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ClientContact": {
    "accessor": "clientContact",
    "dbName": "client_contacts",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "first_name",
        "irName": "firstName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_name",
        "irName": "lastName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phoneMobile",
        "irName": "phoneMobile",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPrimary",
        "irName": "isPrimary",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isBillingContact",
        "irName": "isBillingContact",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ClientPreference": {
    "accessor": "clientPreference",
    "dbName": "client_preferences",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferenceType",
        "irName": "preferenceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferenceKey",
        "irName": "preferenceKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferenceValue",
        "irName": "preferenceValue",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "UserPreference": {
    "accessor": "userPreference",
    "dbName": "user_preferences",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferenceKey",
        "irName": "preferenceKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preferenceValue",
        "irName": "preferenceValue",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Lead": {
    "accessor": "lead",
    "dbName": "leads",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "source",
        "irName": "source",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "companyName",
        "irName": "companyName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactName",
        "irName": "contactName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactEmail",
        "irName": "contactEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactPhone",
        "irName": "contactPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventDate",
        "irName": "eventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedGuests",
        "irName": "estimatedGuests",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedValue",
        "irName": "estimatedValue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convertedToClientId",
        "irName": "convertedToClientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convertedAt",
        "irName": "convertedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "score",
        "irName": "score",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scoreBreakdown",
        "irName": "scoreBreakdown",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ClientInteraction": {
    "accessor": "clientInteraction",
    "dbName": "client_interactions",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadId",
        "irName": "leadId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "interactionType",
        "irName": "interactionType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "interactionDate",
        "irName": "interactionDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subject",
        "irName": "subject",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "followUpDate",
        "irName": "followUpDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "followUpCompleted",
        "irName": "followUpCompleted",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correlation_id",
        "irName": "correlationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InteractionAttachment": {
    "accessor": "interactionAttachment",
    "dbName": "interaction_attachments",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "interactionId",
        "irName": "interactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileName",
        "irName": "fileName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileUrl",
        "irName": "fileUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileType",
        "irName": "fileType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileSize",
        "irName": "fileSize",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CrmScoringRule": {
    "accessor": "crmScoringRule",
    "dbName": "crm_scoring_rules",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ruleName",
        "irName": "ruleName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "field",
        "irName": "field",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "condition",
        "irName": "condition",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "value",
        "irName": "value",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "points",
        "irName": "points",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Proposal": {
    "accessor": "proposal",
    "dbName": "proposals",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "proposalNumber",
        "irName": "proposalNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "templateId",
        "irName": "templateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadId",
        "irName": "leadId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventDate",
        "irName": "eventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestCount",
        "irName": "guestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueName",
        "irName": "venueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueAddress",
        "irName": "venueAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotal",
        "irName": "subtotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxRate",
        "irName": "taxRate",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxAmount",
        "irName": "taxAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discountAmount",
        "irName": "discountAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "total",
        "irName": "total",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "publicToken",
        "irName": "publicToken",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "validUntil",
        "irName": "validUntil",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sentAt",
        "irName": "sentAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "viewedAt",
        "irName": "viewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acceptedAt",
        "irName": "acceptedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectedAt",
        "irName": "rejectedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "termsAndConditions",
        "irName": "termsAndConditions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ProposalLineItem": {
    "accessor": "proposalLineItem",
    "dbName": "proposal_line_items",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "proposalId",
        "irName": "proposalId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemType",
        "irName": "itemType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity",
        "irName": "quantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitOfMeasure",
        "irName": "unitOfMeasure",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitPrice",
        "irName": "unitPrice",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "total",
        "irName": "total",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalPrice",
        "irName": "totalPrice",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ProposalTemplate": {
    "accessor": "proposalTemplate",
    "dbName": "proposal_templates",
    "pgSchema": "tenant_crm",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultTerms",
        "irName": "defaultTerms",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultTaxRate",
        "irName": "defaultTaxRate",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultNotes",
        "irName": "defaultNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultLineItems",
        "irName": "defaultLineItems",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isDefault",
        "irName": "isDefault",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "logoUrl",
        "irName": "logoUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "primaryColor",
        "irName": "primaryColor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "secondaryColor",
        "irName": "secondaryColor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accentColor",
        "irName": "accentColor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fontFamily",
        "irName": "fontFamily",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Recipe": {
    "accessor": "recipe",
    "dbName": "recipes",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cuisineType",
        "irName": "cuisineType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RecipeVersion": {
    "accessor": "recipeVersion",
    "dbName": "recipe_versions",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeId",
        "irName": "recipeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cuisineType",
        "irName": "cuisineType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionNumber",
        "irName": "versionNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "yieldQuantity",
        "irName": "yieldQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "yieldUnitId",
        "irName": "yieldUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "yieldDescription",
        "irName": "yieldDescription",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "prepTimeMinutes",
        "irName": "prepTimeMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cookTimeMinutes",
        "irName": "cookTimeMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "restTimeMinutes",
        "irName": "restTimeMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "difficultyLevel",
        "irName": "difficultyLevel",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instructions",
        "irName": "instructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isLocked",
        "irName": "isLocked",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lockedAt",
        "irName": "lockedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lockedBy",
        "irName": "lockedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "costCalculatedAt",
        "irName": "costCalculatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "costPerYield",
        "irName": "costPerYield",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RecipeIngredient": {
    "accessor": "recipeIngredient",
    "dbName": "recipe_ingredients",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeVersionId",
        "irName": "recipeVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ingredientId",
        "irName": "ingredientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity",
        "irName": "quantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preparationNotes",
        "irName": "preparationNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isOptional",
        "irName": "isOptional",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "adjustedQuantity",
        "irName": "adjustedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "costCalculatedAt",
        "irName": "costCalculatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ingredientCost",
        "irName": "ingredientCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "wasteFactor",
        "irName": "wasteFactor",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Ingredient": {
    "accessor": "ingredient",
    "dbName": "ingredients",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultUnitId",
        "irName": "defaultUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "densityGPerMl",
        "irName": "densityGPerMl",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shelfLifeDays",
        "irName": "shelfLifeDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storageInstructions",
        "irName": "storageInstructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allergens",
        "irName": "allergens",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepMethod": {
    "accessor": "prepMethod",
    "dbName": "prep_methods",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedDurationMinutes",
        "irName": "estimatedDurationMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requiresCertification",
        "irName": "requiresCertification",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Container": {
    "accessor": "container",
    "dbName": "containers",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "containerType",
        "irName": "containerType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sizeDescription",
        "irName": "sizeDescription",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacityVolumeMl",
        "irName": "capacityVolumeMl",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacityWeightG",
        "irName": "capacityWeightG",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacityPortions",
        "irName": "capacityPortions",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isReusable",
        "irName": "isReusable",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Dish": {
    "accessor": "dish",
    "dbName": "dishes",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeId",
        "irName": "recipeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serviceStyle",
        "irName": "serviceStyle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "defaultContainerId",
        "irName": "defaultContainerId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "presentationImageUrl",
        "irName": "presentationImageUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minPrepLeadDays",
        "irName": "minPrepLeadDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxPrepLeadDays",
        "irName": "maxPrepLeadDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "portionSizeDescription",
        "irName": "portionSizeDescription",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietaryTags",
        "irName": "dietaryTags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allergens",
        "irName": "allergens",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pricePerPerson",
        "irName": "pricePerPerson",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "costPerPerson",
        "irName": "costPerPerson",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Menu": {
    "accessor": "menu",
    "dbName": "menus",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isTemplate",
        "irName": "isTemplate",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "basePrice",
        "irName": "basePrice",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pricePerPerson",
        "irName": "pricePerPerson",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minGuests",
        "irName": "minGuests",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxGuests",
        "irName": "maxGuests",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "MenuDish": {
    "accessor": "menuDish",
    "dbName": "menu_dishes",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "menuId",
        "irName": "menuId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "course",
        "irName": "course",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isOptional",
        "irName": "isOptional",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PrepComment": {
    "accessor": "prepComment",
    "dbName": "prep_comments",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "commentText",
        "irName": "commentText",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isResolved",
        "irName": "isResolved",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedBy",
        "irName": "resolvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventTimeline": {
    "accessor": "eventTimeline",
    "dbName": "event_timeline",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timelineTime",
        "irName": "timelineTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "responsibleRole",
        "irName": "responsibleRole",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isCompleted",
        "irName": "isCompleted",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventImport": {
    "accessor": "eventImport",
    "dbName": "event_imports",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileName",
        "irName": "fileName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "mimeType",
        "irName": "mimeType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileSize",
        "irName": "fileSize",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "content",
        "irName": "content",
        "type": "Bytes",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blobUrl",
        "irName": "blobUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileType",
        "irName": "fileType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "detectedFormat",
        "irName": "detectedFormat",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parseStatus",
        "irName": "parseStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "extractedData",
        "irName": "extractedData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confidence",
        "irName": "confidence",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parseErrors",
        "irName": "parseErrors",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportId",
        "irName": "reportId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "battleBoardId",
        "irName": "battleBoardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedAt",
        "irName": "parsedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BattleBoard": {
    "accessor": "battleBoard",
    "dbName": "battle_boards",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "board_name",
        "irName": "boardName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "board_type",
        "irName": "boardType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "schema_version",
        "irName": "schemaVersion",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardData",
        "irName": "boardData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "document_url",
        "irName": "documentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "source_document_type",
        "irName": "sourceDocumentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "document_imported_at",
        "irName": "documentImportedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_template",
        "irName": "isTemplate",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventDate",
        "irName": "eventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestCount",
        "irName": "guestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueName",
        "irName": "venueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueAddress",
        "irName": "venueAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "inheritedContext",
        "irName": "inheritedContext",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CommandBoard": {
    "accessor": "commandBoard",
    "dbName": "command_boards",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isTemplate",
        "irName": "isTemplate",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scope",
        "irName": "scope",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoPopulate",
        "irName": "autoPopulate",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CommandBoardCard": {
    "accessor": "commandBoardCard",
    "dbName": "command_board_cards",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardType",
        "irName": "cardType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionX",
        "irName": "positionX",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionY",
        "irName": "positionY",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "width",
        "irName": "width",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "height",
        "irName": "height",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "zIndex",
        "irName": "zIndex",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "color",
        "irName": "color",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "groupId",
        "irName": "groupId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vectorClock",
        "irName": "vectorClock",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CommandBoardLayout": {
    "accessor": "commandBoardLayout",
    "dbName": "command_board_layouts",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "viewport",
        "irName": "viewport",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "visibleCards",
        "irName": "visibleCards",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "gridSize",
        "irName": "gridSize",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "showGrid",
        "irName": "showGrid",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "snapToGrid",
        "irName": "snapToGrid",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CommandBoardGroup": {
    "accessor": "commandBoardGroup",
    "dbName": "command_board_groups",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "color",
        "irName": "color",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "collapsed",
        "irName": "collapsed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionX",
        "irName": "positionX",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionY",
        "irName": "positionY",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "width",
        "irName": "width",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "height",
        "irName": "height",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "zIndex",
        "irName": "zIndex",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CommandBoardConnection": {
    "accessor": "commandBoardConnection",
    "dbName": "command_board_connections",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fromCardId",
        "irName": "fromCardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "toCardId",
        "irName": "toCardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "relationshipType",
        "irName": "relationshipType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "label",
        "irName": "label",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "visible",
        "irName": "visible",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BoardProjection": {
    "accessor": "boardProjection",
    "dbName": "board_projections",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "EntityType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionX",
        "irName": "positionX",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "positionY",
        "irName": "positionY",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "width",
        "irName": "width",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "height",
        "irName": "height",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "zIndex",
        "irName": "zIndex",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "colorOverride",
        "irName": "colorOverride",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "collapsed",
        "irName": "collapsed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "groupId",
        "irName": "groupId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pinned",
        "irName": "pinned",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Note": {
    "accessor": "note",
    "dbName": "notes",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "color",
        "irName": "color",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BoardAnnotation": {
    "accessor": "boardAnnotation",
    "dbName": "board_annotations",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardId",
        "irName": "boardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "annotationType",
        "irName": "annotationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fromProjectionId",
        "irName": "fromProjectionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "toProjectionId",
        "irName": "toProjectionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "label",
        "irName": "label",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "color",
        "irName": "color",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "style",
        "irName": "style",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TimelineTask": {
    "accessor": "timelineTask",
    "dbName": "timeline_tasks",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startTime",
        "irName": "startTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endTime",
        "irName": "endTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assigneeId",
        "irName": "assigneeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "progress",
        "irName": "progress",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dependencies",
        "irName": "dependencies",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isOnCriticalPath",
        "irName": "isOnCriticalPath",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slackMinutes",
        "irName": "slackMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CateringOrder": {
    "accessor": "cateringOrder",
    "dbName": "catering_orders",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "customer_id",
        "irName": "customerId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "orderNumber",
        "irName": "orderNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "order_status",
        "irName": "orderStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "order_date",
        "irName": "orderDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "delivery_date",
        "irName": "deliveryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "delivery_time",
        "irName": "deliveryTime",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotal_amount",
        "irName": "subtotalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tax_amount",
        "irName": "taxAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discount_amount",
        "irName": "discountAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "service_charge_amount",
        "irName": "serviceChargeAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalAmount",
        "irName": "totalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deposit_required",
        "irName": "depositRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deposit_amount",
        "irName": "depositAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deposit_paid",
        "irName": "depositPaid",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deposit_paid_at",
        "irName": "depositPaidAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_name",
        "irName": "venueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_address",
        "irName": "venueAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_city",
        "irName": "venueCity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_state",
        "irName": "venueState",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_zip",
        "irName": "venueZip",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_contact_name",
        "irName": "venueContactName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venue_contact_phone",
        "irName": "venueContactPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guest_count",
        "irName": "guestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "special_instructions",
        "irName": "specialInstructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietary_restrictions",
        "irName": "dietaryRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "staff_required",
        "irName": "staffRequired",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "staff_assigned",
        "irName": "staffAssigned",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventoryItem": {
    "accessor": "inventoryItem",
    "dbName": "inventory_items",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "item_number",
        "irName": "itemNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitOfMeasure",
        "irName": "unitOfMeasure",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitCost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityOnHand",
        "irName": "quantityOnHand",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parLevel",
        "irName": "parLevel",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reorder_level",
        "irName": "reorderLevel",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionAt",
        "irName": "versionAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fsa_status",
        "irName": "fsaStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fsa_temp_logged",
        "irName": "fsaTempLogged",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fsa_allergen_info",
        "irName": "fsaAllergenInfo",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fsa_traceable",
        "irName": "fsaTraceable",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ],
    "versionProperty": "version"
  },
  "InventoryTransaction": {
    "accessor": "inventoryTransaction",
    "dbName": "inventory_transactions",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transactionType",
        "irName": "transactionType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity",
        "irName": "quantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit_cost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "total_cost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reference",
        "irName": "reference",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transaction_date",
        "irName": "transactionDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storage_location_id",
        "irName": "storageLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "referenceType",
        "irName": "referenceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "referenceId",
        "irName": "referenceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventorySupplier": {
    "accessor": "inventorySupplier",
    "dbName": "inventory_suppliers",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplier_number",
        "irName": "supplierNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contact_person",
        "irName": "contactPerson",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payment_terms",
        "irName": "paymentTerms",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "connectorType",
        "irName": "connectorType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "connectorCredentials",
        "irName": "connectorCredentials",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "state",
        "irName": "state",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "country",
        "irName": "country",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxId",
        "irName": "taxId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "website",
        "irName": "website",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performanceRating",
        "irName": "performanceRating",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "SupplierSyncLog": {
    "accessor": "supplierSyncLog",
    "dbName": "supplier_sync_logs",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "connectorId",
        "irName": "connectorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "productsSynced",
        "irName": "productsSynced",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "productsCreated",
        "irName": "productsCreated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "productsUpdated",
        "irName": "productsUpdated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "productsDeactivated",
        "irName": "productsDeactivated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errors",
        "irName": "errors",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "durationMs",
        "irName": "durationMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggeredBy",
        "irName": "triggeredBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventoryAlert": {
    "accessor": "inventoryAlert",
    "dbName": "inventory_alerts",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertType",
        "irName": "alertType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold_value",
        "irName": "thresholdValue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggered_at",
        "irName": "triggeredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolved_at",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventoryStock": {
    "accessor": "inventoryStock",
    "dbName": "inventory_stock",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storageLocationId",
        "irName": "storageLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity_on_hand",
        "irName": "quantityOnHand",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit_id",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_counted_at",
        "irName": "lastCountedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_counted_by",
        "irName": "lastCountedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "InventoryForecast": {
    "accessor": "inventoryForecast",
    "dbName": "inventory_forecasts",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sku",
        "irName": "sku",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "date",
        "irName": "date",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "forecast",
        "irName": "forecast",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lower_bound",
        "irName": "lowerBound",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "upper_bound",
        "irName": "upperBound",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confidence",
        "irName": "confidence",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "horizon_days",
        "irName": "horizonDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_updated",
        "irName": "lastUpdated",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actual_depletion_date",
        "irName": "actualDepletionDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "error_days",
        "irName": "errorDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accuracy_tracked",
        "irName": "accuracyTracked",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ForecastInput": {
    "accessor": "forecastInput",
    "dbName": "forecast_inputs",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sku",
        "irName": "sku",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "date",
        "irName": "date",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "historical_usage",
        "irName": "historicalUsage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "events",
        "irName": "events",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "promotions",
        "irName": "promotions",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonality_factors",
        "irName": "seasonalityFactors",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ReorderSuggestion": {
    "accessor": "reorderSuggestion",
    "dbName": "reorder_suggestions",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sku",
        "irName": "sku",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recommended_order_qty",
        "irName": "recommendedOrderQty",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reorder_point",
        "irName": "reorderPoint",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "safety_stock",
        "irName": "safetyStock",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lead_time_days",
        "irName": "leadTimeDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "justification",
        "irName": "justification",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AlertsConfig": {
    "accessor": "alertsConfig",
    "dbName": "alerts_config",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "channel",
        "irName": "channel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "destination",
        "irName": "destination",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CycleCountSession": {
    "accessor": "cycleCountSession",
    "dbName": "cycle_count_sessions",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sessionId",
        "irName": "sessionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sessionName",
        "irName": "sessionName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countType",
        "irName": "countType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startedAt",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "finalizedAt",
        "irName": "finalizedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalItems",
        "irName": "totalItems",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countedItems",
        "irName": "countedItems",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalVariance",
        "irName": "totalVariance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variancePercentage",
        "irName": "variancePercentage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdById",
        "irName": "createdById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedById",
        "irName": "approvedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CycleCountRecord": {
    "accessor": "cycleCountRecord",
    "dbName": "cycle_count_records",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sessionId",
        "irName": "sessionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemNumber",
        "irName": "itemNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storageLocationId",
        "irName": "storageLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expectedQuantity",
        "irName": "expectedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countedQuantity",
        "irName": "countedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variance",
        "irName": "variance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variancePct",
        "irName": "variancePct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countDate",
        "irName": "countDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countedById",
        "irName": "countedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "barcode",
        "irName": "barcode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isVerified",
        "irName": "isVerified",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verifiedById",
        "irName": "verifiedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verifiedAt",
        "irName": "verifiedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncStatus",
        "irName": "syncStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "offlineId",
        "irName": "offlineId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VarianceReport": {
    "accessor": "varianceReport",
    "dbName": "variance_reports",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sessionId",
        "irName": "sessionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportType",
        "irName": "reportType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemNumber",
        "irName": "itemNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expectedQuantity",
        "irName": "expectedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countedQuantity",
        "irName": "countedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variance",
        "irName": "variance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "variancePct",
        "irName": "variancePct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accuracyScore",
        "irName": "accuracyScore",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "adjustmentType",
        "irName": "adjustmentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "adjustmentAmount",
        "irName": "adjustmentAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "adjustmentDate",
        "irName": "adjustmentDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rootCause",
        "irName": "rootCause",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolutionNotes",
        "irName": "resolutionNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedById",
        "irName": "resolvedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generatedAt",
        "irName": "generatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CycleCountAuditLog": {
    "accessor": "cycleCountAuditLog",
    "dbName": "cycle_count_audit_log",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sessionId",
        "irName": "sessionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recordId",
        "irName": "recordId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "oldValue",
        "irName": "oldValue",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "newValue",
        "irName": "newValue",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedById",
        "irName": "performedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ipAddress",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userAgent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PurchaseOrder": {
    "accessor": "purchaseOrder",
    "dbName": "purchase_orders",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "poNumber",
        "irName": "poNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vendorId",
        "irName": "vendorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "orderDate",
        "irName": "orderDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expectedDeliveryDate",
        "irName": "expectedDeliveryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualDeliveryDate",
        "irName": "actualDeliveryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotal",
        "irName": "subtotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxAmount",
        "irName": "taxAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippingAmount",
        "irName": "shippingAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "total",
        "irName": "total",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedBy",
        "irName": "submittedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedAt",
        "irName": "submittedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedBy",
        "irName": "receivedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedAt",
        "irName": "receivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PurchaseOrderItem": {
    "accessor": "purchaseOrderItem",
    "dbName": "purchase_order_items",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "purchaseOrderId",
        "irName": "purchaseOrderId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityOrdered",
        "irName": "quantityOrdered",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityReceived",
        "irName": "quantityReceived",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitCost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "qualityStatus",
        "irName": "qualityStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discrepancyType",
        "irName": "discrepancyType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discrepancyAmount",
        "irName": "discrepancyAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PurchaseRequisition": {
    "accessor": "purchaseRequisition",
    "dbName": "purchase_requisitions",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requisitionNumber",
        "irName": "requisitionNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedBy",
        "irName": "requestedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestDate",
        "irName": "requestDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requiredBy",
        "irName": "requiredBy",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "department",
        "irName": "department",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "justification",
        "irName": "justification",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotal",
        "irName": "subtotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedTax",
        "irName": "estimatedTax",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedShipping",
        "irName": "estimatedShipping",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedTotal",
        "irName": "estimatedTotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "managerApprovalBy",
        "irName": "managerApprovalBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "managerApprovalAt",
        "irName": "managerApprovalAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "financeApprovalBy",
        "irName": "financeApprovalBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "financeApprovalAt",
        "irName": "financeApprovalAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convertedToPoId",
        "irName": "convertedToPoId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convertedAt",
        "irName": "convertedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectionReason",
        "irName": "rejectionReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedAt",
        "irName": "submittedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemCategory",
        "irName": "itemCategory",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PurchaseRequisitionItem": {
    "accessor": "purchaseRequisitionItem",
    "dbName": "purchase_requisition_items",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requisitionId",
        "irName": "requisitionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityRequested",
        "irName": "quantityRequested",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedUnitCost",
        "irName": "estimatedUnitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedTotalCost",
        "irName": "estimatedTotalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suggestedVendorId",
        "irName": "suggestedVendorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suggestedVendorName",
        "irName": "suggestedVendorName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "specifications",
        "irName": "specifications",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VendorContract": {
    "accessor": "vendorContract",
    "dbName": "vendor_contracts",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractNumber",
        "irName": "contractNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vendorId",
        "irName": "vendorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vendorName",
        "irName": "vendorName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractType",
        "irName": "contractType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startDate",
        "irName": "startDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endDate",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoRenew",
        "irName": "autoRenew",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "renewalTermDays",
        "irName": "renewalTermDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "noticeDaysBeforeRenewal",
        "irName": "noticeDaysBeforeRenewal",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paymentTerms",
        "irName": "paymentTerms",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deliveryTerms",
        "irName": "deliveryTerms",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minimumOrderQuantity",
        "irName": "minimumOrderQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "annualSpendCommitment",
        "irName": "annualSpendCommitment",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "spendToPeriod",
        "irName": "spendToPeriod",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currencyCode",
        "irName": "currencyCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "terminatedBy",
        "irName": "terminatedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "terminatedAt",
        "irName": "terminatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "terminationReason",
        "irName": "terminationReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractUrl",
        "irName": "contractUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "complianceScore",
        "irName": "complianceScore",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastComplianceReview",
        "irName": "lastComplianceReview",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slaBreachCount",
        "irName": "slaBreachCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "onTimeDeliveryRate",
        "irName": "onTimeDeliveryRate",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "qualityRating",
        "irName": "qualityRating",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VendorContact": {
    "accessor": "vendorContact",
    "dbName": "vendor_contacts",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactName",
        "irName": "contactName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactEmail",
        "irName": "contactEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactPhone",
        "irName": "contactPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactRole",
        "irName": "contactRole",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPrimary",
        "irName": "isPrimary",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VendorRating": {
    "accessor": "vendorRating",
    "dbName": "vendor_ratings",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rating",
        "irName": "rating",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "comment",
        "irName": "comment",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ratedBy",
        "irName": "ratedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ProcurementBudget": {
    "accessor": "procurementBudget",
    "dbName": "procurement_budgets",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fiscalYear",
        "irName": "fiscalYear",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodType",
        "irName": "periodType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodStart",
        "irName": "periodStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodEnd",
        "irName": "periodEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetAmount",
        "irName": "budgetAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "spentAmount",
        "irName": "spentAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "committedAmount",
        "irName": "committedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdWarningPct",
        "irName": "thresholdWarningPct",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdCriticalPct",
        "irName": "thresholdCriticalPct",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ProcurementBudgetAlert": {
    "accessor": "procurementBudgetAlert",
    "dbName": "procurement_budget_alerts",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetId",
        "irName": "budgetId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertType",
        "irName": "alertType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "utilizationPct",
        "irName": "utilizationPct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "message",
        "irName": "message",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isAcknowledged",
        "irName": "isAcknowledged",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedAt",
        "irName": "acknowledgedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolved",
        "irName": "resolved",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Shipment": {
    "accessor": "shipment",
    "dbName": "shipments",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shipmentNumber",
        "irName": "shipmentNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "ShipmentStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippedDate",
        "irName": "shippedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedDeliveryDate",
        "irName": "estimatedDeliveryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualDeliveryDate",
        "irName": "actualDeliveryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalItems",
        "irName": "totalItems",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippingCost",
        "irName": "shippingCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalValue",
        "irName": "totalValue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "trackingNumber",
        "irName": "trackingNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "carrier",
        "irName": "carrier",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippingMethod",
        "irName": "shippingMethod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deliveredBy",
        "irName": "deliveredBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedBy",
        "irName": "receivedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signature",
        "irName": "signature",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "internalNotes",
        "irName": "internalNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reference",
        "irName": "reference",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ShipmentItem": {
    "accessor": "shipmentItem",
    "dbName": "shipment_items",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shipmentId",
        "irName": "shipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityShipped",
        "irName": "quantityShipped",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityReceived",
        "irName": "quantityReceived",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityDamaged",
        "irName": "quantityDamaged",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitCost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "condition",
        "irName": "condition",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conditionNotes",
        "irName": "conditionNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lotNumber",
        "irName": "lotNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expirationDate",
        "irName": "expirationDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Report": {
    "accessor": "report",
    "dbName": "reports",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportType",
        "irName": "reportType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "query_config",
        "irName": "queryConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "display_config",
        "irName": "displayConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_system",
        "irName": "isSystem",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_by",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AdminTask": {
    "accessor": "adminTask",
    "dbName": "admin_tasks",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sourceType",
        "irName": "sourceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sourceId",
        "irName": "sourceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AdminChatThread": {
    "accessor": "adminChatThread",
    "dbName": "admin_chat_threads",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threadType",
        "irName": "threadType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slug",
        "irName": "slug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "directKey",
        "irName": "directKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastMessageAt",
        "irName": "lastMessageAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AdminChatParticipant": {
    "accessor": "adminChatParticipant",
    "dbName": "admin_chat_participants",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threadId",
        "irName": "threadId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "archivedAt",
        "irName": "archivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clearedAt",
        "irName": "clearedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastReadAt",
        "irName": "lastReadAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AdminChatMessage": {
    "accessor": "adminChatMessage",
    "dbName": "admin_chat_messages",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threadId",
        "irName": "threadId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authorId",
        "irName": "authorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authorName",
        "irName": "authorName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "text",
        "irName": "text",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Workflow": {
    "accessor": "workflow",
    "dbName": "workflows",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "trigger_type",
        "irName": "triggerType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerConfig",
        "irName": "triggerConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Notification": {
    "accessor": "notification",
    "dbName": "notifications",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipient_employee_id",
        "irName": "recipientEmployeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notification_type",
        "irName": "notificationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "body",
        "irName": "body",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action_url",
        "irName": "actionUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isRead",
        "irName": "isRead",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "readAt",
        "irName": "readAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correlation_id",
        "irName": "correlationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Schedule": {
    "accessor": "schedule",
    "dbName": "schedules",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "schedule_date",
        "irName": "scheduleDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "published_at",
        "irName": "publishedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "published_by",
        "irName": "publishedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ScheduleShift": {
    "accessor": "scheduleShift",
    "dbName": "schedule_shifts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduleId",
        "irName": "scheduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shift_start",
        "irName": "shiftStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shift_end",
        "irName": "shiftEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role_during_shift",
        "irName": "roleDuringShift",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionAt",
        "irName": "versionAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "inherited_context",
        "irName": "inheritedContext",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ],
    "versionProperty": "version"
  },
  "TimeEntry": {
    "accessor": "timeEntry",
    "dbName": "time_entries",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shiftId",
        "irName": "shiftId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clockIn",
        "irName": "clockIn",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clockOut",
        "irName": "clockOut",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "breakMinutes",
        "irName": "breakMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TimecardEditRequest": {
    "accessor": "timecardEditRequest",
    "dbName": "timecard_edit_requests",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timeEntryId",
        "irName": "timeEntryId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedClockIn",
        "irName": "requestedClockIn",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedClockOut",
        "irName": "requestedClockOut",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedBreakMinutes",
        "irName": "requestedBreakMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeLocation": {
    "accessor": "employeeLocation",
    "dbName": "employee_locations",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "employeeId",
      "locationId"
    ],
    "whereAccessor": "tenantId_employeeId_locationId",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPrimary",
        "irName": "isPrimary",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "LaborBudget": {
    "accessor": "laborBudget",
    "dbName": "labor_budgets",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetType",
        "irName": "budgetType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodStart",
        "irName": "periodStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodEnd",
        "irName": "periodEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetTarget",
        "irName": "budgetTarget",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetUnit",
        "irName": "budgetUnit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualSpend",
        "irName": "actualSpend",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold80Pct",
        "irName": "threshold80Pct",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold90Pct",
        "irName": "threshold90Pct",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold100Pct",
        "irName": "threshold100Pct",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overrideReason",
        "irName": "overrideReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BudgetAlert": {
    "accessor": "budgetAlert",
    "dbName": "budget_alerts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetId",
        "irName": "budgetId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertType",
        "irName": "alertType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "utilization",
        "irName": "utilization",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "message",
        "irName": "message",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isAcknowledged",
        "irName": "isAcknowledged",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedAt",
        "irName": "acknowledgedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolved",
        "irName": "resolved",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "audit_config": {
    "accessor": "audit_config",
    "dbName": null,
    "pgSchema": "core",
    "pkFields": [
      "table_schema",
      "table_name"
    ],
    "whereAccessor": "table_schema_table_name",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "table_schema",
        "irName": "tableSchema",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "table_name",
        "irName": "tableName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "audit_level",
        "irName": "auditLevel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "excluded_columns",
        "irName": "excludedColumns",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "status_transitions": {
    "accessor": "status_transitions",
    "dbName": null,
    "pgSchema": "core",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "from_status_code",
        "irName": "fromStatusCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "to_status_code",
        "irName": "toStatusCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requires_role",
        "irName": "requiresRole",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_automatic",
        "irName": "isAutomatic",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "status_types": {
    "accessor": "status_types",
    "dbName": null,
    "pgSchema": "core",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "label",
        "irName": "label",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "color_hex",
        "irName": "colorHex",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sort_order",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_terminal",
        "irName": "isTerminal",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_default",
        "irName": "isDefault",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AllergenWarning": {
    "accessor": "allergenWarning",
    "dbName": "allergen_warnings",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "warningType",
        "irName": "warningType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allergens",
        "irName": "allergens",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "affectedGuests",
        "irName": "affectedGuests",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "severity",
        "irName": "severity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isAcknowledged",
        "irName": "isAcknowledged",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedAt",
        "irName": "acknowledgedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overrideReason",
        "irName": "overrideReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolved",
        "irName": "resolved",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "unit_conversions": {
    "accessor": "unit_conversions",
    "dbName": null,
    "pgSchema": "core",
    "pkFields": [
      "from_unit_id",
      "to_unit_id"
    ],
    "whereAccessor": "from_unit_id_to_unit_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "from_unit_id",
        "irName": "fromUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "to_unit_id",
        "irName": "toUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "multiplier",
        "irName": "multiplier",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "units": {
    "accessor": "units",
    "dbName": null,
    "pgSchema": "core",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name_plural",
        "irName": "namePlural",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit_system",
        "irName": "unitSystem",
        "type": "UnitSystem",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit_type",
        "irName": "unitType",
        "type": "UnitType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_base_unit",
        "irName": "isBaseUnit",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "audit_archive": {
    "accessor": "audit_archive",
    "dbName": null,
    "pgSchema": "platform",
    "pkFields": [
      "id",
      "created_at"
    ],
    "whereAccessor": "id_created_at",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "table_schema",
        "irName": "tableSchema",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "table_name",
        "irName": "tableName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "record_id",
        "irName": "recordId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "ActionType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "old_values",
        "irName": "oldValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "new_values",
        "irName": "newValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performed_by",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ip_address",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "user_agent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "archived_at",
        "irName": "archivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "audit_log": {
    "accessor": "audit_log",
    "dbName": null,
    "pgSchema": "platform",
    "pkFields": [
      "id",
      "created_at"
    ],
    "whereAccessor": "id_created_at",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "table_schema",
        "irName": "tableSchema",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "table_name",
        "irName": "tableName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "record_id",
        "irName": "recordId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "ActionType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "old_values",
        "irName": "oldValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "new_values",
        "irName": "newValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performed_by",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ip_address",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "user_agent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "sent_emails": {
    "accessor": "sent_emails",
    "dbName": null,
    "pgSchema": "platform",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipient_email",
        "irName": "recipientEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subject",
        "irName": "subject",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correlation_id",
        "irName": "correlationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sent_at",
        "irName": "sentAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Tenant": {
    "accessor": "tenant",
    "dbName": "Tenant",
    "pgSchema": "platform",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slug",
        "irName": "slug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "documents": {
    "accessor": "documents",
    "dbName": null,
    "pgSchema": "tenant",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "file_name",
        "irName": "fileName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "file_type",
        "irName": "fileType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "file_size",
        "irName": "fileSize",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storage_path",
        "irName": "storagePath",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsed_data",
        "irName": "parsedData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parse_status",
        "irName": "parseStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parse_error",
        "irName": "parseError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsed_at",
        "irName": "parsedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "event_id",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "battle_board_id",
        "irName": "battleBoardId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "settings": {
    "accessor": "settings",
    "dbName": null,
    "pgSchema": "tenant",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "setting_key",
        "irName": "settingKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "setting_value",
        "irName": "settingValue",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "admin_audit_trail": {
    "accessor": "admin_audit_trail",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "admin_user_id",
        "irName": "adminUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entity_type",
        "irName": "entityType",
        "type": "admin_entity_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entity_id",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "admin_action",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "changes",
        "irName": "changes",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "old_values",
        "irName": "oldValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "new_values",
        "irName": "newValues",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ip_address",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "user_agent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ActivityFeed": {
    "accessor": "activityFeed",
    "dbName": "ActivityFeed",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "activityType",
        "irName": "activityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedBy",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performerName",
        "irName": "performerName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correlationId",
        "irName": "correlationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parentId",
        "irName": "parentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sourceType",
        "irName": "sourceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sourceId",
        "irName": "sourceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "importance",
        "irName": "importance",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "visibility",
        "irName": "visibility",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "admin_permissions": {
    "accessor": "admin_permissions",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "permission_name",
        "irName": "permissionName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resource",
        "irName": "resource",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "admin_roles": {
    "accessor": "admin_roles",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role_name",
        "irName": "roleName",
        "type": "admin_role",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "permissions",
        "irName": "permissions",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "admin_users": {
    "accessor": "admin_users",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "auth_user_id",
        "irName": "authUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role_id",
        "irName": "roleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_login",
        "irName": "lastLogin",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_failed_login",
        "irName": "lastFailedLogin",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failed_login_attempts",
        "irName": "failedLoginAttempts",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locked_until",
        "irName": "lockedUntil",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "two_factor_enabled",
        "irName": "twoFactorEnabled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "two_factor_secret",
        "irName": "twoFactorSecret",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "login_ip",
        "irName": "loginIp",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "notification_preferences": {
    "accessor": "notification_preferences",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notification_type",
        "irName": "notificationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "channel",
        "irName": "channel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_enabled",
        "irName": "isEnabled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "sms_logs": {
    "accessor": "sms_logs",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone_number",
        "irName": "phoneNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "message",
        "irName": "message",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notification_type",
        "irName": "notificationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "sms_status",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "twilio_sid",
        "irName": "twilioSid",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "error_message",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sent_at",
        "irName": "sentAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "delivered_at",
        "irName": "deliveredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failed_at",
        "irName": "failedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "sms_automation_rules": {
    "accessor": "sms_automation_rules",
    "dbName": "sms_automation_rules",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "trigger_type",
        "irName": "triggerType",
        "type": "sms_automation_trigger_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "trigger_config",
        "irName": "triggerConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "template_id",
        "irName": "templateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "custom_message",
        "irName": "customMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipient_type",
        "irName": "recipientType",
        "type": "sms_recipient_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipient_config",
        "irName": "recipientConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmailTemplate": {
    "accessor": "emailTemplate",
    "dbName": "email_templates",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "templateType",
        "irName": "templateType",
        "type": "email_template_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subject",
        "irName": "subject",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "body",
        "irName": "body",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "mergeFields",
        "irName": "mergeFields",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isDefault",
        "irName": "isDefault",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "report_history": {
    "accessor": "report_history",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "report_id",
        "irName": "reportId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "schedule_id",
        "irName": "scheduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generated_by",
        "irName": "generatedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "generated_at",
        "irName": "generatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "output_format",
        "irName": "outputFormat",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "file_url",
        "irName": "fileUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "file_size_bytes",
        "irName": "fileSizeBytes",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parameters",
        "irName": "parameters",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "report_schedules": {
    "accessor": "report_schedules",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "report_id",
        "irName": "reportId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "schedule_cron",
        "irName": "scheduleCron",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "output_format",
        "irName": "outputFormat",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipients",
        "irName": "recipients",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "last_run_at",
        "irName": "lastRunAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "next_run_at",
        "irName": "nextRunAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "workflow_executions": {
    "accessor": "workflow_executions",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "workflow_id",
        "irName": "workflowId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggered_by",
        "irName": "triggeredBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "trigger_data",
        "irName": "triggerData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "current_step_id",
        "irName": "currentStepId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "started_at",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completed_at",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "error_message",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "execution_log",
        "irName": "executionLog",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "workflow_steps": {
    "accessor": "workflow_steps",
    "dbName": null,
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "workflow_id",
        "irName": "workflowId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "step_number",
        "irName": "stepNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "step_type",
        "irName": "stepType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "step_config",
        "irName": "stepConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "on_success_step_id",
        "irName": "onSuccessStepId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "on_failure_step_id",
        "irName": "onFailureStepId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventDish": {
    "accessor": "eventDish",
    "dbName": "event_dishes",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "course",
        "irName": "course",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantityServings",
        "irName": "quantityServings",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serviceStyle",
        "irName": "serviceStyle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "specialInstructions",
        "irName": "specialInstructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "storage_locations": {
    "accessor": "storage_locations",
    "dbName": null,
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "location_id",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "storage_type",
        "irName": "storageType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature_min",
        "irName": "temperatureMin",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature_max",
        "irName": "temperatureMax",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature_unit",
        "irName": "temperatureUnit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "bulk_combine_rules": {
    "accessor": "bulk_combine_rules",
    "dbName": null,
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "match_criteria",
        "irName": "matchCriteria",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_automatic",
        "irName": "isAutomatic",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "method_videos": {
    "accessor": "method_videos",
    "dbName": null,
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "method_id",
        "irName": "methodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "video_url",
        "irName": "videoUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thumbnail_url",
        "irName": "thumbnailUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "duration_seconds",
        "irName": "durationSeconds",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sort_order",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "prep_list_imports": {
    "accessor": "prep_list_imports",
    "dbName": null,
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "source_system",
        "irName": "sourceSystem",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "external_id",
        "irName": "externalId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "import_metadata",
        "irName": "importMetadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "imported_by",
        "irName": "importedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RecipeStep": {
    "accessor": "recipeStep",
    "dbName": "recipe_steps",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipeVersionId",
        "irName": "recipeVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stepNumber",
        "irName": "stepNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instruction",
        "irName": "instruction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "durationMinutes",
        "irName": "durationMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperatureValue",
        "irName": "temperatureValue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperatureUnit",
        "irName": "temperatureUnit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentNeeded",
        "irName": "equipmentNeeded",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tips",
        "irName": "tips",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "videoUrl",
        "irName": "videoUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "imageUrl",
        "irName": "imageUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "task_bundle_items": {
    "accessor": "task_bundle_items",
    "dbName": null,
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenant_id",
      "bundle_id",
      "task_id"
    ],
    "whereAccessor": "tenant_id_bundle_id_task_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bundle_id",
        "irName": "bundleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "task_id",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sort_order",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "task_bundles": {
    "accessor": "task_bundles",
    "dbName": null,
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "event_id",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_template",
        "irName": "isTemplate",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeAvailability": {
    "accessor": "employeeAvailability",
    "dbName": "employee_availability",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dayOfWeek",
        "irName": "dayOfWeek",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startTime",
        "irName": "startTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endTime",
        "irName": "endTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isAvailable",
        "irName": "isAvailable",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveFrom",
        "irName": "effectiveFrom",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveUntil",
        "irName": "effectiveUntil",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeCertification": {
    "accessor": "employeeCertification",
    "dbName": "employee_certifications",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "certificationType",
        "irName": "certificationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "certificationName",
        "irName": "certificationName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issuedDate",
        "irName": "issuedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiryDate",
        "irName": "expiryDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentUrl",
        "irName": "documentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "employee_skills": {
    "accessor": "employee_skills",
    "dbName": null,
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "employee_id",
      "skill_id"
    ],
    "whereAccessor": "tenant_id_employee_id_skill_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "skill_id",
        "irName": "skillId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "proficiency_level",
        "irName": "proficiencyLevel",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verified_by",
        "irName": "verifiedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verified_at",
        "irName": "verifiedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "employee_seniority": {
    "accessor": "employee_seniority",
    "dbName": null,
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "level",
        "irName": "level",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rank",
        "irName": "rank",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effective_at",
        "irName": "effectiveAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "open_shifts": {
    "accessor": "open_shifts",
    "dbName": null,
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "schedule_id",
        "irName": "scheduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "location_id",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shift_start",
        "irName": "shiftStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shift_end",
        "irName": "shiftEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role_during_shift",
        "irName": "roleDuringShift",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "claimed_by",
        "irName": "claimedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "claimed_at",
        "irName": "claimedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assigned_shift_id",
        "irName": "assignedShiftId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PayrollLineItem": {
    "accessor": "payrollLineItem",
    "dbName": "payroll_line_items",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payrollRunId",
        "irName": "payrollRunId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hoursRegular",
        "irName": "hoursRegular",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hoursOvertime",
        "irName": "hoursOvertime",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rateRegular",
        "irName": "rateRegular",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rateOvertime",
        "irName": "rateOvertime",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "grossPay",
        "irName": "grossPay",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deductions",
        "irName": "deductions",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "netPay",
        "irName": "netPay",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PayrollPeriod": {
    "accessor": "payrollPeriod",
    "dbName": "payroll_periods",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodStart",
        "irName": "periodStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodEnd",
        "irName": "periodEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PayrollRun": {
    "accessor": "payrollRun",
    "dbName": "payroll_runs",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payrollPeriodId",
        "irName": "payrollPeriodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "runDate",
        "irName": "runDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalGross",
        "irName": "totalGross",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalDeductions",
        "irName": "totalDeductions",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalNet",
        "irName": "totalNet",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paidAt",
        "irName": "paidAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectReason",
        "irName": "rejectReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TimecardApproval": {
    "accessor": "timecardApproval",
    "dbName": "timecard_approvals",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payrollRunId",
        "irName": "payrollRunId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedAt",
        "irName": "submittedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedBy",
        "irName": "submittedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectReason",
        "irName": "rejectReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ApprovalHistory": {
    "accessor": "approvalHistory",
    "dbName": "approval_history",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedBy",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedAt",
        "irName": "performedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "previousStatus",
        "irName": "previousStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "newStatus",
        "irName": "newStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "skills": {
    "accessor": "skills",
    "dbName": null,
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Role": {
    "accessor": "role",
    "dbName": "roles",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "baseRate",
        "irName": "baseRate",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overtimeMultiplier",
        "irName": "overtimeMultiplier",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overtimeThresholdHours",
        "irName": "overtimeThresholdHours",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeDeduction": {
    "accessor": "employeeDeduction",
    "dbName": "EmployeeDeduction",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "amount",
        "irName": "amount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "percentage",
        "irName": "percentage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPreTax",
        "irName": "isPreTax",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveDate",
        "irName": "effectiveDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endDate",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxAnnualAmount",
        "irName": "maxAnnualAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeeTaxInfo": {
    "accessor": "employeeTaxInfo",
    "dbName": "employee_tax_info",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "jurisdiction",
        "irName": "jurisdiction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "filingStatus",
        "irName": "filingStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "federalWithholdingAllowances",
        "irName": "federalWithholdingAllowances",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stateWithholdingAllowances",
        "irName": "stateWithholdingAllowances",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "additionalWithholding",
        "irName": "additionalWithholding",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeePayrollPrefs": {
    "accessor": "employeePayrollPrefs",
    "dbName": "employee_payroll_prefs",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payPeriodFrequency",
        "irName": "payPeriodFrequency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "roundingRule",
        "irName": "roundingRule",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TipPool": {
    "accessor": "tipPool",
    "dbName": "tip_pools",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodId",
        "irName": "periodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalTips",
        "irName": "totalTips",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allocationRule",
        "irName": "allocationRule",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fixedShares",
        "irName": "fixedShares",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Department": {
    "accessor": "department",
    "dbName": "departments",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TrainingModule": {
    "accessor": "trainingModule",
    "dbName": "training_modules",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contentUrl",
        "irName": "contentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contentType",
        "irName": "contentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "durationMinutes",
        "irName": "durationMinutes",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isRequired",
        "irName": "isRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TrainingAssignment": {
    "accessor": "trainingAssignment",
    "dbName": "training_assignments",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "moduleId",
        "irName": "moduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedToAll",
        "irName": "assignedToAll",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedBy",
        "irName": "assignedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedAt",
        "irName": "assignedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TrainingCompletion": {
    "accessor": "trainingCompletion",
    "dbName": "training_completions",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignmentId",
        "irName": "assignmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "moduleId",
        "irName": "moduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startedAt",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "score",
        "irName": "score",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "passed",
        "irName": "passed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TimeOffRequest": {
    "accessor": "timeOffRequest",
    "dbName": "employee_time_off_requests",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestType",
        "irName": "requestType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startDate",
        "irName": "startDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endDate",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hours",
        "irName": "hours",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "submittedAt",
        "irName": "submittedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rejectionReason",
        "irName": "rejectionReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PerformanceReview": {
    "accessor": "performanceReview",
    "dbName": "performance_reviews",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewer_id",
        "irName": "reviewerId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "review_type",
        "irName": "reviewType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduled_date",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completed_date",
        "irName": "completedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rating",
        "irName": "rating",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "strengths",
        "irName": "strengths",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areas_for_improvement",
        "irName": "areasForImprovement",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goals_next_period",
        "irName": "goalsNextPeriod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "manager_comments",
        "irName": "managerComments",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_comments",
        "irName": "employeeComments",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_acknowledged_at",
        "irName": "employeeAcknowledgedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "DisciplinaryAction": {
    "accessor": "disciplinaryAction",
    "dbName": "disciplinary_actions",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action_type",
        "irName": "actionType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issued_date",
        "irName": "issuedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issued_by",
        "irName": "issuedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "improvement_plan",
        "irName": "improvementPlan",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "end_date",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "outcome",
        "irName": "outcome",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "closed_at",
        "irName": "closedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "closed_by",
        "irName": "closedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ActionMilestone": {
    "accessor": "actionMilestone",
    "dbName": "action_milestones",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "disciplinary_action_id",
        "irName": "disciplinaryActionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "due_date",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completed_date",
        "irName": "completedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "OnboardingTask": {
    "accessor": "onboardingTask",
    "dbName": "onboarding_tasks",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "task_type",
        "irName": "taskType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_required",
        "irName": "isRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sort_order",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "OnboardingCompletion": {
    "accessor": "onboardingCompletion",
    "dbName": "onboarding_completions",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "task_id",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completed_at",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signature_data",
        "irName": "signatureData",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "document_url",
        "irName": "documentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeePin": {
    "accessor": "employeePin",
    "dbName": "employee_pins",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pin_encrypted",
        "irName": "pinEncrypted",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pin_hint",
        "irName": "pinHint",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmployeePinAccessLog": {
    "accessor": "employeePinAccessLog",
    "dbName": "employee_pin_access_logs",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employee_id",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accessed_by_id",
        "irName": "accessedById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "access_type",
        "irName": "accessType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ip_address",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "user_agent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "success",
        "irName": "success",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "WasteReason": {
    "accessor": "wasteReason",
    "dbName": "waste_reasons",
    "pgSchema": "core",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "colorHex",
        "irName": "colorHex",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "WasteEntry": {
    "accessor": "wasteEntry",
    "dbName": "waste_entries",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "inventoryItemId",
        "irName": "inventoryItemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reasonId",
        "irName": "reasonId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity",
        "irName": "quantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "loggedBy",
        "irName": "loggedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "loggedAt",
        "irName": "loggedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitCost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "OverrideAudit": {
    "accessor": "overrideAudit",
    "dbName": "override_audit",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "constraintId",
        "irName": "constraintId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guardExpression",
        "irName": "guardExpression",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overriddenBy",
        "irName": "overriddenBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overrideReason",
        "irName": "overrideReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authorizedBy",
        "irName": "authorizedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authorizedAt",
        "irName": "authorizedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "OutboxEvent": {
    "accessor": "outboxEvent",
    "dbName": "OutboxEvent",
    "pgSchema": "tenant",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payload",
        "irName": "payload",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "OutboxStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "error",
        "irName": "error",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "publishedAt",
        "irName": "publishedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "aggregateId",
        "irName": "aggregateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "aggregateType",
        "irName": "aggregateType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventGuest": {
    "accessor": "eventGuest",
    "dbName": "event_guests",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestName",
        "irName": "guestName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestEmail",
        "irName": "guestEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestPhone",
        "irName": "guestPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isPrimaryContact",
        "irName": "isPrimaryContact",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietaryRestrictions",
        "irName": "dietaryRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allergenRestrictions",
        "irName": "allergenRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "specialMealRequired",
        "irName": "specialMealRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "specialMealNotes",
        "irName": "specialMealNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tableAssignment",
        "irName": "tableAssignment",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "mealPreference",
        "irName": "mealPreference",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rsvpStatus",
        "irName": "rsvpStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "waitlistPosition",
        "irName": "waitlistPosition",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rsvpRespondedAt",
        "irName": "rsvpRespondedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionAt",
        "irName": "versionAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ],
    "versionProperty": "version"
  },
  "EventContract": {
    "accessor": "eventContract",
    "dbName": "event_contracts",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractNumber",
        "irName": "contractNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentUrl",
        "irName": "documentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentType",
        "irName": "documentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signingToken",
        "irName": "signingToken",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiresAt",
        "irName": "expiresAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ContractSignature": {
    "accessor": "contractSignature",
    "dbName": "contract_signatures",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractId",
        "irName": "contractId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signedAt",
        "irName": "signedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signatureData",
        "irName": "signatureData",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signerName",
        "irName": "signerName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signerEmail",
        "irName": "signerEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ipAddress",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "DocumentVersion": {
    "accessor": "documentVersion",
    "dbName": "document_versions",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentType",
        "irName": "documentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentId",
        "irName": "documentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionNumber",
        "irName": "versionNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "changeSummary",
        "irName": "changeSummary",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdById",
        "irName": "createdById",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "EventFollowup": {
    "accessor": "eventFollowup",
    "dbName": "event_followups",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "event_id",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "task_type",
        "irName": "taskType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "due_date",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assigned_to",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completed_at",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ChartOfAccount": {
    "accessor": "chartOfAccount",
    "dbName": "chart_of_accounts",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountNumber",
        "irName": "accountNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountName",
        "irName": "accountName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accountType",
        "irName": "accountType",
        "type": "AccountType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parentId",
        "irName": "parentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "Invoice": {
    "accessor": "invoice",
    "dbName": "invoices",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceNumber",
        "irName": "invoiceNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceType",
        "irName": "invoiceType",
        "type": "InvoiceType",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "InvoiceStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotal",
        "irName": "subtotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxAmount",
        "irName": "taxAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discountAmount",
        "irName": "discountAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "total",
        "irName": "total",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "amountPaid",
        "irName": "amountPaid",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "amountDue",
        "irName": "amountDue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paymentTerms",
        "irName": "paymentTerms",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issuedAt",
        "irName": "issuedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositPercentage",
        "irName": "depositPercentage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositRequired",
        "irName": "depositRequired",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositPaid",
        "irName": "depositPaid",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "internalNotes",
        "irName": "internalNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lineItems",
        "irName": "lineItems",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sentAt",
        "irName": "sentAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "viewedAt",
        "irName": "viewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paidAt",
        "irName": "paidAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "voidedAt",
        "irName": "voidedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PaymentMethod": {
    "accessor": "paymentMethod",
    "dbName": "payment_methods",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardLastFour",
        "irName": "cardLastFour",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardNetwork",
        "irName": "cardNetwork",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isDefault",
        "irName": "isDefault",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Payment": {
    "accessor": "payment",
    "dbName": "payments",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "amount",
        "irName": "amount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currency",
        "irName": "currency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "methodType",
        "irName": "methodType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceId",
        "irName": "invoiceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "gatewayTransactionId",
        "irName": "gatewayTransactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "gatewayPaymentMethodId",
        "irName": "gatewayPaymentMethodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "processor",
        "irName": "processor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "processedAt",
        "irName": "processedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refundedAt",
        "irName": "refundedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PaymentRefundAttempt": {
    "accessor": "paymentRefundAttempt",
    "dbName": "payment_refund_attempts",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paymentId",
        "irName": "paymentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedAmount",
        "irName": "requestedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveAmount",
        "irName": "effectiveAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refundReason",
        "irName": "refundReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "originalGatewayTransactionId",
        "irName": "originalGatewayTransactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refundTransactionId",
        "irName": "refundTransactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "success",
        "irName": "success",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failureReason",
        "irName": "failureReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CollectionCase": {
    "accessor": "collectionCase",
    "dbName": "collection_cases",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceId",
        "irName": "invoiceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceNumber",
        "irName": "invoiceNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientName",
        "irName": "clientName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "originalAmount",
        "irName": "originalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "outstandingAmount",
        "irName": "outstandingAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "collectedAmount",
        "irName": "collectedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "CollectionStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "CollectionPriority",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dunningStage",
        "irName": "dunningStage",
        "type": "DunningStage",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "daysOverdue",
        "irName": "daysOverdue",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "agingBucket",
        "irName": "agingBucket",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hasPaymentPlan",
        "irName": "hasPaymentPlan",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isDisputed",
        "irName": "isDisputed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isEscalatedToLegal",
        "irName": "isEscalatedToLegal",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventTenantId",
        "irName": "eventTenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientTenantId",
        "irName": "clientTenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CollectionAction": {
    "accessor": "collectionAction",
    "dbName": "collection_actions",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "collectionCaseId",
        "irName": "collectionCaseId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actionType",
        "irName": "actionType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "outcome",
        "irName": "outcome",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactedAt",
        "irName": "contactedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CollectionPaymentPlan": {
    "accessor": "collectionPaymentPlan",
    "dbName": "collection_payment_plans",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "collectionCaseId",
        "irName": "collectionCaseId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalAmount",
        "irName": "totalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "installments",
        "irName": "installments",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "frequencyDays",
        "irName": "frequencyDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startDate",
        "irName": "startDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "RevenueRecognitionSchedule": {
    "accessor": "revenueRecognitionSchedule",
    "dbName": "revenue_recognition_schedules",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceId",
        "irName": "invoiceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contractId",
        "irName": "contractId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalAmount",
        "irName": "totalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recognizedAmount",
        "irName": "recognizedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "remainingAmount",
        "irName": "remainingAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "method",
        "irName": "method",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startDate",
        "irName": "startDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endDate",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recognitionPeriod",
        "irName": "recognitionPeriod",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serviceStartDate",
        "irName": "serviceStartDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serviceEndDate",
        "irName": "serviceEndDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalMilestones",
        "irName": "totalMilestones",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedMilestones",
        "irName": "completedMilestones",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RevenueRecognitionLine": {
    "accessor": "revenueRecognitionLine",
    "dbName": "revenue_recognition_lines",
    "pgSchema": "tenant_accounting",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduleId",
        "irName": "scheduleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sequence",
        "irName": "sequence",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "amount",
        "irName": "amount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recognizedAmount",
        "irName": "recognizedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recognizedAt",
        "irName": "recognizedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "milestoneId",
        "irName": "milestoneId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "milestoneName",
        "irName": "milestoneName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "milestoneDescription",
        "irName": "milestoneDescription",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ManifestEntity": {
    "accessor": "manifestEntity",
    "dbName": "manifest_entity",
    "pgSchema": "tenant",
    "pkFields": [
      "tenantId",
      "entityType",
      "id"
    ],
    "whereAccessor": "tenantId_entityType_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "data",
        "irName": "data",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "ManifestIdempotency": {
    "accessor": "manifestIdempotency",
    "dbName": "manifest_idempotency",
    "pgSchema": "tenant",
    "pkFields": [
      "tenantId",
      "key"
    ],
    "whereAccessor": "tenantId_key",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "key",
        "irName": "key",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "result",
        "irName": "result",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiresAt",
        "irName": "expiresAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ManifestApprovalRequest": {
    "accessor": "manifestApprovalRequest",
    "dbName": "manifest_approval_requests",
    "pgSchema": "public",
    "pkFields": [
      "requestKey"
    ],
    "whereAccessor": "requestKey",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "requestKey",
        "irName": "requestKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "entity",
        "irName": "entity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instanceId",
        "irName": "instanceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvalName",
        "irName": "approvalName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "command",
        "irName": "command",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requiredStages",
        "irName": "requiredStages",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "grants",
        "irName": "grants",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedAt",
        "irName": "requestedAt",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiresAt",
        "irName": "expiresAt",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deniedBy",
        "irName": "deniedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deniedReason",
        "irName": "deniedReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "insertedAt",
        "irName": "insertedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ManifestAuditRecord": {
    "accessor": "manifestAuditRecord",
    "dbName": "manifest_audit_records",
    "pgSchema": "public",
    "pkFields": [
      "recordId"
    ],
    "whereAccessor": "recordId",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "recordId",
        "irName": "recordId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "occurredAt",
        "irName": "occurredAt",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "orgId",
        "irName": "orgId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actorId",
        "irName": "actorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestId",
        "irName": "requestId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "source",
        "irName": "source",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entity",
        "irName": "entity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "command",
        "irName": "command",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "commandId",
        "irName": "commandId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "outcome",
        "irName": "outcome",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "emittedEventNames",
        "irName": "emittedEventNames",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "irHash",
        "irName": "irHash",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "diagnostics",
        "irName": "diagnostics",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "insertedAt",
        "irName": "insertedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ManifestOutboxEntry": {
    "accessor": "manifestOutboxEntry",
    "dbName": "manifest_outbox_entries",
    "pgSchema": "public",
    "pkFields": [
      "entryId"
    ],
    "whereAccessor": "entryId",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "entryId",
        "irName": "entryId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "enqueuedAt",
        "irName": "enqueuedAt",
        "type": "BigInt",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "event",
        "irName": "event",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "attempts",
        "irName": "attempts",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastError",
        "irName": "lastError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "claimedAt",
        "irName": "claimedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deliveredAt",
        "irName": "deliveredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failedAt",
        "irName": "failedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "insertedAt",
        "irName": "insertedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subjectEntity",
        "irName": "subjectEntity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subjectId",
        "irName": "subjectId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "SentryFixJob": {
    "accessor": "sentryFixJob",
    "dbName": "sentry_fix_jobs",
    "pgSchema": "platform",
    "pkFields": [
      "id"
    ],
    "whereAccessor": "id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": true
      },
      {
        "name": "sentryIssueId",
        "irName": "sentryIssueId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sentryEventId",
        "irName": "sentryEventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "organizationSlug",
        "irName": "organizationSlug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "projectSlug",
        "irName": "projectSlug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "environment",
        "irName": "environment",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "release",
        "irName": "release",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issueTitle",
        "irName": "issueTitle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "issueUrl",
        "irName": "issueUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "SentryFixJobStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payloadSnapshot",
        "irName": "payloadSnapshot",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "branchName",
        "irName": "branchName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "prUrl",
        "irName": "prUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "prNumber",
        "irName": "prNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorMessage",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "retryCount",
        "irName": "retryCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxRetries",
        "irName": "maxRetries",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startedAt",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "NowstaConfig": {
    "accessor": "nowstaConfig",
    "dbName": "nowsta_config",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId"
    ],
    "whereAccessor": "tenantId",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "apiKey",
        "irName": "apiKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "apiSecret",
        "irName": "apiSecret",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "organizationId",
        "irName": "organizationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncEnabled",
        "irName": "syncEnabled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncDirection",
        "irName": "syncDirection",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncAt",
        "irName": "lastSyncAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncStatus",
        "irName": "lastSyncStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncError",
        "irName": "lastSyncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoSyncInterval",
        "irName": "autoSyncInterval",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "NowstaEmployeeMapping": {
    "accessor": "nowstaEmployeeMapping",
    "dbName": "nowsta_employee_mappings",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaEmployeeId",
        "irName": "nowstaEmployeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convoyEmployeeId",
        "irName": "convoyEmployeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaEmployeeName",
        "irName": "nowstaEmployeeName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaEmployeeEmail",
        "irName": "nowstaEmployeeEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoMapped",
        "irName": "autoMapped",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confirmedAt",
        "irName": "confirmedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "NowstaShiftSync": {
    "accessor": "nowstaShiftSync",
    "dbName": "nowsta_shift_syncs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaShiftId",
        "irName": "nowstaShiftId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convoyShiftId",
        "irName": "convoyShiftId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaEmployeeId",
        "irName": "nowstaEmployeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shiftStart",
        "irName": "shiftStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shiftEnd",
        "irName": "shiftEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "roleDuringShift",
        "irName": "roleDuringShift",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncError",
        "irName": "syncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncedAt",
        "irName": "lastSyncedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nowstaUpdatedAt",
        "irName": "nowstaUpdatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "GoodshuffleConfig": {
    "accessor": "goodshuffleConfig",
    "dbName": "goodshuffle_config",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId"
    ],
    "whereAccessor": "tenantId",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "apiKey",
        "irName": "apiKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "apiSecret",
        "irName": "apiSecret",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "webhookSecret",
        "irName": "webhookSecret",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncEnabled",
        "irName": "syncEnabled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncDirection",
        "irName": "syncDirection",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictResolution",
        "irName": "conflictResolution",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncAt",
        "irName": "lastSyncAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncStatus",
        "irName": "lastSyncStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncError",
        "irName": "lastSyncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "autoSyncInterval",
        "irName": "autoSyncInterval",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "GoodshuffleEventSync": {
    "accessor": "goodshuffleEventSync",
    "dbName": "goodshuffle_event_syncs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleEventId",
        "irName": "goodshuffleEventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convoyEventId",
        "irName": "convoyEventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventName",
        "irName": "eventName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventDate",
        "irName": "eventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncError",
        "irName": "syncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictData",
        "irName": "conflictData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictResolvedAt",
        "irName": "conflictResolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncedAt",
        "irName": "lastSyncedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleUpdatedAt",
        "irName": "goodshuffleUpdatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "GoodshuffleInventorySync": {
    "accessor": "goodshuffleInventorySync",
    "dbName": "goodshuffle_inventory_syncs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleItemId",
        "irName": "goodshuffleItemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convoyInventoryItemId",
        "irName": "convoyInventoryItemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemSku",
        "irName": "itemSku",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncError",
        "irName": "syncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictData",
        "irName": "conflictData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictResolvedAt",
        "irName": "conflictResolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncedAt",
        "irName": "lastSyncedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleUpdatedAt",
        "irName": "goodshuffleUpdatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "GoodshuffleInvoiceSync": {
    "accessor": "goodshuffleInvoiceSync",
    "dbName": "goodshuffle_invoice_syncs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleInvoiceId",
        "irName": "goodshuffleInvoiceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convoyInvoiceId",
        "irName": "convoyInvoiceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceNumber",
        "irName": "invoiceNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceTotal",
        "irName": "invoiceTotal",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncError",
        "irName": "syncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictData",
        "irName": "conflictData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "conflictResolvedAt",
        "irName": "conflictResolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncedAt",
        "irName": "lastSyncedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goodshuffleUpdatedAt",
        "irName": "goodshuffleUpdatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "EmailWorkflow": {
    "accessor": "emailWorkflow",
    "dbName": "email_workflows",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerType",
        "irName": "triggerType",
        "type": "email_trigger_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerConfig",
        "irName": "triggerConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "emailTemplateId",
        "irName": "emailTemplateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "emailTemplateTenantId",
        "irName": "emailTemplateTenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientConfig",
        "irName": "recipientConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastTriggeredAt",
        "irName": "lastTriggeredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EmailLog": {
    "accessor": "emailLog",
    "dbName": "email_logs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "workflowId",
        "irName": "workflowId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientEmail",
        "irName": "recipientEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientId",
        "irName": "recipientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientType",
        "irName": "recipientType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subject",
        "irName": "subject",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notificationType",
        "irName": "notificationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "email_status",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resendId",
        "irName": "resendId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorMessage",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sentAt",
        "irName": "sentAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deliveredAt",
        "irName": "deliveredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "openedAt",
        "irName": "openedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failedAt",
        "irName": "failedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "OutboundWebhook": {
    "accessor": "outboundWebhook",
    "dbName": "outbound_webhooks",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "url",
        "irName": "url",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "secret",
        "irName": "secret",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "apiKey",
        "irName": "apiKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventTypeFilters",
        "irName": "eventTypeFilters",
        "type": "webhook_event_type",
        "isEnum": true,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityFilters",
        "irName": "entityFilters",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "webhook_status",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "retryCount",
        "irName": "retryCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "retryDelayMs",
        "irName": "retryDelayMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timeoutMs",
        "irName": "timeoutMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "customHeaders",
        "irName": "customHeaders",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastTriggeredAt",
        "irName": "lastTriggeredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSuccessAt",
        "irName": "lastSuccessAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastFailureAt",
        "irName": "lastFailureAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "consecutiveFailures",
        "irName": "consecutiveFailures",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "WebhookDeliveryLog": {
    "accessor": "webhookDeliveryLog",
    "dbName": "webhook_delivery_logs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "webhookId",
        "irName": "webhookId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "webhook_event_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payload",
        "irName": "payload",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "webhook_delivery_status",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "attemptNumber",
        "irName": "attemptNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "httpResponseStatus",
        "irName": "httpResponseStatus",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "responseBody",
        "irName": "responseBody",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorMessage",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextRetryAt",
        "irName": "nextRetryAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deliveredAt",
        "irName": "deliveredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failedAt",
        "irName": "failedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "WebhookDeadLetterQueue": {
    "accessor": "webhookDeadLetterQueue",
    "dbName": "webhook_dead_letter_queue",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "webhookId",
        "irName": "webhookId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "originalDeliveryId",
        "irName": "originalDeliveryId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventType",
        "irName": "eventType",
        "type": "webhook_event_type",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payload",
        "irName": "payload",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "finalErrorMessage",
        "irName": "finalErrorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalAttempts",
        "irName": "totalAttempts",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "originalUrl",
        "irName": "originalUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "movedToDlqAt",
        "irName": "movedToDlqAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolution",
        "irName": "resolution",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "retriedAt",
        "irName": "retriedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "ApiKey": {
    "accessor": "apiKey",
    "dbName": "api_keys",
    "pgSchema": "platform",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "keyPrefix",
        "irName": "keyPrefix",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hashedKey",
        "irName": "hashedKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scopes",
        "irName": "scopes",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastUsedAt",
        "irName": "lastUsedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiresAt",
        "irName": "expiresAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "revokedAt",
        "irName": "revokedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdByUserId",
        "irName": "createdByUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ManifestCommandTelemetry": {
    "accessor": "manifestCommandTelemetry",
    "dbName": "manifest_command_telemetry",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "commandName",
        "irName": "commandName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityName",
        "irName": "entityName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "instanceId",
        "irName": "instanceId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorMessage",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorCode",
        "irName": "errorCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "durationMs",
        "irName": "durationMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guardEvalMs",
        "irName": "guardEvalMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actionExecMs",
        "irName": "actionExecMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guardsEvaluated",
        "irName": "guardsEvaluated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guardsPassed",
        "irName": "guardsPassed",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guardsFailed",
        "irName": "guardsFailed",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "failedGuards",
        "irName": "failedGuards",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "idempotencyKey",
        "irName": "idempotencyKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "wasIdempotentHit",
        "irName": "wasIdempotentHit",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventsEmitted",
        "irName": "eventsEmitted",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedBy",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correlationId",
        "irName": "correlationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "causationId",
        "irName": "causationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestId",
        "irName": "requestId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ipAddress",
        "irName": "ipAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "executedAt",
        "irName": "executedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RateLimitConfig": {
    "accessor": "rateLimitConfig",
    "dbName": "rate_limit_configs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endpointPattern",
        "irName": "endpointPattern",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "windowMs",
        "irName": "windowMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxRequests",
        "irName": "maxRequests",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "burstAllowance",
        "irName": "burstAllowance",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RateLimitUsage": {
    "accessor": "rateLimitUsage",
    "dbName": "rate_limit_usage",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endpoint",
        "irName": "endpoint",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "method",
        "irName": "method",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bucketStart",
        "irName": "bucketStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestCount",
        "irName": "requestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blockedCount",
        "irName": "blockedCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "avgResponseTime",
        "irName": "avgResponseTime",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxResponseTime",
        "irName": "maxResponseTime",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userHashes",
        "irName": "userHashes",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "RateLimitEvent": {
    "accessor": "rateLimitEvent",
    "dbName": "rate_limit_events",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endpoint",
        "irName": "endpoint",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "method",
        "irName": "method",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allowed",
        "irName": "allowed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "windowStart",
        "irName": "windowStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "windowEnd",
        "irName": "windowEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestsInWindow",
        "irName": "requestsInWindow",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "limit",
        "irName": "limit",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userAgent",
        "irName": "userAgent",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ipHash",
        "irName": "ipHash",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "responseTime",
        "irName": "responseTime",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timestamp",
        "irName": "timestamp",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RolePolicy": {
    "accessor": "rolePolicy",
    "dbName": "role_policies",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "roleId",
        "irName": "roleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "roleName",
        "irName": "roleName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "permissions",
        "irName": "permissions",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PayrollApprovalHistory": {
    "accessor": "payrollApprovalHistory",
    "dbName": "payroll_approval_history",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "payrollRunId",
        "irName": "payrollRunId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "previousStatus",
        "irName": "previousStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "newStatus",
        "irName": "newStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedBy",
        "irName": "performedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "performedAt",
        "irName": "performedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TaxConfiguration": {
    "accessor": "taxConfiguration",
    "dbName": "tax_configurations",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenant_id",
      "id"
    ],
    "whereAccessor": "tenant_id_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenant_id",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tax_type",
        "irName": "taxType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "jurisdiction",
        "irName": "jurisdiction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "state_code",
        "irName": "stateCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "is_active",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "created_at",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updated_at",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deleted_at",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PayrollAuditLog": {
    "accessor": "payrollAuditLog",
    "dbName": "payroll_audit_log",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodId",
        "irName": "periodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "inputSnapshot",
        "irName": "inputSnapshot",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rulesVersion",
        "irName": "rulesVersion",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resultSummary",
        "irName": "resultSummary",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VendorCatalog": {
    "accessor": "vendorCatalog",
    "dbName": "vendor_catalogs",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierId",
        "irName": "supplierId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemNumber",
        "irName": "itemNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "baseUnitCost",
        "irName": "baseUnitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currency",
        "irName": "currency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitOfMeasure",
        "irName": "unitOfMeasure",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadTimeDays",
        "irName": "leadTimeDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadTimeMinDays",
        "irName": "leadTimeMinDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadTimeMaxDays",
        "irName": "leadTimeMaxDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minimumOrderQuantity",
        "irName": "minimumOrderQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "orderMultiple",
        "irName": "orderMultiple",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveFrom",
        "irName": "effectiveFrom",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveTo",
        "irName": "effectiveTo",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supplierSku",
        "irName": "supplierSku",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastCostUpdate",
        "irName": "lastCostUpdate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PricingTier": {
    "accessor": "pricingTier",
    "dbName": "pricing_tiers",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "catalogEntryId",
        "irName": "catalogEntryId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tierName",
        "irName": "tierName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minQuantity",
        "irName": "minQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxQuantity",
        "irName": "maxQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitCost",
        "irName": "unitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discountPercent",
        "irName": "discountPercent",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveFrom",
        "irName": "effectiveFrom",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveTo",
        "irName": "effectiveTo",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "BulkOrderRule": {
    "accessor": "bulkOrderRule",
    "dbName": "bulk_order_rules",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "catalogEntryId",
        "irName": "catalogEntryId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ruleName",
        "irName": "ruleName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minimumQuantity",
        "irName": "minimumQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ruleType",
        "irName": "ruleType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdQuantity",
        "irName": "thresholdQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "action",
        "irName": "action",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "discountPercent",
        "irName": "discountPercent",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "freeItemQuantity",
        "irName": "freeItemQuantity",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippingIncluded",
        "irName": "shippingIncluded",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveFrom",
        "irName": "effectiveFrom",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "effectiveTo",
        "irName": "effectiveTo",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AuditSchedule": {
    "accessor": "auditSchedule",
    "dbName": "audit_schedules",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "frequency",
        "irName": "frequency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dayOfWeek",
        "irName": "dayOfWeek",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dayOfMonth",
        "irName": "dayOfMonth",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "time",
        "irName": "time",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "KnowledgeBaseEntry": {
    "accessor": "knowledgeBaseEntry",
    "dbName": "knowledge_base_entries",
    "pgSchema": "tenant",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "slug",
        "irName": "slug",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tags",
        "irName": "tags",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "authorId",
        "irName": "authorId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "publishedAt",
        "irName": "publishedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventoryTransfer": {
    "accessor": "inventoryTransfer",
    "dbName": "inventory_transfers",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transferNumber",
        "irName": "transferNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fromLocationId",
        "irName": "fromLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "toLocationId",
        "irName": "toLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedBy",
        "irName": "requestedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippedBy",
        "irName": "shippedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedBy",
        "irName": "receivedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedAt",
        "irName": "requestedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shippedAt",
        "irName": "shippedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedAt",
        "irName": "receivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "InventoryTransferItem": {
    "accessor": "inventoryTransferItem",
    "dbName": "inventory_transfer_items",
    "pgSchema": "tenant_inventory",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transferId",
        "irName": "transferId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemId",
        "irName": "itemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "quantity",
        "irName": "quantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "receivedQuantity",
        "irName": "receivedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "QualityCheck": {
    "accessor": "qualityCheck",
    "dbName": "quality_checks",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkNumber",
        "irName": "checkNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkType",
        "irName": "checkType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledAt",
        "irName": "scheduledAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedBy",
        "irName": "completedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "QualityCheckItem": {
    "accessor": "qualityCheckItem",
    "dbName": "quality_check_items",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkId",
        "irName": "checkId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "criterion",
        "irName": "criterion",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "passed",
        "irName": "passed",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "value",
        "irName": "value",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sortOrder",
        "irName": "sortOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "QACheck": {
    "accessor": "qACheck",
    "dbName": "qa_checks",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "location",
        "irName": "location",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkType",
        "irName": "checkType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "result",
        "irName": "result",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "inspector",
        "irName": "inspector",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reinspectedAt",
        "irName": "reinspectedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TemperatureLog": {
    "accessor": "temperatureLog",
    "dbName": "temperature_logs",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "logNumber",
        "irName": "logNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "logType",
        "irName": "logType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "itemName",
        "irName": "itemName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature",
        "irName": "temperature",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit",
        "irName": "unit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "targetTemp",
        "irName": "targetTemp",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "withinRange",
        "irName": "withinRange",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "loggedAt",
        "irName": "loggedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "loggedBy",
        "irName": "loggedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correctiveAction",
        "irName": "correctiveAction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "CorrectiveAction": {
    "accessor": "correctiveAction",
    "dbName": "corrective_actions",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actionNumber",
        "irName": "actionNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "relatedCheckId",
        "irName": "relatedCheckId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "relatedTempLogId",
        "irName": "relatedTempLogId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "severity",
        "irName": "severity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rootCause",
        "irName": "rootCause",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "immediateAction",
        "irName": "immediateAction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "preventiveAction",
        "irName": "preventiveAction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dueDate",
        "irName": "dueDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedBy",
        "irName": "resolvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolutionNotes",
        "irName": "resolutionNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verificationMethod",
        "irName": "verificationMethod",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verifiedBy",
        "irName": "verifiedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TemperatureProbe": {
    "accessor": "temperatureProbe",
    "dbName": "temperature_probes",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "probeId",
        "irName": "probeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "probeType",
        "irName": "probeType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "minTemp",
        "irName": "minTemp",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxTemp",
        "irName": "maxTemp",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastReading",
        "irName": "lastReading",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastReadingAt",
        "irName": "lastReadingAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "batteryLevel",
        "irName": "batteryLevel",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastCalibration",
        "irName": "lastCalibration",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextCalibration",
        "irName": "nextCalibration",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "calibrationIntervalDays",
        "irName": "calibrationIntervalDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "TemperatureReading": {
    "accessor": "temperatureReading",
    "dbName": "temperature_readings",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "probeId",
        "irName": "probeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature",
        "irName": "temperature",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unit",
        "irName": "unit",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "loggedAt",
        "irName": "loggedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "batteryLevel",
        "irName": "batteryLevel",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signalStrength",
        "irName": "signalStrength",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "IoTAlert": {
    "accessor": "ioTAlert",
    "dbName": "iot_alerts",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertNumber",
        "irName": "alertNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "probeId",
        "irName": "probeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertType",
        "irName": "alertType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "severity",
        "irName": "severity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "message",
        "irName": "message",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "temperature",
        "irName": "temperature",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold",
        "irName": "threshold",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggeredAt",
        "irName": "triggeredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedAt",
        "irName": "acknowledgedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedAt",
        "irName": "resolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolvedBy",
        "irName": "resolvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "resolutionNotes",
        "irName": "resolutionNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "IotAlertRule": {
    "accessor": "iotAlertRule",
    "dbName": "iot_alert_rules",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sensorType",
        "irName": "sensorType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "condition",
        "irName": "condition",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "threshold",
        "irName": "threshold",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdMin",
        "irName": "thresholdMin",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdMax",
        "irName": "thresholdMax",
        "type": "Float",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "severity",
        "irName": "severity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "durationMs",
        "irName": "durationMs",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "alertAction",
        "irName": "alertAction",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notifyRoles",
        "irName": "notifyRoles",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notifyChannels",
        "irName": "notifyChannels",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Facility": {
    "accessor": "facility",
    "dbName": "facilities",
    "pgSchema": "tenant_facilities",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "facilityType",
        "irName": "facilityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "state",
        "irName": "state",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "country",
        "irName": "country",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "FacilityArea": {
    "accessor": "facilityArea",
    "dbName": "facility_areas",
    "pgSchema": "tenant_facilities",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueId",
        "irName": "venueId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaType",
        "irName": "areaType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "floor",
        "irName": "floor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "squareFeet",
        "irName": "squareFeet",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "FacilityAsset": {
    "accessor": "facilityAsset",
    "dbName": "facility_assets",
    "pgSchema": "tenant_facilities",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assetType",
        "irName": "assetType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "serialNumber",
        "irName": "serialNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "manufacturer",
        "irName": "manufacturer",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "model",
        "irName": "model",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "purchaseDate",
        "irName": "purchaseDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "purchaseCost",
        "irName": "purchaseCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "warrantyExpiry",
        "irName": "warrantyExpiry",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "MaintenanceWorkOrder": {
    "accessor": "maintenanceWorkOrder",
    "dbName": "maintenance_work_orders",
    "pgSchema": "tenant_facilities",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "workOrderNumber",
        "irName": "workOrderNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "workOrderType",
        "irName": "workOrderType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportedBy",
        "irName": "reportedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reportedAt",
        "irName": "reportedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedVendor",
        "irName": "assignedVendor",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startedAt",
        "irName": "startedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedBy",
        "irName": "completedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "laborHours",
        "irName": "laborHours",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "partsCost",
        "irName": "partsCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "laborCost",
        "irName": "laborCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PreventiveMaintenanceSchedule": {
    "accessor": "preventiveMaintenanceSchedule",
    "dbName": "preventive_maintenance_schedules",
    "pgSchema": "tenant_facilities",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduleNumber",
        "irName": "scheduleNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "frequency",
        "irName": "frequency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "intervalDays",
        "irName": "intervalDays",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastCompletedAt",
        "irName": "lastCompletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextDueAt",
        "irName": "nextDueAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedHours",
        "irName": "estimatedHours",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedCost",
        "irName": "estimatedCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "DeliveryRoute": {
    "accessor": "deliveryRoute",
    "dbName": "delivery_routes",
    "pgSchema": "tenant_logistics",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "routeNumber",
        "irName": "routeNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startTime",
        "irName": "startTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endTime",
        "irName": "endTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalDistance",
        "irName": "totalDistance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalDuration",
        "irName": "totalDuration",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optimizationScore",
        "irName": "optimizationScore",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optimizationAlgorithm",
        "irName": "optimizationAlgorithm",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "driverId",
        "irName": "driverId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vehicleId",
        "irName": "vehicleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualStartTime",
        "irName": "actualStartTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualEndTime",
        "irName": "actualEndTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualDistance",
        "irName": "actualDistance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "RouteStop": {
    "accessor": "routeStop",
    "dbName": "route_stops",
    "pgSchema": "tenant_logistics",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "routeId",
        "irName": "routeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stopNumber",
        "irName": "stopNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueId",
        "irName": "venueId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addressLine2",
        "irName": "addressLine2",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "countryCode",
        "irName": "countryCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "latitude",
        "irName": "latitude",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "longitude",
        "irName": "longitude",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stopType",
        "irName": "stopType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "plannedArrival",
        "irName": "plannedArrival",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "plannedDuration",
        "irName": "plannedDuration",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "distanceFromPrevious",
        "irName": "distanceFromPrevious",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timeFromPrevious",
        "irName": "timeFromPrevious",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualArrival",
        "irName": "actualArrival",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualDeparture",
        "irName": "actualDeparture",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "Vehicle": {
    "accessor": "vehicle",
    "dbName": "vehicles",
    "pgSchema": "tenant_logistics",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "make",
        "irName": "make",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "model",
        "irName": "model",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "year",
        "irName": "year",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "plateNumber",
        "irName": "plateNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vin",
        "irName": "vin",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacityWeight",
        "irName": "capacityWeight",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "capacityVolume",
        "irName": "capacityVolume",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fuelType",
        "irName": "fuelType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "mileage",
        "irName": "mileage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Driver": {
    "accessor": "driver",
    "dbName": "drivers",
    "pgSchema": "tenant_logistics",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "licenseNumber",
        "irName": "licenseNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "licenseExpiry",
        "irName": "licenseExpiry",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vehicleId",
        "irName": "vehicleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "ProviderSync": {
    "accessor": "providerSync",
    "dbName": "provider_syncs",
    "pgSchema": "tenant_admin",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "provider",
        "irName": "provider",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "providerUserId",
        "irName": "providerUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "accessToken",
        "irName": "accessToken",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refreshToken",
        "irName": "refreshToken",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tokenExpiry",
        "irName": "tokenExpiry",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "calendarId",
        "irName": "calendarId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "calendarName",
        "irName": "calendarName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncAt",
        "irName": "lastSyncAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncStatus",
        "irName": "lastSyncStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastSyncError",
        "irName": "lastSyncError",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "syncDirection",
        "irName": "syncDirection",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "enabled",
        "irName": "enabled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": true,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventStaff": {
    "accessor": "eventStaff",
    "dbName": "event_staff",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "staffMemberId",
        "irName": "staffMemberId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role",
        "irName": "role",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shiftStart",
        "irName": "shiftStart",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "shiftEnd",
        "irName": "shiftEnd",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confirmedAt",
        "irName": "confirmedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkedInAt",
        "irName": "checkedInAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "checkedOutAt",
        "irName": "checkedOutAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "noShowReason",
        "irName": "noShowReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "StaffMember": {
    "accessor": "staffMember",
    "dbName": "staff_members",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": true,
    "fields": [
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "displayName",
        "irName": "displayName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "role",
        "irName": "role",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "deletedAt",
        "irName": "deletedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AiEventSetupSession": {
    "accessor": "aiEventSetupSession",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "userId",
        "irName": "userId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "originalInput",
        "irName": "originalInput",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedTitle",
        "irName": "parsedTitle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedEventType",
        "irName": "parsedEventType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedEventDate",
        "irName": "parsedEventDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedGuestCount",
        "irName": "parsedGuestCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedVenueName",
        "irName": "parsedVenueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedVenueAddress",
        "irName": "parsedVenueAddress",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedNotes",
        "irName": "parsedNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "parsedTags",
        "irName": "parsedTags",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confidence",
        "irName": "confidence",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "missingFields",
        "irName": "missingFields",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suggestions",
        "irName": "suggestions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdEventId",
        "irName": "createdEventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "AutomatedFollowup": {
    "accessor": "automatedFollowup",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sentDate",
        "irName": "sentDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientId",
        "irName": "recipientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subject",
        "irName": "subject",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "body",
        "irName": "body",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "templateId",
        "irName": "templateId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "errorMessage",
        "irName": "errorMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Budget": {
    "accessor": "budget",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fiscalYear",
        "irName": "fiscalYear",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalAmount",
        "irName": "totalAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "allocatedAmount",
        "irName": "allocatedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "spentAmount",
        "irName": "spentAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "departmentId",
        "irName": "departmentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Deal": {
    "accessor": "deal",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "leadId",
        "irName": "leadId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "value",
        "irName": "value",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currency",
        "irName": "currency",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stage",
        "irName": "stage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "probability",
        "irName": "probability",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expectedCloseDate",
        "irName": "expectedCloseDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualCloseDate",
        "irName": "actualCloseDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EntityVersion": {
    "accessor": "entityVersion",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionedEntityId",
        "irName": "versionedEntityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "versionNumber",
        "irName": "versionNumber",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "changeReason",
        "irName": "changeReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "changeSummary",
        "irName": "changeSummary",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "changeType",
        "irName": "changeType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "snapshotData",
        "irName": "snapshotData",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "metadata",
        "irName": "metadata",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isApproved",
        "irName": "isApproved",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedAt",
        "irName": "approvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approvedBy",
        "irName": "approvedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "EventWaitlistEntry": {
    "accessor": "eventWaitlistEntry",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestName",
        "irName": "guestName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "partySize",
        "irName": "partySize",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "joinedAt",
        "irName": "joinedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notifiedAt",
        "irName": "notifiedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "FacilitySchedule": {
    "accessor": "facilitySchedule",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "facilityId",
        "irName": "facilityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduleType",
        "irName": "scheduleType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "startDate",
        "irName": "startDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endDate",
        "irName": "endDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "FacilityWorkOrder": {
    "accessor": "facilityWorkOrder",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "facilityId",
        "irName": "facilityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "areaId",
        "irName": "areaId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assetId",
        "irName": "assetId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "title",
        "irName": "title",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "category",
        "irName": "category",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requestedBy",
        "irName": "requestedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "assignedTo",
        "irName": "assignedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedCost",
        "irName": "estimatedCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualCost",
        "irName": "actualCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledDate",
        "irName": "scheduledDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedDate",
        "irName": "completedDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "LogisticsDispatch": {
    "accessor": "logisticsDispatch",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "routeId",
        "irName": "routeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "driverId",
        "irName": "driverId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "vehicleId",
        "irName": "vehicleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "priority",
        "irName": "priority",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "estimatedDeliveryTime",
        "irName": "estimatedDeliveryTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualDeliveryTime",
        "irName": "actualDeliveryTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "PerformancePrediction": {
    "accessor": "performancePrediction",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "predictionType",
        "irName": "predictionType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "predictionHorizon",
        "irName": "predictionHorizon",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "predictionScore",
        "irName": "predictionScore",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confidence",
        "irName": "confidence",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "factors",
        "irName": "factors",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expiresAt",
        "irName": "expiresAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "SampleData": {
    "accessor": "sampleData",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seededAt",
        "irName": "seededAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clearedAt",
        "irName": "clearedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isSeeded",
        "irName": "isSeeded",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventsCreated",
        "irName": "eventsCreated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientsCreated",
        "irName": "clientsCreated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "usersCreated",
        "irName": "usersCreated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipesCreated",
        "irName": "recipesCreated",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "StaffPerformance": {
    "accessor": "staffPerformance",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewType",
        "irName": "reviewType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rating",
        "irName": "rating",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewerId",
        "irName": "reviewerId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodStart",
        "irName": "periodStart",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "periodEnd",
        "irName": "periodEnd",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "strengths",
        "irName": "strengths",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "improvements",
        "irName": "improvements",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "goals",
        "irName": "goals",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "Vendor": {
    "accessor": "vendor",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "type",
        "irName": "type",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "email",
        "irName": "email",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "phone",
        "irName": "phone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "website",
        "irName": "website",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "address",
        "irName": "address",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "city",
        "irName": "city",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "state",
        "irName": "state",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "zip",
        "irName": "zip",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "taxId",
        "irName": "taxId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "paymentTerms",
        "irName": "paymentTerms",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "rating",
        "irName": "rating",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ratingCount",
        "irName": "ratingCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "notes",
        "irName": "notes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VersionApproval": {
    "accessor": "versionApproval",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityVersionId",
        "irName": "entityVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "approverId",
        "irName": "approverId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "comments",
        "irName": "comments",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reviewedAt",
        "irName": "reviewedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "VersionedEntity": {
    "accessor": "versionedEntity",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityId",
        "irName": "entityId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "entityName",
        "irName": "entityName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isLocked",
        "irName": "isLocked",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentVersionId",
        "irName": "currentVersionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  },
  "WorkforceOptimization": {
    "accessor": "workforceOptimization",
    "dbName": null,
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
    "fields": [
      {
        "name": "tenantId",
        "irName": "tenantId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "id",
        "irName": "id",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "locationId",
        "irName": "locationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optimizationType",
        "irName": "optimizationType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "createdAt",
        "irName": "createdAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedAt",
        "irName": "completedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      }
    ]
  }
};
