# Dead / suspicious button audit

Scanned roots: apps, packages

Findings: 107

## HIGH — apps/app/app/(authenticated)/administrative/trash/components/trash-page-client.tsx:394

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Refresh

```tsx
<button type="button">
```

## HIGH — apps/app/app/(authenticated)/analytics/components/activity-feed-client.tsx:230

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: View All

```tsx
<Button className="h-7 text-xs" size="sm" variant="ghost">
```

## HIGH — apps/app/app/(authenticated)/command-board/[id]/board-canvas.tsx:887

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

```tsx
<button
```

## HIGH — apps/app/app/(authenticated)/components/search.tsx:17

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/components/tracked-user-button.tsx:26

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `UserButton`

```tsx
<UserButton
```

## HIGH — apps/app/app/(authenticated)/crm/proposals/[id]/page.tsx:224

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SendProposalButton`

```tsx
<SendProposalButton
```

## HIGH — apps/app/app/(authenticated)/crm/proposals/[id]/page.tsx:236

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `ProposalExportButton`

```tsx
<ProposalExportButton
```

## HIGH — apps/app/app/(authenticated)/events/[eventId]/battle-board/components/timeline.tsx:918

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add Staff

```tsx
<Button className="w-full" size="sm">
```

## HIGH — apps/app/app/(authenticated)/events/[eventId]/battle-board/page.tsx:52

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `BattleBoardExportButton`

```tsx
<BattleBoardExportButton eventId={eventId} eventName={event.title} />
```

## HIGH — apps/app/app/(authenticated)/events/[eventId]/page.tsx:123

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `EventExportButton`

```tsx
<EventExportButton eventId={eventId} eventName={event.title} />
```

## HIGH — apps/app/app/(authenticated)/events/[eventId]/page.tsx:130

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `DeleteEventButton`

```tsx
<DeleteEventButton
```

## MEDIUM — apps/app/app/(authenticated)/events/components/task-breakdown-display.tsx:549

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Stop

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/events/contracts/[contractId]/contract-detail-client.tsx:693

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/events/kitchen-dashboard/kitchen-dashboard-client.tsx:1493

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Close

```tsx
<Button
```

## MEDIUM — apps/app/app/(authenticated)/inventory/forecasts/forecasts-page-client.tsx:901

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Request Reorder

```tsx
<Button
```

## MEDIUM — apps/app/app/(authenticated)/inventory/forecasts/forecasts-page-client.tsx:964

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Request Reorder

```tsx
<Button
```

## MEDIUM — apps/app/app/(authenticated)/inventory/forecasts/forecasts-page-client.tsx:1054

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Create PO

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:600

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Schedule Maintenance

```tsx
<Button size="sm" variant="outline">
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:603

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Details

```tsx
<Button size="sm" variant="ghost">
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:626

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: New Work Order

```tsx
<Button>
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:682

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Update Status

```tsx
<Button size="sm" variant="outline">
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:685

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Details

```tsx
<Button size="sm" variant="ghost">
```

## HIGH — apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx:759

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Take Action

```tsx
<Button size="sm" variant="outline">
```

## MEDIUM — apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx:199

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Register Probe

```tsx
<Button onClick={() => toast.info("Probe registration form coming soon")}>
```

## MEDIUM — apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx:417

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Log Reading

```tsx
<Button size="sm" variant="outline" onClick={() => toast.info("Log temperature reading coming soon")}>
```

## MEDIUM — apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx:420

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Details

```tsx
<Button size="sm" variant="ghost" onClick={() => toast.info("Probe details view coming soon")}>
```

## MEDIUM — apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx:508

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Acknowledge

```tsx
<Button size="sm" variant="outline" onClick={() => toast.info("Alert acknowledgement coming soon")}>
```

## MEDIUM — apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx:511

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Resolve

```tsx
<Button size="sm" variant="ghost" onClick={() => toast.info("Alert resolution coming soon")}>
```

## HIGH — apps/app/app/(authenticated)/kitchen/nutrition-labels/page.tsx:193

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/kitchen/prep-lists/prep-list-client.tsx:111

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button aria-label="Toggle details" size="icon" variant="ghost">
```

## HIGH — apps/app/app/(authenticated)/kitchen/prep-lists/prep-list-client.tsx:169

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/kitchen/prep-lists/prep-list-client.tsx:462

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `PrepListSaveButton`

```tsx
<PrepListSaveButton
```

## HIGH — apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/page.tsx:262

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `RecipeDetailEditButton`

```tsx
<RecipeDetailEditButton
```

## HIGH — apps/app/app/(authenticated)/kitchen/recipes/recipe-image-placeholder.tsx:51

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `ClipboardImageButton`

```tsx
<ClipboardImageButton
```

## HIGH — apps/app/app/(authenticated)/layout.tsx:56

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `AiAssistantButton`

```tsx
<AiAssistantButton />
```

## HIGH — apps/app/app/(authenticated)/scheduling/page.tsx:464

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — apps/app/app/(authenticated)/scheduling/page.tsx:472

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add shift

```tsx
<Button size="default" variant="on-dark">
```

## HIGH — apps/app/app/(authenticated)/scheduling/page.tsx:561

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add shift

```tsx
<Button size="sm" variant="default">
```

## HIGH — apps/app/app/(authenticated)/scheduling/page.tsx:691

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Edit

```tsx
<Button size="sm" variant="ghost">
```

## HIGH — apps/app/app/(authenticated)/scheduling/page.tsx:705

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: View leaderboard

```tsx
<Button size="sm" variant="outline">
```

## HIGH — apps/app/app/(authenticated)/settings/security/page.tsx:318

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Cancel

```tsx
<Button disabled={revoking} variant="outline">
```

## HIGH — apps/app/app/(authenticated)/staff/team/components/add-staff-form.tsx:21

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button disabled={pending} type="submit">
```

## HIGH — apps/app/app/(authenticated)/staff/team/components/add-staff-form.tsx:99

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SubmitButton`

```tsx
<SubmitButton />
```

## HIGH — apps/app/app/(authenticated)/staff/team/components/edit-staff-dialog.tsx:43

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button disabled={pending} type="submit">
```

## HIGH — apps/app/app/(authenticated)/staff/team/components/edit-staff-dialog.tsx:195

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SubmitButton`

```tsx
<SubmitButton />
```

## HIGH — apps/app/app/(authenticated)/staff/team/page.tsx:225

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Edit

```tsx
<Button size="sm" variant="outline">
```

## HIGH — apps/app/app/(authenticated)/staff/training/[id]/page.tsx:186

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Edit Module

```tsx
<Button variant="outline">Edit Module</Button>
```

## HIGH — apps/app/app/(authenticated)/staff/training/[id]/page.tsx:189

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Assign to Employee

```tsx
<Button>Assign to Employee</Button>
```

## HIGH — apps/app/app/(authenticated)/staff/training/[id]/page.tsx:191

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `DeleteTrainingModuleButton`

```tsx
<DeleteTrainingModuleButton
```

## HIGH — apps/app/app/(authenticated)/staff/training/page.tsx:96

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Create Module

```tsx
<Button>Create Module</Button>
```

## HIGH — apps/app/app/(authenticated)/tools/battleboards/battleboards-client.tsx:329

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Cancel

```tsx
<Button disabled={submitting} variant="outline">
```

## HIGH — apps/app/app/(authenticated)/tools/battleboards/battleboards-client.tsx:393

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Cancel

```tsx
<Button disabled={deleting} variant="outline">
```

## MEDIUM — apps/app/app/(authenticated)/warehouse/receiving/page.tsx:255

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Reports

```tsx
<Button className="gap-2" variant="outline" onClick={() => toast.info("Warehouse reports coming soon")}>
```

## MEDIUM — apps/app/app/(authenticated)/warehouse/receiving/page.tsx:259

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `Button`

Label: Supplier Performance

```tsx
<Button className="gap-2" variant="outline" onClick={() => toast.info("Supplier performance dashboard coming soon")}>
```

## HIGH — apps/app/app/(dev-console)/components/topbar.tsx:7

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

```tsx
<button className="dev-console-icon-button" type="button">
```

## HIGH — apps/app/app/(dev-console)/components/topbar.tsx:10

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

```tsx
<button className="dev-console-icon-button" type="button">
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:12

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Export Report

```tsx
<button
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:19

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: New Application

```tsx
<button
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:136

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: View all logs

```tsx
<button className="dev-console-link" type="button">
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:149

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Documentation

```tsx
<button className="dev-console-quick-link" type="button">
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:152

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Support Center

```tsx
<button className="dev-console-quick-link" type="button">
```

## HIGH — apps/app/app/(dev-console)/dev-console/page.tsx:155

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Global Config

```tsx
<button className="dev-console-quick-link" type="button">
```

## HIGH — apps/app/app/(dev-console)/dev-console/tenants/page.tsx:17

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Reset Keys

```tsx
<button
```

## HIGH — apps/app/app/(dev-console)/dev-console/tenants/page.tsx:24

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Impersonate

```tsx
<button
```

## HIGH — apps/app/app/(dev-console)/dev-console/tenants/page.tsx:118

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Clear

```tsx
<button
```

## HIGH — apps/app/app/(dev-console)/dev-console/tenants/page.tsx:124

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Create tenant & owner

```tsx
<button
```

## HIGH — apps/app/app/components/auth-header.tsx:26

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SignInButton`

```tsx
<SignInButton />
```

## HIGH — apps/app/app/components/auth-header.tsx:27

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SignUpButton`

```tsx
<SignUpButton />
```

## HIGH — apps/app/app/components/auth-header.tsx:30

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `UserButton`

```tsx
<UserButton />
```

## HIGH — apps/app/components/allergen-warning-banner.tsx:557

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Acknowledge

```tsx
<Button
```

## HIGH — apps/storybook/stories/button.stories.tsx:92

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Button

```tsx
<Button {...args}>
```

## HIGH — apps/storybook/stories/button.stories.tsx:109

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Login with Email Button

```tsx
<Button {...args}>
```

## HIGH — apps/storybook/stories/card.stories.tsx:56

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Close

```tsx
<button className="hover:underline" type="button">
```

## HIGH — apps/storybook/stories/dialog.stories.tsx:35

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Cancel

```tsx
<button className="hover:underline" type="button">
```

## HIGH — apps/storybook/stories/dialog.stories.tsx:39

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Continue

```tsx
<button
```

## HIGH — apps/storybook/stories/drawer.stories.tsx:30

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Submit

```tsx
<button
```

## HIGH — apps/storybook/stories/drawer.stories.tsx:37

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Cancel

```tsx
<button className="hover:underline" type="button">
```

## HIGH — apps/storybook/stories/input.stories.tsx:75

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Subscribe

```tsx
<button
```

## HIGH — apps/storybook/stories/sheet.stories.tsx:45

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Cancel

```tsx
<button className="hover:underline" type="button">
```

## HIGH — apps/storybook/stories/sheet.stories.tsx:49

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Submit

```tsx
<button
```

## MEDIUM — apps/storybook/stories/sonner.stories.tsx:32

Reason: Button has inline no-op / console-only / toast-only onClick

Component: `button`

Label: Show Toast

```tsx
<button
```

## HIGH — apps/storybook/stories/textarea.stories.tsx:73

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: Send Message

```tsx
<button
```

## HIGH — apps/web/app/[locale]/contact/components/contact-form.tsx:109

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button className="w-full gap-4">
```

## HIGH — packages/design-system/components/blocks/calendar-block.tsx:60

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add Event

```tsx
<Button
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:51

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add Dish

```tsx
<Button size="sm" variant="outline">
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:138

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Add Dish

```tsx
<Button size="sm" variant="outline">
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:214

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Generate Tasks

```tsx
<Button>
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:226

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Show Suggestions

```tsx
<Button variant="outline">
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:239

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Generate Summary

```tsx
<Button variant="outline">
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:292

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: View Full Budget

```tsx
{!label && <Button className="w-full">View Full Budget</Button>}
```

## HIGH — packages/design-system/components/blocks/collapsible-section-block.stories.tsx:440

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `button`

Label: View Full Budget

```tsx
<button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
```

## HIGH — packages/design-system/components/blocks/dashboard-header-block.tsx:82

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Download

```tsx
<Button size="sm" variant="outline">
```

## HIGH — packages/design-system/components/blocks/dashboard-header-block.tsx:86

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Create report

```tsx
<Button size="sm">
```

## HIGH — packages/design-system/components/blocks/dashboard-header-block.tsx:118

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Manage access

```tsx
<Button size="sm" variant="ghost">
```

## HIGH — packages/design-system/components/blocks/empty-state-block.tsx:36

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Create invoice

```tsx
<Button size="sm">Create invoice</Button>
```

## HIGH — packages/design-system/components/blocks/empty-state-block.tsx:37

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Import CSV

```tsx
<Button size="sm" variant="outline">
```

## HIGH — packages/design-system/components/blocks/entity-details-sheet-block.tsx:89

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Open profile

```tsx
<Button variant="outline">
```

## HIGH — packages/design-system/components/blocks/entity-details-sheet-block.tsx:93

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Send message

```tsx
<Button>Send message</Button>
```

## HIGH — packages/design-system/components/blocks/filter-bar-block.tsx:69

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Reset

```tsx
<Button size="sm" variant="outline">
```

## HIGH — packages/design-system/components/blocks/filter-bar-block.tsx:72

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

Label: Apply filters

```tsx
<Button size="sm">Apply filters</Button>
```

## HIGH — packages/design-system/components/mode-toggle.tsx:30

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — packages/design-system/components/ui/calendar.tsx:198

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — packages/design-system/components/ui/input-group.tsx:108

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `Button`

```tsx
<Button
```

## HIGH — packages/design-system/components/ui/select.tsx:73

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SelectScrollUpButton`

```tsx
<SelectScrollUpButton />
```

## HIGH — packages/design-system/components/ui/select.tsx:83

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SelectScrollDownButton`

```tsx
<SelectScrollDownButton />
```

## HIGH — packages/design-system/components/ui/select.tsx:144

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SelectPrimitive.ScrollUpButton`

```tsx
<SelectPrimitive.ScrollUpButton
```

## HIGH — packages/design-system/components/ui/select.tsx:162

Reason: Clickable-looking button has no onClick/navigation/submit/trigger wrapper

Component: `SelectPrimitive.ScrollDownButton`

```tsx
<SelectPrimitive.ScrollDownButton
```

