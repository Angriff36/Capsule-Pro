# Migration: Admin Chat System (20260206023831)

## Overview

**Migration ID:** `20260206023831_repair_drift`
**Date:** 2026-02-06
**Purpose:** Create admin chat system for internal team communication

## Summary

Adds 3 tables to `tenant_admin` schema for a complete chat system with threads, participants, and messages. Supports direct messages, group chats, and channel-based communication.

### Schema Changes

| Table | Operation | Purpose |
|-------|-----------|---------|
| `admin_chat_threads` | Created | Chat threads/conversations |
| `admin_chat_participants` | Created | Thread membership |
| `admin_chat_messages` | Created | Individual messages |

## Table Structures

### 1. admin_chat_threads

**Purpose**: Represents a chat thread (direct message, group chat, or channel)

```sql
CREATE TABLE "tenant_admin"."admin_chat_threads" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_type" TEXT NOT NULL,  -- 'direct', 'group', 'channel'
    "slug" TEXT,  -- URL-friendly identifier for channels
    "direct_key" TEXT,  -- Unique key for direct messages (sorted user IDs)
    "created_by" UUID,  -- Thread creator
    "last_message_at" TIMESTAMPTZ(6),  -- Last activity timestamp
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_threads_pkey" PRIMARY KEY ("tenant_id","id")
);
```

**Indexes:**
- `admin_chat_thread_type_idx` - Filter by thread type
- `admin_chat_thread_last_message_idx` - Sort by activity
- `admin_chat_thread_slug_unique` - Unique slug per tenant
- `admin_chat_thread_direct_key_unique` - Prevent duplicate DMs
- `admin_chat_threads_active_idx` - Filter active threads

### 2. admin_chat_participants

**Purpose**: Tracks thread membership and per-user thread state

```sql
CREATE TABLE "tenant_admin"."admin_chat_participants" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(6),  -- User archived this thread
    "cleared_at" TIMESTAMPTZ(6),  -- User cleared message history
    "last_read_at" TIMESTAMPTZ(6),  -- Last time user read thread
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_participants_pkey" PRIMARY KEY ("tenant_id","id")
);
```

**Indexes:**
- `admin_chat_participant_user_idx` - Find user's threads
- `admin_chat_participant_thread_idx` - Find thread participants
- `admin_chat_participant_archived_idx` - Filter archived threads
- `admin_chat_participant_unique` - One participant record per user+thread
- `admin_chat_participants_active_idx` - Filter active participants

### 3. admin_chat_messages

**Purpose**: Individual messages within threads

```sql
CREATE TABLE "tenant_admin"."admin_chat_messages" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,  -- Denormalized for performance
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_messages_pkey" PRIMARY KEY ("tenant_id","id")
);
```

**Indexes:**
- `admin_chat_message_thread_created_idx` - Load messages chronologically
- `admin_chat_message_author_idx` - Filter by author
- `admin_chat_message_active_idx` - Filter active messages (multi-column)
- `admin_chat_messages_active_only_idx` - Filter active messages (simple)

## Chat System Patterns

### Thread Types

**Direct Messages (`thread_type='direct'`):**
- Two participants only
- `direct_key` = sorted user IDs (e.g., "uuid1_uuid2")
- Prevents duplicate DM threads
- Private 1-on-1 conversation

**Group Chats (`thread_type='group'`):**
- Multiple participants (3+)
- Created ad-hoc for team collaboration
- No slug (identified by ID only)

**Channels (`thread_type='channel'`):**
- Public or private channels
- Has `slug` for URL routing (e.g., "/chat/general")
- Any team member can join
- Organized by topic/project

### Read Receipts & Unread Counts

**Tracking Unread:**
```sql
-- Count unread messages for user
SELECT COUNT(*)
FROM admin_chat_messages m
JOIN admin_chat_participants p
    ON p.thread_id = m.thread_id
    AND p.user_id = :user_id
WHERE m.created_at > COALESCE(p.last_read_at, '1970-01-01')
  AND m.author_id != :user_id
  AND m.deleted_at IS NULL
```

**Updating Read Status:**
```sql
UPDATE admin_chat_participants
SET last_read_at = NOW()
WHERE thread_id = :thread_id AND user_id = :user_id
```

### Archive & Clear

**Archive Thread** (hide from inbox):
```sql
UPDATE admin_chat_participants
SET archived_at = NOW()
WHERE thread_id = :thread_id AND user_id = :user_id
```

**Clear History** (mark all as read, hide old messages):
```sql
UPDATE admin_chat_participants
SET cleared_at = NOW(), last_read_at = NOW()
WHERE thread_id = :thread_id AND user_id = :user_id
```

## ⚠️ RLS Policies Included (NOT IN USE)

This migration includes extensive Row Level Security (RLS) policies and triggers. **IMPORTANT: These are NOT actually used in production.**

**Included but unused:**
- RLS policies for all 3 tables (SELECT, INSERT, UPDATE, DELETE)
- `auth.jwt()` tenant isolation (Supabase pattern)
- Service role bypass policies
- Triggers for `fn_update_timestamp()` and `fn_prevent_tenant_mutation()`

**Why they're here:**
- Leftover from Supabase template
- Copy-pasted pattern from other tables
- Not harmful (just ignored)

**Actual security:**
- Clerk handles authentication and tenant isolation
- Application-level access control
- No database-level RLS enforcement

**Future cleanup:**
- Remove all RLS policies in future migration
- Remove unused trigger assignments
- See `KNOWN_ISSUES.md` for tracking

## Use Cases

### Internal Team Communication

**Scenario 1: Direct Message**
1. User A wants to DM User B
2. Check if DM thread exists using `direct_key`
3. If not, create thread with `thread_type='direct'`
4. Add both users as participants
5. Send message

**Scenario 2: Event Planning Channel**
1. Create channel with `slug='event-planning'`, `thread_type='channel'`
2. Add team members as participants
3. Messages posted to thread
4. New team members can join anytime

**Scenario 3: Incident Response Group**
1. On-call manager creates group chat
2. Adds relevant staff as participants
3. Real-time coordination during incident
4. Archive thread when resolved

## Impact

### Application

- Internal admin team chat functionality
- Real-time communication infrastructure
- Read receipts and unread count support
- Archive and clear message history

### Performance

- Denormalized `author_name` reduces JOIN overhead
- Indexes optimized for common query patterns
- Composite indexes for tenant isolation + filtering
- GIN indexes could be added for full-text search (future)

### Realtime Integration

- Ably can subscribe to thread_id for live updates
- Outbox pattern for message delivery
- Presence indicators via Liveblocks
- Typing indicators via websocket events

## Related Migrations

- **Previous**: `20260205000000_admin_tasks`
- **Next**: None (latest migration)

## TODO

- [ ] Remove unused RLS policies and triggers
- [ ] Add foreign key constraints:
  - `threads.created_by` → `employees.id`
  - `participants.user_id` → `employees.id`
  - `participants.thread_id` → `threads.id`
  - `messages.thread_id` → `threads.id`
  - `messages.author_id` → `employees.id`
- [ ] Consider adding message reactions table
- [ ] Consider adding file attachments support
- [ ] Add full-text search indexes on message text

---

Last updated: 2026-02-06
