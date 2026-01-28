-- Move internal tables/enums out of public schema.
alter type "public"."KitchenTaskPriority" set schema core;
alter type "public"."KitchenTaskStatus" set schema core;
alter type "public"."OutboxStatus" set schema core;
alter type "public"."UserRole" set schema core;
alter type "public"."ShipmentStatus" set schema core;

alter table "public"."OutboxEvent" set schema tenant;
alter table "public"."Tenant" set schema platform;
