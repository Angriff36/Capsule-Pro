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
  /** When true, create() must use tenant: { connect: { id } } not scalar tenantId alone. */
  requiresTenantConnect?: boolean;
  versionProperty?: string;
  fields: PrismaFieldMeta[];
}

export const PRISMA_MODEL_METADATA: Record<string, PrismaModelMeta> = {
  "ActionMilestone": {
    "accessor": "actionMilestone",
    "dbName": "action_milestones",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "disciplinaryActionId",
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
        "name": "threadId",
        "irName": "threadId",
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
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "threadId",
        "irName": "threadId",
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
        "hasDefault": true,
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
        "name": "threadType",
        "irName": "threadType",
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
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "status",
        "irName": "status",
        "type": "AdminTaskStatus",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "position",
        "irName": "position",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "labels",
        "irName": "labels",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
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
        "name": "createdBy",
        "irName": "createdBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "AdminTaskAttachment": {
    "accessor": "adminTaskAttachment",
    "dbName": "admin_task_attachments",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "mimeType",
        "irName": "mimeType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "uploadedBy",
        "irName": "uploadedBy",
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
      }
    ]
  },
  "AdminTaskComment": {
    "accessor": "adminTaskComment",
    "dbName": "admin_task_comments",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "taskId",
        "irName": "taskId",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "AdminTaskDevMeta": {
    "accessor": "adminTaskDevMeta",
    "dbName": "admin_task_dev_meta",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "environment",
        "irName": "environment",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stepsToRepro",
        "irName": "stepsToRepro",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "expectedResult",
        "irName": "expectedResult",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualResult",
        "irName": "actualResult",
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
      }
    ]
  },
  "AdminTaskFileRef": {
    "accessor": "adminTaskFileRef",
    "dbName": "admin_task_file_refs",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "taskId",
        "irName": "taskId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refType",
        "irName": "refType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refId",
        "irName": "refId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "refLabel",
        "irName": "refLabel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "linkedBy",
        "irName": "linkedBy",
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
      }
    ]
  },
  "AiEventSetupSession": {
    "accessor": "aiEventSetupSession",
    "dbName": "AiEventSetupSession",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "channel",
        "irName": "channel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "overrideReason",
        "irName": "overrideReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "escalatedAt",
        "irName": "escalatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedTo",
        "irName": "escalatedTo",
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "nextRunAt",
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
        "name": "lastRunAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "AutomatedFollowup": {
    "accessor": "automatedFollowup",
    "dbName": "AutomatedFollowup",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
      }
    ]
  },
  "BankAccount": {
    "accessor": "bankAccount",
    "dbName": "bank_accounts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "bankName",
        "irName": "bankName",
        "type": "String",
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
        "name": "verificationFailedAt",
        "irName": "verificationFailedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "verificationFailureReason",
        "irName": "verificationFailureReason",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardName",
        "irName": "boardName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "boardType",
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
        "name": "schemaVersion",
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
        "name": "documentUrl",
        "irName": "documentUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sourceDocumentType",
        "irName": "sourceDocumentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "documentImportedAt",
        "irName": "documentImportedAt",
        "type": "DateTime",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "label",
        "irName": "label",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "optional": true,
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
        "optional": true,
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
      }
    ]
  },
  "BoardConfig": {
    "accessor": "boardConfig",
    "dbName": "board_configs",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "columns",
        "irName": "columns",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "settings",
        "irName": "settings",
        "type": "Json",
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
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
      }
    ]
  },
  "Budget": {
    "accessor": "budget",
    "dbName": "Budget",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "type": "BudgetStatus",
        "isEnum": true,
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
        "name": "budgetId",
        "irName": "budgetId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "BulkCombineRule": {
    "accessor": "bulkCombineRule",
    "dbName": "bulk_combine_rules",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "matchCriteria",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "CallPlanningSession": {
    "accessor": "callPlanningSession",
    "dbName": "call_planning_sessions",
    "pgSchema": "tenant_crm",
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
        "hasDefault": true,
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
        "name": "sourceType",
        "irName": "sourceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transcriptText",
        "irName": "transcriptText",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "optional": true,
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
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "endedAt",
        "irName": "endedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "customerId",
        "irName": "customerId",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "orderStatus",
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
        "name": "deliveryDate",
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
        "name": "deliveryTime",
        "irName": "deliveryTime",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "subtotalAmount",
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
        "name": "serviceChargeAmount",
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
        "name": "depositRequired",
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
        "name": "depositAmount",
        "irName": "depositAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositPaid",
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
        "name": "depositPaidAt",
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
        "name": "prepStartedAt",
        "irName": "prepStartedAt",
        "type": "DateTime",
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueCity",
        "irName": "venueCity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueState",
        "irName": "venueState",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueZip",
        "irName": "venueZip",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueContactName",
        "irName": "venueContactName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venueContactPhone",
        "irName": "venueContactPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "specialInstructions",
        "irName": "specialInstructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietaryRestrictions",
        "irName": "dietaryRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "staffRequired",
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
        "name": "staffAssigned",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "accountNumber",
        "irName": "accountNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "parentId",
        "irName": "parentId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "companyName",
        "irName": "companyName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "firstName",
        "irName": "firstName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "addressLine1",
        "irName": "addressLine1",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "title",
        "irName": "title",
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
        "name": "phoneMobile",
        "irName": "phoneMobile",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "escalatedAt",
        "irName": "escalatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedTo",
        "irName": "escalatedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "collectionCaseId",
        "irName": "collectionCaseId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "direction",
        "irName": "direction",
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
        "name": "description",
        "irName": "description",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextActionDate",
        "irName": "nextActionDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "promiseAmount",
        "irName": "promiseAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "promiseDate",
        "irName": "promiseDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "scheduledFor",
        "irName": "scheduledFor",
        "type": "DateTime",
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
        "name": "invoiceId",
        "irName": "invoiceId",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "dunningStage",
        "irName": "dunningStage",
        "type": "String",
        "isEnum": false,
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
        "name": "assignedAt",
        "irName": "assignedAt",
        "type": "DateTime",
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
        "name": "paymentPlanId",
        "irName": "paymentPlanId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextPaymentDue",
        "irName": "nextPaymentDue",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
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
        "name": "disputeReason",
        "irName": "disputeReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "disputeResolvedAt",
        "irName": "disputeResolvedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
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
        "name": "legalCaseNumber",
        "irName": "legalCaseNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "legalFirm",
        "irName": "legalFirm",
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
        "name": "lastActivityAt",
        "irName": "lastActivityAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "closedAt",
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
        "name": "collectionCaseId",
        "irName": "collectionCaseId",
        "type": "String",
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
        "name": "installmentAmount",
        "irName": "installmentAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedInstallments",
        "irName": "completedInstallments",
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
        "name": "defaultedAt",
        "irName": "defaultedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
      },
      {
        "name": "scope",
        "irName": "scope",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "groupId",
        "irName": "groupId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "sizeDescription",
        "irName": "sizeDescription",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "signerRole",
        "irName": "signerRole",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "invalidatedAt",
        "irName": "invalidatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invalidationReason",
        "irName": "invalidationReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isValid",
        "irName": "isValid",
        "type": "Boolean",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "sourceType",
        "irName": "sourceType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "ruleName",
        "irName": "ruleName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "value",
        "irName": "value",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "Deal": {
    "accessor": "deal",
    "dbName": "Deal",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "type": "DealStatus",
        "isEnum": true,
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
        "name": "name",
        "irName": "name",
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
        "hasDefault": true,
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
        "name": "totalDistance",
        "irName": "totalDistance",
        "type": "Decimal",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "DisciplinaryAction": {
    "accessor": "disciplinaryAction",
    "dbName": "disciplinary_actions",
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
        "hasDefault": true,
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
        "name": "actionType",
        "irName": "actionType",
        "type": "String",
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
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "severity",
        "irName": "severity",
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
        "name": "issuedBy",
        "irName": "issuedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedTo",
        "irName": "escalatedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalationReason",
        "irName": "escalationReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedAt",
        "irName": "escalatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "serviceStyle",
        "irName": "serviceStyle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "isSeasonal",
        "irName": "isSeasonal",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonLabel",
        "irName": "seasonLabel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonStartMonth",
        "irName": "seasonStartMonth",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonEndMonth",
        "irName": "seasonEndMonth",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isEightySix",
        "irName": "isEightySix",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eightySixReason",
        "irName": "eightySixReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eightySixAt",
        "irName": "eightySixAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "Document": {
    "accessor": "document",
    "dbName": "documents",
    "pgSchema": "tenant",
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
        "hasDefault": true,
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
        "name": "name",
        "irName": "name",
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fileSizeBytes",
        "irName": "fileSizeBytes",
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
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "uploadedBy",
        "irName": "uploadedBy",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "name": "publishedBy",
        "irName": "publishedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "supersededBy",
        "irName": "supersededBy",
        "type": "String",
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
        "name": "supersededAt",
        "irName": "supersededAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "licenseNumber",
        "irName": "licenseNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "templateType",
        "irName": "templateType",
        "type": "String",
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
        "optional": false,
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
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": false,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerType",
        "irName": "triggerType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "isSuspended",
        "irName": "isSuspended",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suspendReason",
        "irName": "suspendReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suspendedAt",
        "irName": "suspendedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reinstatedAt",
        "irName": "reinstatedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "employeeId",
        "irName": "employeeId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "name",
        "irName": "name",
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
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "EntityVersion": {
    "accessor": "entityVersion",
    "dbName": "EntityVersion",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "createdBy",
        "irName": "createdBy",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "venueName",
        "irName": "venueName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
      }
    ]
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
        "name": "signedAt",
        "irName": "signedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "canceledBy",
        "irName": "canceledBy",
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
        "name": "specialInstructions",
        "irName": "specialInstructions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
      }
    ]
  },
  "EventFollowup": {
    "accessor": "eventFollowup",
    "dbName": "event_followups",
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
        "hasDefault": true,
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
        "name": "description",
        "irName": "description",
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "declineReason",
        "irName": "declineReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "fileName",
        "irName": "fileName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "totalRows",
        "irName": "totalRows",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "importedRows",
        "irName": "importedRows",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "skippedRows",
        "irName": "skippedRows",
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "EventImportWorkflow": {
    "accessor": "eventImportWorkflow",
    "dbName": "event_import_workflows",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "hasDefault": true,
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
        "name": "inputData",
        "irName": "inputData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "outputData",
        "irName": "outputData",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "stepResults",
        "irName": "stepResults",
        "type": "Json",
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
        "name": "warnings",
        "irName": "warnings",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "confidence",
        "irName": "confidence",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "EventPlanningDraft": {
    "accessor": "eventPlanningDraft",
    "dbName": "event_planning_drafts",
    "pgSchema": "tenant_crm",
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
        "hasDefault": true,
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
        "name": "clientName",
        "irName": "clientName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientContactId",
        "irName": "clientContactId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "eventTime",
        "irName": "eventTime",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestCountMin",
        "irName": "guestCountMin",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "guestCountMax",
        "irName": "guestCountMax",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "venuePreference",
        "irName": "venuePreference",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "dietaryRestrictions",
        "irName": "dietaryRestrictions",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "menuPreferences",
        "irName": "menuPreferences",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetMin",
        "irName": "budgetMin",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "budgetMax",
        "irName": "budgetMax",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "packageIds",
        "irName": "packageIds",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "addOnIds",
        "irName": "addOnIds",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "customItems",
        "irName": "customItems",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timelineNotes",
        "irName": "timelineNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "openQuestions",
        "irName": "openQuestions",
        "type": "String",
        "isEnum": false,
        "isList": true,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "specialNotes",
        "irName": "specialNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "aiSummary",
        "irName": "aiSummary",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "overallConfidence",
        "irName": "overallConfidence",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "convertedEventId",
        "irName": "convertedEventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "rejectedBy",
        "irName": "rejectedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
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
        "name": "description",
        "irName": "description",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "durationMinutes",
        "irName": "durationMinutes",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "EventTimelineItem": {
    "accessor": "eventTimelineItem",
    "dbName": "event_timeline_items",
    "pgSchema": "tenant_events",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "optional": false,
        "hasDefault": true,
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
        "name": "assignedTo",
        "irName": "assignedTo",
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
        "optional": false,
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
      }
    ]
  },
  "EventWaitlistEntry": {
    "accessor": "eventWaitlistEntry",
    "dbName": "EventWaitlistEntry",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "seatedAt",
        "irName": "seatedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "postalCode",
        "irName": "postalCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "venueId",
        "irName": "venueId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentValue",
        "irName": "currentValue",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "lastMaintenanceAt",
        "irName": "lastMaintenanceAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nextMaintenanceAt",
        "irName": "nextMaintenanceAt",
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
      }
    ]
  },
  "FacilitySchedule": {
    "accessor": "facilitySchedule",
    "dbName": "FacilitySchedule",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
      }
    ]
  },
  "FacilityWorkOrder": {
    "accessor": "facilityWorkOrder",
    "dbName": "FacilityWorkOrder",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "date",
        "irName": "date",
        "type": "DateTime",
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
        "name": "events",
        "irName": "events",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "inputDate",
        "irName": "inputDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "actualUsage",
        "irName": "actualUsage",
        "type": "Decimal",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "inventoryItemId",
        "irName": "inventoryItemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentLotNumber",
        "irName": "currentLotNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentLotReceivedAt",
        "irName": "currentLotReceivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentLotExpiresAt",
        "irName": "currentLotExpiresAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isRecalled",
        "irName": "isRecalled",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recallReason",
        "irName": "recallReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recalledAt",
        "irName": "recalledAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "interactionId",
        "irName": "interactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "uploadedBy",
        "irName": "uploadedBy",
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
        "name": "severity",
        "irName": "severity",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "thresholdValue",
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
        "optional": true,
        "hasDefault": true,
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
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "date",
        "irName": "date",
        "type": "DateTime",
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
        "name": "forecastDate",
        "irName": "forecastDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "projectedQuantity",
        "irName": "projectedQuantity",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "name": "publishedAt",
        "irName": "publishedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "name": "quantityReserved",
        "irName": "quantityReserved",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "name": "lastCountedAt",
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
        "name": "supplierNumber",
        "irName": "supplierNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "contactPerson",
        "irName": "contactPerson",
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
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "openPOCount",
        "irName": "openPOCount",
        "type": "Int",
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
        "name": "suspendedAt",
        "irName": "suspendedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suspendedReason",
        "irName": "suspendedReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blacklistedAt",
        "irName": "blacklistedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blacklistedReason",
        "irName": "blacklistedReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "qualificationStatus",
        "irName": "qualificationStatus",
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
      }
    ]
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
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "storageLocationId",
        "irName": "storageLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "transactionDate",
        "irName": "transactionDate",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reversedAt",
        "irName": "reversedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reversedBy",
        "irName": "reversedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reverseOfTransactionId",
        "irName": "reverseOfTransactionId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isReversed",
        "irName": "isReversed",
        "type": "Boolean",
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
        "name": "fromLocationId",
        "irName": "fromLocationId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "shippedBy",
        "irName": "shippedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "discrepancyNotes",
        "irName": "discrepancyNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hasDiscrepancy",
        "irName": "hasDiscrepancy",
        "type": "Boolean",
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
        "name": "items",
        "irName": "items",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "unitId",
        "irName": "unitId",
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
        "hasDefault": false,
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
        "name": "invoiceNumber",
        "irName": "invoiceNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "invoiceType",
        "irName": "invoiceType",
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
        "name": "clientId",
        "irName": "clientId",
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
        "hasDefault": true,
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
        "name": "depositPercentage",
        "irName": "depositPercentage",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "overdueSince",
        "irName": "overdueSince",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reminderCount",
        "irName": "reminderCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastReminderAt",
        "irName": "lastReminderAt",
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
        "name": "internalNotes",
        "irName": "internalNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "ruleId",
        "irName": "ruleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "value",
        "irName": "value",
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
        "name": "triggeredAt",
        "irName": "triggeredAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "type": "KitchenTaskStatus",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "optional": true,
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
        "name": "progressPct",
        "irName": "progressPct",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recordedAt",
        "irName": "recordedAt",
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
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
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
        "name": "viewCount",
        "irName": "viewCount",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "source",
        "irName": "source",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "convertedToClientId",
        "irName": "convertedToClientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
      }
    ]
  },
  "LogisticsDispatch": {
    "accessor": "logisticsDispatch",
    "dbName": "LogisticsDispatch",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "departedAt",
        "irName": "departedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
      }
    ]
  },
  "LogisticsRoute": {
    "accessor": "logisticsRoute",
    "dbName": "logistics_routes",
    "pgSchema": "tenant_logistics",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "vehicleId",
        "irName": "vehicleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "driverId",
        "irName": "driverId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalDistance",
        "irName": "totalDistance",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "totalDuration",
        "irName": "totalDuration",
        "type": "Int",
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
        "name": "actualStartTime",
        "irName": "actualStartTime",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "completedStops",
        "irName": "completedStops",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "delayMinutes",
        "irName": "delayMinutes",
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
        "name": "workOrderNumber",
        "irName": "workOrderNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "name": "equipmentId",
        "irName": "equipmentId",
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
        "name": "reportedBy",
        "irName": "reportedBy",
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
        "name": "totalCost",
        "irName": "totalCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "basePrice",
        "irName": "basePrice",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "isSeasonal",
        "irName": "isSeasonal",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonLabel",
        "irName": "seasonLabel",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "seasonYear",
        "irName": "seasonYear",
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
        "type": "MenuStatus",
        "isEnum": true,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
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
        "name": "priceOverride",
        "irName": "priceOverride",
        "type": "Decimal",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "MethodVideo": {
    "accessor": "methodVideo",
    "dbName": "method_videos",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "prepMethodId",
        "irName": "prepMethodId",
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
        "name": "durationSeconds",
        "irName": "durationSeconds",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "content",
        "irName": "content",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "optional": true,
        "hasDefault": true,
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
        "name": "recipientEmployeeId",
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
        "name": "notificationType",
        "irName": "notificationType",
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
        "name": "actionUrl",
        "irName": "actionUrl",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "correlationId",
        "irName": "correlationId",
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
        "hasDefault": true,
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
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "completedAt",
        "irName": "completedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "OnboardingTask": {
    "accessor": "onboardingTask",
    "dbName": "onboarding_tasks",
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
        "hasDefault": true,
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
      }
    ]
  },
  "OpenShift": {
    "accessor": "openShift",
    "dbName": "open_shifts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "claimedBy",
        "irName": "claimedBy",
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
        "name": "entityType",
        "irName": "entityType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "amount",
        "irName": "amount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "chargebackAt",
        "irName": "chargebackAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fraudStatus",
        "irName": "fraudStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "fraudScore",
        "irName": "fraudScore",
        "type": "Float",
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
        "name": "reviewedBy",
        "irName": "reviewedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "clientId",
        "irName": "clientId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "externalMethodId",
        "irName": "externalMethodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "cardLastFour",
        "irName": "cardLastFour",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardExpiryMonth",
        "irName": "cardExpiryMonth",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardExpiryYear",
        "irName": "cardExpiryYear",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "cardHolderName",
        "irName": "cardHolderName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bankAccountLastFour",
        "irName": "bankAccountLastFour",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bankAccountType",
        "irName": "bankAccountType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "bankRoutingNumber",
        "irName": "bankRoutingNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "walletProvider",
        "irName": "walletProvider",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "walletEmail",
        "irName": "walletEmail",
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
        "name": "fraudFlagged",
        "irName": "fraudFlagged",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "nickname",
        "irName": "nickname",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "payrollRunId",
        "irName": "payrollRunId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "optional": false,
        "hasDefault": true,
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
        "optional": false,
        "hasDefault": true,
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
        "name": "grossPay",
        "irName": "grossPay",
        "type": "Decimal",
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
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "hoursWorked",
        "irName": "hoursWorked",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "type": "PayrollPeriodStatus",
        "isEnum": true,
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
        "name": "payrollPeriodId",
        "irName": "payrollPeriodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "type": "PayrollRunStatus",
        "isEnum": true,
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
        "name": "rejectedBy",
        "irName": "rejectedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
      }
    ]
  },
  "PerformancePrediction": {
    "accessor": "performancePrediction",
    "dbName": "PerformancePrediction",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "reviewerId",
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
        "name": "reviewType",
        "irName": "reviewType",
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
        "optional": false,
        "hasDefault": false,
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
        "name": "employeeAcknowledgedAt",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "PrepListStatus",
        "isEnum": true,
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
        "hasDefault": true,
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
        "name": "isActive",
        "irName": "isActive",
        "type": "Boolean",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "PrepListImport": {
    "accessor": "prepListImport",
    "dbName": "prep_list_imports",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "source",
        "irName": "source",
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
        "name": "importedAt",
        "irName": "importedAt",
        "type": "DateTime",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "preparationNotes",
        "irName": "preparationNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "prepListId",
        "irName": "prepListId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "status",
        "irName": "status",
        "type": "PrepTaskStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "claimedBy",
        "irName": "claimedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "quantityUnitId",
        "irName": "quantityUnitId",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "dishId",
        "irName": "dishId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "status",
        "irName": "status",
        "type": "PrepTaskPlanWorkflowStatus",
        "isEnum": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "scheduleNumber",
        "irName": "scheduleNumber",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "name": "equipmentId",
        "irName": "equipmentId",
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
        "hasDefault": true,
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
        "name": "estimatedHours",
        "irName": "estimatedHours",
        "type": "Decimal",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "discountPercent",
        "irName": "discountPercent",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "utilizationPct",
        "irName": "utilizationPct",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "triggeredAt",
        "irName": "triggeredAt",
        "type": "DateTime",
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
        "name": "acknowledgedBy",
        "irName": "acknowledgedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "proposalNumber",
        "irName": "proposalNumber",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "type": "ProposalStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lineItemCount",
        "irName": "lineItemCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
      }
    ]
  },
  "ProposalDraft": {
    "accessor": "proposalDraft",
    "dbName": "proposal_drafts",
    "pgSchema": "tenant_crm",
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
        "hasDefault": true,
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
        "name": "draftId",
        "irName": "draftId",
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
        "name": "clientName",
        "irName": "clientName",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientEmail",
        "irName": "clientEmail",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "clientPhone",
        "irName": "clientPhone",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "eventSummary",
        "irName": "eventSummary",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "menuSections",
        "irName": "menuSections",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "servicePlan",
        "irName": "servicePlan",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "pricingBreakdown",
        "irName": "pricingBreakdown",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "timeline",
        "irName": "timeline",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "upgradeOptions",
        "irName": "upgradeOptions",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "visionSummary",
        "irName": "visionSummary",
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
        "name": "nextSteps",
        "irName": "nextSteps",
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
        "name": "magicToken",
        "irName": "magicToken",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "magicTokenExpiresAt",
        "irName": "magicTokenExpiresAt",
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
        "name": "sentVia",
        "irName": "sentVia",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "respondedAt",
        "irName": "respondedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositAmount",
        "irName": "depositAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "depositPaid",
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
        "name": "htmlContent",
        "irName": "htmlContent",
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
        "optional": false,
        "hasDefault": true,
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
        "optional": true,
        "hasDefault": true,
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
        "name": "totalPrice",
        "irName": "totalPrice",
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
        "name": "name",
        "irName": "name",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "optional": true,
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
        "hasDefault": true,
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
        "name": "itemCount",
        "irName": "itemCount",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "unitId",
        "irName": "unitId",
        "type": "Int",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "managerApprovalBy",
        "irName": "managerApprovalBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "itemCount",
        "irName": "itemCount",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "type": "QACheckStatus",
        "isEnum": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "QACorrectiveAction": {
    "accessor": "qACorrectiveAction",
    "dbName": "qa_corrective_actions",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "relatedCheckId",
        "irName": "relatedCheckId",
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
        "optional": false,
        "hasDefault": true,
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
        "name": "resolutionNotes",
        "irName": "resolutionNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedTo",
        "irName": "escalatedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalationReason",
        "irName": "escalationReason",
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
        "optional": false,
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
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "escalatedAt",
        "irName": "escalatedAt",
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
      }
    ]
  },
  "QATemperatureLog": {
    "accessor": "qATemperatureLog",
    "dbName": "qa_temperature_logs",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "equipmentId",
        "irName": "equipmentId",
        "type": "String",
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
        "hasDefault": false,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "sortOrder",
        "irName": "sortOrder",
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
        "name": "wasteFactor",
        "irName": "wasteFactor",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "cuisineType",
        "irName": "cuisineType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "status",
        "irName": "status",
        "type": "RecipeVersionStatus",
        "isEnum": true,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
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
        "name": "suggestedQuantity",
        "irName": "suggestedQuantity",
        "type": "Decimal",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "queryConfig",
        "irName": "queryConfig",
        "type": "Json",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "displayConfig",
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
        "name": "isShared",
        "irName": "isShared",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
      }
    ]
  },
  "SampleData": {
    "accessor": "sampleData",
    "dbName": "SampleData",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "seededAt",
        "irName": "seededAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "scheduleDate",
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
        "type": "ScheduleStatus",
        "isEnum": true,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
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
        "name": "publishedBy",
        "irName": "publishedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "shiftCount",
        "irName": "shiftCount",
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
        "name": "swapOfferedTo",
        "irName": "swapOfferedTo",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "swapStatus",
        "irName": "swapStatus",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "swapOfferedAt",
        "irName": "swapOfferedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "swapAcceptedAt",
        "irName": "swapAcceptedAt",
        "type": "DateTime",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "internalNotes",
        "irName": "internalNotes",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "SmsAutomationRule": {
    "accessor": "smsAutomationRule",
    "dbName": "sms_automation_rules",
    "pgSchema": "tenant_admin",
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
        "hasDefault": true,
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
        "name": "name",
        "irName": "name",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerType",
        "irName": "triggerType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "customMessage",
        "irName": "customMessage",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "recipientType",
        "irName": "recipientType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
      }
    ]
  },
  "StaffPerformance": {
    "accessor": "staffPerformance",
    "dbName": "StaffPerformance",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "acknowledgementNotes",
        "irName": "acknowledgementNotes",
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
      }
    ]
  },
  "StaffTrainingSignal": {
    "accessor": "staffTrainingSignal",
    "dbName": "staff_training_signals",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "signalType",
        "irName": "signalType",
        "type": "String",
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
        "hasDefault": true,
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
        "name": "inMaintenance",
        "irName": "inMaintenance",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maintenanceReason",
        "irName": "maintenanceReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maintenanceStartAt",
        "irName": "maintenanceStartAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "currentTaskCount",
        "irName": "currentTaskCount",
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
      }
    ]
  },
  "StorageLocation": {
    "accessor": "storageLocation",
    "dbName": "storage_locations",
    "pgSchema": "tenant_inventory",
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
        "hasDefault": true,
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
        "name": "storageType",
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
        "name": "temperatureZone",
        "irName": "temperatureZone",
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
      }
    ]
  },
  "TaskBundle": {
    "accessor": "taskBundle",
    "dbName": "task_bundles",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
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
        "name": "eventId",
        "irName": "eventId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "TaskBundleItem": {
    "accessor": "taskBundleItem",
    "dbName": "task_bundle_items",
    "pgSchema": "tenant_kitchen",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "taskBundleId",
        "irName": "taskBundleId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "kitchenTaskId",
        "irName": "kitchenTaskId",
        "type": "String",
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
        "name": "loggedAt",
        "irName": "loggedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "name": "minTemp",
        "irName": "minTemp",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
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
        "optional": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "assigneeId",
        "irName": "assigneeId",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "name": "employeeId",
        "irName": "employeeId",
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
        "name": "reason",
        "irName": "reason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "reviewedBy",
        "irName": "reviewedBy",
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
        "name": "rejectionReason",
        "irName": "rejectionReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "balanceSnapshot",
        "irName": "balanceSnapshot",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "balanceUnit",
        "irName": "balanceUnit",
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
        "name": "periodId",
        "irName": "periodId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "distributedAmount",
        "irName": "distributedAmount",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "distributedAt",
        "irName": "distributedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "distributedBy",
        "irName": "distributedBy",
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
        "name": "moduleCode",
        "irName": "moduleCode",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "moduleTitle",
        "irName": "moduleTitle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "staffRole",
        "irName": "staffRole",
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
        "name": "dueDateReviewNeeded",
        "irName": "dueDateReviewNeeded",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "firstShiftAt",
        "irName": "firstShiftAt",
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
        "name": "waivedAt",
        "irName": "waivedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "waiverReason",
        "irName": "waiverReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "waiverApprovedBy",
        "irName": "waiverApprovedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "attemptCount",
        "irName": "attemptCount",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastAttemptId",
        "irName": "lastAttemptId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastScorePercent",
        "irName": "lastScorePercent",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "passThresholdPercent",
        "irName": "passThresholdPercent",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxAttempts",
        "irName": "maxAttempts",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "managerReviewRequired",
        "irName": "managerReviewRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "reminderSentAt",
        "irName": "reminderSentAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "TrainingAttempt": {
    "accessor": "trainingAttempt",
    "dbName": "training_attempts",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "scorePercent",
        "irName": "scorePercent",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "passThresholdPercent",
        "irName": "passThresholdPercent",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "name": "managerReviewRequired",
        "irName": "managerReviewRequired",
        "type": "Boolean",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "answersJson",
        "irName": "answersJson",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "name": "code",
        "irName": "code",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "passThresholdPercent",
        "irName": "passThresholdPercent",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "maxAttempts",
        "irName": "maxAttempts",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "requiredRole",
        "irName": "requiredRole",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
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
        "name": "version",
        "irName": "version",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
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
        "name": "createdBy",
        "irName": "createdBy",
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
      }
    ]
  },
  "TrainingQuestion": {
    "accessor": "trainingQuestion",
    "dbName": "training_questions",
    "pgSchema": "tenant_staff",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "code",
        "irName": "code",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "sectionTitle",
        "irName": "sectionTitle",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "displayOrder",
        "irName": "displayOrder",
        "type": "Int",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "prompt",
        "irName": "prompt",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optionA",
        "irName": "optionA",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optionB",
        "irName": "optionB",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optionC",
        "irName": "optionC",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "optionD",
        "irName": "optionD",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "correctOptionKey",
        "irName": "correctOptionKey",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "explanation",
        "irName": "explanation",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "whyItMatters",
        "irName": "whyItMatters",
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
        "name": "authUserId",
        "irName": "authUserId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "employmentType",
        "irName": "employmentType",
        "type": "String",
        "isEnum": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "accuracyScore",
        "irName": "accuracyScore",
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
        "name": "adjustmentType",
        "irName": "adjustmentType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "rejectedBy",
        "irName": "rejectedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "name": "rootCause",
        "irName": "rootCause",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "generatedAt",
        "irName": "generatedAt",
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
      }
    ]
  },
  "Vendor": {
    "accessor": "vendor",
    "dbName": "Vendor",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "suspendedAt",
        "irName": "suspendedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "suspendedReason",
        "irName": "suspendedReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blacklistedAt",
        "irName": "blacklistedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": false,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "blacklistedReason",
        "irName": "blacklistedReason",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "lastContactAddedAt",
        "irName": "lastContactAddedAt",
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "name": "baseUnitCost",
        "irName": "baseUnitCost",
        "type": "Decimal",
        "isEnum": false,
        "isList": false,
        "optional": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "updatedAt",
        "irName": "updatedAt",
        "type": "DateTime",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "terminatedBy",
        "irName": "terminatedBy",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "hasDefault": false,
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
        "hasDefault": true,
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "ratedAt",
        "irName": "ratedAt",
        "type": "DateTime",
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
        "name": "name",
        "irName": "name",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "name": "stateProvince",
        "irName": "stateProvince",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": true,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "VersionApproval": {
    "accessor": "versionApproval",
    "dbName": "VersionApproval",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
      }
    ]
  },
  "VersionedEntity": {
    "accessor": "versionedEntity",
    "dbName": "VersionedEntity",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "name": "inventoryItemId",
        "irName": "inventoryItemId",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": true,
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
        "optional": true,
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
        "name": "name",
        "irName": "name",
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
        "hasDefault": true,
        "isUpdatedAt": false,
        "isId": false
      },
      {
        "name": "triggerType",
        "irName": "triggerType",
        "type": "String",
        "isEnum": false,
        "isList": false,
        "optional": false,
        "hasDefault": true,
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
        "hasDefault": false,
        "isUpdatedAt": true,
        "isId": false
      }
    ]
  },
  "WorkforceOptimization": {
    "accessor": "workforceOptimization",
    "dbName": "WorkforceOptimization",
    "pgSchema": "public",
    "pkFields": [
      "tenantId",
      "id"
    ],
    "whereAccessor": "tenantId_id",
    "hasDeletedAt": false,
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
        "hasDefault": false,
        "isUpdatedAt": true,
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
        "type": "WorkOrderStatus",
        "isEnum": true,
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
      }
    ]
  }
};
