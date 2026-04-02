# cp-enh-inventory-barcode: Add barcode scanner to Inventory

## Context
- html5-qrcode already installed
- barcode-scanner.tsx already exists as a proper React component (not a hook)
- scanner page does NOT exist yet

## Plan

### Step 1: Verify barcode-scanner.tsx
File: `apps/app/app/(authenticated)/inventory/components/barcode-scanner.tsx`
- Already a proper React component with `'use client'`, `onScan`, `onError` props ✓
- Already has start/stop buttons, error state ✓
- MISSING: does NOT display last scanned barcode — needs `lastScannedBarcode` state + UI
- Add: display of last scanned barcode below scanner

### Step 2: Create scanner page
File: `apps/app/app/(authenticated)/inventory/scanner/page.tsx`
- 'use client' component
- Two modes: "Lookup" and "Stock Count" (toggle tabs)
- Lookup mode: scan → `/api/inventory/items?barcode=<code>` lookup → show result card
- Stock Count mode: scan → add to local list → quantity input → submit batch
- Show scan history (last 10 scans)
- Use shadcn: Card, Button, Input, Badge, Table, Tabs

### Step 3: Add nav link
File: `apps/app/app/(authenticated)/components/module-nav.ts`
- Add `{ title: "Scanner", href: "/inventory/scanner" }` to inventory sidebar items

### Step 4: Check barcode field
- Already exists in DB: `"barcode" TEXT` in migration 0_init (line 1061)
- NO migration needed

### Step 5: TypeScript check
- Run `cd .../capsule-pro && npx tsc --noEmit`

## Files to modify/create
1. `apps/app/app/(authenticated)/inventory/components/barcode-scanner.tsx` — add lastScannedBarcode display
2. `apps/app/app/(authenticated)/inventory/scanner/page.tsx` — create new
3. `apps/app/app/(authenticated)/components/module-nav.ts` — add nav link
