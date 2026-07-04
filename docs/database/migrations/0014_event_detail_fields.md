# Migration: Add Event Detail Fields (20260201000000)

## Overview

**Migration ID:** `20260201000000_event_detail_fields`
**Date:** 2026-02-01
**Purpose:** Add additional detail fields to events table for enhanced event information

## Summary

Adds 5 new columns to the `tenant_events.events` table to support richer event metadata including ticketing, format, accessibility, and media.

### Schema Changes

| Table | Changes |
|-------|---------|
| `tenant_events.events` | Added 5 new columns |

## Changes

### tenant_events.events

**New Columns Added:**

1. `ticket_price` - `DECIMAL(10, 2)` - Optional ticket price for paid events
2. `ticket_tier` - `TEXT` - Ticket tier/category (e.g., "VIP", "General", "Early Bird")
3. `event_format` - `TEXT` - Event format type (e.g., "in-person", "virtual", "hybrid")
4. `accessibility_options` - `TEXT[]` - Array of accessibility features available
5. `featured_media_url` - `TEXT` - URL to featured image/video for event

### SQL

```sql
ALTER TABLE "tenant_events"."events"
  ADD COLUMN "ticket_price" DECIMAL(10, 2),
  ADD COLUMN "ticket_tier" TEXT,
  ADD COLUMN "event_format" TEXT,
  ADD COLUMN "accessibility_options" TEXT[],
  ADD COLUMN "featured_media_url" TEXT;
```

## Use Cases

- **Ticketing**: Track ticket prices and tier levels for event registration
- **Format**: Distinguish between in-person, virtual, and hybrid events
- **Accessibility**: Document wheelchair access, ASL interpreters, closed captions, etc.
- **Media**: Store promotional images or preview videos for marketing

## Impact

### Data

- **Backward compatible**: All new columns are nullable
- **No data migration**: New columns added without defaults
- **No existing data affected**

### Application

- Event creation/update forms can now capture additional details
- Event listings can display ticket pricing and format
- Accessibility information improves inclusivity
- Featured media enhances event promotion

## Related Migrations

- **Previous**: `20260129120004_add_deleted_at_to_event_imports`
- **Next**: `20260201010000_add_recipe_version_instructions`

---

Last updated: 2026-02-01
