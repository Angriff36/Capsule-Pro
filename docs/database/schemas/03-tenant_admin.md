# tenant_admin Schema

**Schema Name:** `tenant_admin`
**Purpose:** Administrative reporting, workflows, notifications, and permission management
**Tables:** 11 tables + 3 enums

## Overview

The `tenant_admin` schema provides the administrative layer for tenant operations, enabling self-service reporting, workflow automation, notification management, and granular access control. Unlike operational schemas (tenant_kitchen, tenant_events, etc.), admin tables persist metadata and configuration even when operational data is deleted.

## Purpose

### Core Capabilities

1. **Self-Service Reporting**
   - Custom report generation with configurable queries and displays
   - Scheduled report generation and distribution
   - Report history tracking and output management
   - System and user-defined report templates

2. **Workflow Automation**
   - Trigger-based workflows (event, schedule, manual)
   - Multi-step workflow execution with error handling
   - Workflow step configuration (success/failure branching)
   - Execution logging and monitoring

3. **Notification System**
   - Multi-channel notifications (in-app, email, SMS)
   - Per-employee notification preferences
   - Read/unread tracking
   - Correlation ID for notification grouping

4. **Access Control & Audit**
   - Role-based permissions (RBAC)
   - Admin user management with security features
   - Comprehensive audit trail
   - Account-level security controls

## Goals

1. **Administrative Independence**: Admin tables maintain their data lifecycle separate from operational tables, enabling reports and workflows to reference deleted operational data if needed.

2. **Multi-Tenant Security**: Admin tables enforce additional RLS policies beyond standard tenant isolation, protecting sensitive administrative functions.

3. **Self-Service Configuration**: Users can create reports, schedule workflows, and manage notifications without developer intervention.

4. **Comprehensive Audit Trail**: All administrative actions are logged with context (IP, user agent, old/new values).

5. **Performance Optimization**: Admin queries can be resource-intensive (report generation, workflow execution) and are optimized with appropriate indexes.

## Tables

### Reporting Tables

#### Report

Self-service reporting definitions with configurable queries and visualizations.

**Primary Key:** `(tenantId, id)`

**Fields:**
- `tenantId` (UUID): Tenant account reference
- `id` (UUID): Unique report identifier
- `name` (String): Report name (e.g., "Weekly Sales Summary")
- `description` (String?, optional): Report description
- `reportType` (String): Type of report (e.g., "sales", "inventory", "staffing")
- `query_config` (JSON): Query definition (SQL, filters, parameters)
- `display_config` (JSON, default `{}`): Visualization config (charts, tables, formatting)
- `is_system` (Boolean, default `false`): System reports cannot be deleted
- `created_by` (UUID?, optional): User who created the report
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenantId, id)`

**Relations:**
- `tenant` → `Account` (many-to-one)

**Rules:**
- System reports (`is_system = true`) cannot be deleted
- `query_config` must contain valid query structure
- `display_config` validates against supported visualization types

**Example:**
```json
{
  "name": "Daily Revenue Report",
  "reportType": "financial",
  "query_config": {
    "sql": "SELECT SUM(amount) FROM tenant_events.events WHERE date = :date",
    "parameters": ["date"]
  },
  "display_config": {
    "type": "line_chart",
    "xAxis": "date",
    "yAxis": "revenue"
  }
}
```

#### report_history

Historical record of report generation, including outputs and execution metadata.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique history entry identifier
- `report_id` (UUID): Reference to Report
- `schedule_id` (UUID?, optional): Reference to report_schedules if scheduled
- `generated_by` (UUID?, optional): User who triggered generation
- `generated_at` (Timestamptz): Generation timestamp
- `output_format` (String): Format type (PDF, CSV, Excel, JSON)
- `file_url` (String?, optional): Storage URL for generated file
- `file_size_bytes` (BigInt?, optional): File size in bytes
- `parameters` (JSON, default `{}`): Parameters used for generation
- `created_at` (Timestamptz): Creation timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`
- `report_history_generated_at_idx` on `(tenant_id, generated_at DESC)`
- `report_history_tenant_report_idx` on `(tenant_id, report_id)`

**Relations:**
- `report_id` → `Report` (many-to-one, logical)

**Rules:**
- Generated files retained per retention policy (typically 90 days)
- Large reports (>10MB) require explicit cleanup

**Performance:**
- Index on `generated_at DESC` supports time-based cleanup queries
- Composite index on `(tenant_id, report_id)` optimizes report history lookups

#### report_schedules

Automated report generation schedules with cron expressions and distribution.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique schedule identifier
- `report_id` (UUID): Reference to Report
- `schedule_cron` (String): Cron expression (e.g., "0 9 * * MON" for Monday 9am)
- `output_format` (String, default `"pdf"`): Format type
- `recipients` (JSON, default `[]`): List of recipient email addresses
- `is_active` (Boolean, default `true`): Schedule active flag
- `last_run_at` (Timestamptz?, optional): Last execution timestamp
- `next_run_at` (Timestamptz?, optional): Next scheduled execution
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`
- `report_schedules_tenant_report_idx` on `(tenant_id, report_id)`

**Relations:**
- `report_id` → `Report` (many-to-one, logical)

**Rules:**
- Cron expression must be valid (5-field standard)
- Recipients must be valid email addresses
- `next_run_at` computed from `schedule_cron` on creation/update

**Example:**
```json
{
  "schedule_cron": "0 9 * * MON",
  "output_format": "pdf",
  "recipients": ["manager@example.com", "finance@example.com"]
}
```

### Workflow Tables

#### Workflow

Workflow definitions for automating multi-step business processes.

**Primary Key:** `(tenantId, id)`

**Fields:**
- `tenantId` (UUID): Tenant account reference
- `id` (UUID): Unique workflow identifier
- `name` (String): Workflow name (e.g., "Event Approval Process")
- `description` (String?, optional): Workflow description
- `trigger_type` (String): Trigger type (event, schedule, manual, webhook)
- `triggerConfig` (JSON, default `{}`): Trigger configuration
- `isActive` (Boolean, default `true`): Workflow active flag
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenantId, id)`
- `workflows_tenant_idx` on `(tenantId)`

**Relations:**
- `tenant` → `Account` (many-to-one)

**Trigger Types:**
- `event`: Triggered by domain events (e.g., event created)
- `schedule`: Time-based trigger (cron)
- `manual`: Triggered by user action
- `webhook`: Triggered by external webhook

**Example:**
```json
{
  "name": "New Event Onboarding",
  "trigger_type": "event",
  "triggerConfig": {
    "eventType": "event.created",
    "filters": {
      "event_type": "wedding"
    }
  }
}
```

#### workflow_executions

Workflow execution instances with status tracking and logging.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique execution identifier
- `workflow_id` (UUID): Reference to Workflow
- `triggered_by` (UUID?, optional): User who triggered execution
- `trigger_data` (JSON?, optional): Data that triggered workflow
- `status` (String, default `"running"`): Execution status (running, completed, failed, cancelled)
- `current_step_id` (UUID?, optional): Currently executing step
- `started_at` (Timestamptz): Execution start timestamp
- `completed_at` (Timestamptz?, optional): Execution completion timestamp
- `error_message` (String?, optional): Error details if failed
- `execution_log` (JSON, default `[]`): Step execution log
- `created_at` (Timestamptz): Creation timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`
- `workflow_executions_status_idx` on `(tenant_id, status)`
- `workflow_executions_workflow_idx` on `(tenant_id, workflow_id)`

**Relations:**
- `workflow_id` → `Workflow` (many-to-one, logical)
- `current_step_id` → `workflow_steps` (many-to-one, logical)

**Status Values:**
- `running`: Currently executing
- `completed`: All steps executed successfully
- `failed`: Execution failed (check `error_message`)
- `cancelled`: Execution cancelled by user

**Performance:**
- Index on `status` supports monitoring active workflows
- Index on `workflow_id` optimizes execution history queries

#### workflow_steps

Individual workflow steps with configuration and branching logic.

**Primary Key:** `(tenant_id, id)`

**Unique Constraint:** `(tenant_id, workflow_id, step_number)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique step identifier
- `workflow_id` (UUID): Reference to Workflow
- `step_number` (SmallInt): Step order within workflow (0-indexed)
- `step_type` (String): Step type (task, approval, notification, delay, condition)
- `step_config` (JSON, default `{}`): Step-specific configuration
- `on_success_step_id` (UUID?, optional): Next step on success
- `on_failure_step_id` (UUID?, optional): Next step on failure
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`
- `workflow_steps_workflow_number_idx` unique on `(tenant_id, workflow_id, step_number)`
- `workflow_steps_workflow_idx` on `(tenant_id, workflow_id)`

**Relations:**
- `workflow_id` → `Workflow` (many-to-one, logical)
- `on_success_step_id` → `workflow_steps` (self-referential, logical)
- `on_failure_step_id` → `workflow_steps` (self-referential, logical)

**Step Types:**
- `task`: Execute a task (e.g., send email, create record)
- `approval`: Require user approval
- `notification`: Send notification
- `delay`: Wait for specified duration
- `condition`: Branch based on condition evaluation

**Example:**
```json
{
  "step_number": 0,
  "step_type": "approval",
  "step_config": {
    "role": "finance_manager",
    "timeout_hours": 24
  },
  "on_success_step_id": "step-1-id",
  "on_failure_step_id": "step-2-id"
}
```

### Notification Tables

#### Notification

Multi-channel notifications with read/unread tracking.

**Primary Key:** `(tenantId, id)`

**Fields:**
- `tenantId` (UUID): Tenant account reference
- `id` (UUID): Unique notification identifier
- `recipient_employee_id` (UUID): Employee receiving notification
- `notification_type` (String): Type (alert, reminder, update, approval)
- `title` (String): Notification title
- `body` (String?, optional): Notification body text
- `action_url` (String?, optional): Deep link to related resource
- `isRead` (Boolean, default `false`): Read status
- `readAt` (Timestamptz?, optional): Marked read timestamp
- `createdAt` (Timestamptz): Creation timestamp
- `correlation_id` (String?, optional): Group related notifications

**Indexes:**
- Primary key index on `(tenantId, id)`
- `notifications_created_at_idx` on `(tenantId, createdAt DESC)`
- `notifications_recipient_read_idx` on `(tenantId, recipient_employee_id, isRead)`

**Relations:**
- `tenant` → `Account` (many-to-one)

**Notification Types:**
- `alert`: Urgent alerts (e.g., "Event deadline approaching")
- `reminder`: Scheduled reminders (e.g., "Shift starts in 1 hour")
- `update`: Informational updates (e.g., "Menu updated")
- `approval`: Approval requests (e.g., "Time off approval needed")

**Performance:**
- Index on `(createdAt DESC)` supports notification list queries
- Composite index on `(recipient_employee_id, isRead)` optimizes unread counts

#### notification_preferences

Per-employee notification preferences by type and channel.

**Primary Key:** `(tenant_id, id)`

**Unique Constraint:** `(tenant_id, employee_id, notification_type, channel)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique preference identifier
- `employee_id` (UUID): Employee reference
- `notification_type` (String): Type (alert, reminder, update, approval)
- `channel` (String): Channel (in_app, email, sms)
- `is_enabled` (Boolean, default `true`): Channel enabled flag
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`
- Unique constraint on `(tenant_id, employee_id, notification_type, channel)`

**Channels:**
- `in_app`: In-app notifications
- `email`: Email notifications
- `sms`: SMS notifications

**Default Preferences:**
- All channels enabled by default for new employees
- Employees can opt-out of non-critical notifications

### Access Control Tables

#### admin_audit_trail

Comprehensive audit trail for all administrative actions.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique audit entry identifier
- `admin_user_id` (UUID): Admin user who performed action
- `entity_type` (admin_entity_type): Entity type affected
- `entity_id` (UUID?, optional): Specific entity ID affected
- `action` (admin_action): Action performed
- `description` (String?, optional): Action description
- `changes` (JSON?, optional): Summary of changes
- `old_values` (JSON?, optional): Values before change
- `new_values` (JSON?, optional): Values after change
- `ip_address` (Inet?, optional): IP address of request
- `user_agent` (String?, optional): Browser/client user agent
- `created_at` (Timestamptz): Audit entry timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`

**Actions Tracked:**
- `login` / `logout`: Authentication events
- `create` / `update` / `delete`: CRUD operations
- `view`: Sensitive data access
- `permission_change` / `role_change`: Authorization changes
- `account_change` / `security_change`: Security settings

**Retention:**
- Audit logs retained for minimum 1 year
- Cannot be soft deleted (compliance requirement)

#### admin_permissions

Granular permissions for access control.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique permission identifier
- `permission_name` (String): Permission name (e.g., "reports.create")
- `resource` (String): Resource type (e.g., "reports", "workflows")
- `action` (String): Action (e.g., "create", "read", "update", "delete")
- `description` (String): Permission description
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`

**Permission Naming:**
- Format: `{resource}.{action}` (e.g., "reports.create", "users.update")

#### admin_roles

Role definitions with associated permissions.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique role identifier
- `role_name` (admin_role): Role name (enum)
- `description` (String?, optional): Role description
- `permissions` (JSON?, default `[]`): Array of permission IDs
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`

**Built-in Roles:**
- `super_admin`: Full system access
- `tenant_admin`: Administrative access
- `finance_manager`: Financial reports and settings
- `operations_manager`: Operational oversight
- `staff_manager`: Staff scheduling and management
- `read_only`: Read-only access

**Permissions Format:**
```json
["permission-id-1", "permission-id-2", "permission-id-3"]
```

#### admin_users

Administrative users with security features and role assignments.

**Primary Key:** `(tenant_id, id)`

**Fields:**
- `tenant_id` (UUID): Tenant account reference
- `id` (UUID): Unique admin user identifier
- `auth_user_id` (UUID): Reference to authentication system (Clerk)
- `role_id` (UUID): Reference to admin_roles
- `is_active` (Boolean, default `true`): Account active flag
- `last_login` (Timestamptz?, optional): Last successful login
- `last_failed_login` (Timestamptz?, optional): Last failed login attempt
- `failed_login_attempts` (SmallInt, default `0`): Failed login count
- `locked_until` (Timestamptz?, optional): Account locked until timestamp
- `two_factor_enabled` (Boolean, default `false`): 2FA enabled flag
- `two_factor_secret` (String?, optional): 2FA secret (encrypted)
- `login_ip` (String?, optional): Last login IP address
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?, optional): Soft delete timestamp

**Indexes:**
- Primary key index on `(tenant_id, id)`

**Security Features:**
- Account lockout after 5 failed login attempts (15 minute lock)
- 2FA support for sensitive roles
- Last login tracking for anomaly detection

**Relations:**
- `role_id` → `admin_roles` (many-to-one, logical)
- `auth_user_id` → Authentication system (Clerk)

## Enums

### admin_action

Actions tracked in audit trail.

**Values:**
- `login`: User login
- `logout`: User logout
- `create`: Entity creation
- `update`: Entity update
- `delete`: Entity deletion
- `view`: Sensitive data access
- `permission_change`: Permission modification
- `role_change`: Role assignment change
- `account_change`: Account settings change
- `security_change`: Security settings change

### admin_entity_type

Entity types affected in admin operations.

**Values:**
- `admin_users`: Admin user entities
- `admin_roles`: Role entities
- `admin_permissions`: Permission entities
- `admin_audit_trail`: Audit log entries
- `users`: Standard users
- `roles`: Standard roles
- `permissions`: Standard permissions
- `tenants`: Tenant accounts
- `reports`: Report definitions
- `settings`: System settings

### admin_role

Built-in administrative roles.

**Values:**
- `super_admin`: Full system access, can manage tenants
- `tenant_admin`: Full tenant access, can manage users
- `finance_manager`: Financial reports and budget access
- `operations_manager`: Operational oversight and reporting
- `staff_manager`: Staff scheduling and HR functions
- `read_only`: Read-only access to all modules

## Rules

### General Rules

1. **Tenant Isolation**: All tables include `tenant_id` for multi-tenancy
2. **Soft Deletes**: Most tables support soft deletes via `deletedAt`
3. **Audit Trail**: Admin tables have additional audit logging beyond standard tables
4. **RLS Policies**: Admin tables enforce stricter RLS policies than operational tables

### Access Control Rules

1. **Admin-Only Access**: Admin tables restricted to users with `admin_users` records
2. **Role-Based Permissions**: All operations checked against `admin_permissions`
3. **Audit Requirement**: All admin changes logged to `admin_audit_trail`
4. **Separation of Duties**: Admin users separate from operational users

### Reporting Rules

1. **System Reports**: System reports (`is_system = true`) cannot be deleted
2. **Report Retention**: Report history retained per retention policy (default 90 days)
3. **Query Validation**: Report queries validated before execution (SQL injection protection)
4. **Output Limits**: Reports limited to 100k rows (configurable per tenant)

### Workflow Rules

1. **Active Workflows**: Only `isActive = true` workflows are triggered
2. **Execution Limits**: Max 100 concurrent workflow executions per tenant
3. **Step Limits**: Max 50 steps per workflow
4. **Timeout**: Workflow execution timeout after 1 hour
5. **Retry Logic**: Failed steps retry up to 3 times with exponential backoff

### Notification Rules

1. **Preference Respect**: Notifications only sent if `notification_preferences` enabled
2. **Read Tracking**: `isRead` status updated when notification opened
3. **Correlation**: Notifications with same `correlation_id` grouped in UI
4. **Retention**: Notifications retained for 90 days, then archived

## Decisions

### 1. Separate Admin Schema

**Decision:** Admin tables placed in separate `tenant_admin` schema rather than mixing with operational tables.

**Rationale:**
- Clear separation of concerns (admin vs operational)
- Stricter access control policies
- Different data lifecycle (admin data persists longer)
- Easier to apply admin-specific indexes and constraints

### 2. Admin User Separation

**Decision:** Admin users stored in `admin_users` table, separate from standard users.

**Rationale:**
- Different security requirements (2FA, lockout policies)
- Role-based access control needs special handling
- Audit trail requires admin-specific tracking
- Prevents privilege escalation from operational accounts

### 3. JSON Config Storage

**Decision:** Report queries, workflow configs, and notification preferences stored as JSON.

**Rationale:**
- Flexibility for user-defined configurations
- Schema-less storage for dynamic structures
- Easy to add new config options without migrations
- Trade-off: Less strict validation at database level

### 4. Notification Preference Granularity

**Decision:** Preferences at `(employee_id, notification_type, channel)` granularity.

**Rationale:**
- Allows employees to opt-in/opt-out per channel
- Enables different channels for different notification types
- Example: SMS for urgent alerts, email for reports, in-app for updates

### 5. Workflow Step Branching

**Decision:** Steps support branching with `on_success_step_id` and `on_failure_step_id`.

**Rationale:**
- Enables complex workflow logic (conditionals, error handling)
- Non-linear workflow execution
- Easy to implement approval/rejection flows
- Trade-off: More complex execution engine

## Relations

### Cross-Schema Relations

Admin tables can reference tables in other schemas:

1. **Report Queries**: Can reference any tenant schema table
2. **Workflow Triggers**: Can subscribe to events from any schema
3. **Notifications**: Can reference employees from `tenant_staff`
4. **Audit Trail**: Tracks changes across all schemas

### Internal Relations

```
Account (public)
  ├─ 1:N → Report
  ├─ 1:N → Workflow
  └─ 1:N → Notification

Report
  └─ 1:N → report_history
  └─ 1:N → report_schedules

Workflow
  └─ 1:N → workflow_steps
  └─ 1:N → workflow_executions

workflow_steps
  └─ N:1 → workflow_steps (self-referential, branching)

workflow_executions
  └─ N:1 → workflow_steps (current step)

admin_roles
  └─ 1:N → admin_users

admin_permissions
  └─ N:M → admin_roles (via JSON array)
```

## Lifecycle

### Data Lifecycle

1. **Creation**: Admin records created by users with appropriate permissions
2. **Active Use**: Records actively used (e.g., reports generated, workflows executed)
3. **Deletion**: Soft delete (`deletedAt`) for most tables
4. **Archival**: Old reports, notifications, and audit logs archived after retention period
5. **Purge**: Hard deletion after archival retention period (typically 7 years)

### Special Cases

1. **Audit Trail**: Cannot be deleted (compliance requirement)
2. **System Reports**: Cannot be soft deleted
3. **Active Workflows**: Cannot be deleted if executions exist
4. **Admin Users**: Soft deleted but audit trail preserved

## Performance

### Optimization Strategies

1. **Indexes**:
   - Report history indexed on `generated_at DESC` for time-based queries
   - Notifications indexed on `recipient_employee_id, isRead` for unread counts
   - Workflow executions indexed on `status` for monitoring

2. **Query Patterns**:
   - Report generation can be heavy (consider async execution)
   - Workflow execution should be offloaded to background workers
   - Notification delivery should use batching

3. **Data Retention**:
   - Report history auto-purged after 90 days
   - Notifications auto-purged after 90 days
   - Audit logs archived after 1 year

4. **Caching**:
   - Report definitions cached (frequent access)
   - Notification preferences cached (checked on every notification)
   - Admin roles/permissions cached (checked on every admin request)

### Monitoring

Key metrics to monitor:
- Report generation duration (p95 < 30s)
- Workflow execution success rate (>99%)
- Notification delivery latency (p95 < 5s)
- Audit log storage growth (alert if >10GB/month)

## TODOs

### Immediate (Required for MVP)

- [ ] Implement report query validation (SQL injection protection)
- [ ] Create workflow execution engine with retry logic
- [ ] Build notification delivery service (email, SMS, in-app)
- [ ] Implement admin authentication and authorization middleware

### Short Term (Quality Gates)

- [ ] Add report generation performance tests
- [ ] Create workflow execution monitoring dashboard
- [ ] Implement notification preference UI
- [ ] Add audit log search and export functionality

### Medium Term (Enhancements)

- [ ] Add report templates (pre-built common reports)
- [ ] Implement workflow visual editor (drag-and-drop)
- [ ] Add notification batching and throttling
- [ ] Create admin activity dashboard with anomaly detection

### Long Term (Advanced Features)

- [ ] AI-powered report insights and recommendations
- [ ] Workflow marketplace (pre-built workflow templates)
- [ ] Advanced notification rules (time-based, location-based)
- [ ] Automated admin user provisioning/deprovisioning

## Migration Notes

### Schema Creation

```sql
-- Create tenant_admin schema
CREATE SCHEMA IF NOT EXISTS tenant_admin;

-- Set search path for admin operations
SET search_path TO tenant_admin, public, core;
```

### RLS Policies

All admin tables require RLS policies:

```sql
-- Enable RLS
ALTER TABLE tenant_admin.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view admin users
CREATE POLICY admin_users_view_policy ON tenant_admin.admin_users
  FOR SELECT
  TO authenticated_users
  USING (
    EXISTS (
      SELECT 1 FROM tenant_admin.admin_users
      WHERE admin_users.auth_user_id = current_user_id()
      AND admin_users.tenant_id = admin_users.tenant_id
    )
  );
```

### Migration Safety

- Admin tables added after initial schema migration
- No breaking changes to existing tables
- Backward compatible with existing operational schemas

## References

- **Platform Schema**: `docs/database/schemas/00-platform.md`
- **Core Schema**: `docs/database/schemas/01-core.md`
- **Staff Schema**: `docs/database/schemas/05-tenant_staff.md`
- **Kitchen Schema**: `docs/database/schemas/06-tenant_kitchen.md`
- **Events Schema**: `docs/database/schemas/07-tenant_events.md`

## Changelog

### 2026-01-29
- Initial schema documentation created
- Documented all 11 admin tables + 3 enums
- Added rules, decisions, lifecycle, and performance sections
