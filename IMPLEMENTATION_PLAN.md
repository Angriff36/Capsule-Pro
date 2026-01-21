# Implementation Plan (Scoped)

Scope: Expand Recipes and Events Pages with rich interactive features, image management, and modal-based editing

Non-goals:
- Calendar export to Google/Apple/Outlook
- Recipe rating system (1-5 stars)
- Comments/Notes on recipes
- Print view functionality
- Event reminders via email notifications
- Camera capture for images

## Blockers / Decisions

- [ ] Image storage provider (Supabase Storage or other)
- [ ] Image upload endpoint implementation
- [ ] Recipe favorites data model (new table/column)

## Tasks (ordered)

- [x] T1: Update recipes page grid to responsive layout (2 mobile, 3 tablet, 4 desktop) with 16:9 aspect ratio images
- [x] T2: Add heart/favorite icon with hover animation to recipe cards
- [x] T3: Create shared modal component with full-screen mobile and centered desktop views (max-width 800px)
- [x] T4: Implement recipe editor modal with Basic Info section (title, description, prep/cook time, servings, difficulty)
- [ ] T5: Add image upload section with drag-and-drop zone, preview, and progress indicators
- [x] T6: Implement dynamic ingredients list with add/remove rows (quantity, unit, name, optional checkbox)
- [x] T7: Add step-by-step instructions with drag-to-reorder handles
- [x] T8: Implement tag input with suggestions
- [ ] T9: Add toast notification component with 3s auto-dismiss and undo support
- [ ] T10: Update events page with enhanced card layout and RSVP functionality
- [ ] T11: Add loading states (skeleton cards, spinners, progress bars)
- [ ] T12: Implement empty and error states with retry buttons
- [ ] T13: Add keyboard navigation and focus management for modals
- [ ] T14: Add ARIA labels and screen reader announcements
- [ ] T15: Implement lazy loading for images below fold
- [ ] T16: Add progress tracking for ingredients and steps in recipe detail view

## Exit Criteria

- [ ] Recipe cards render in responsive grid with 2/3/4 columns on mobile/tablet/desktop
- [ ] Heart/favorite icon with animation on recipe cards
- [ ] Modal-based recipe editor opens (full-screen mobile, centered desktop)
- [ ] Recipe editor saves successfully with toast notification
- [ ] Image upload works with drag-drop and progress indicators
- [ ] Ingredients and steps can be added/removed dynamically
- [ ] RSVP functionality works on events with attendee count updates
- [ ] Loading, empty, and error states display correctly
- [ ] Keyboard navigation and ARIA labels implemented
- [ ] Images lazy-load efficiently

## Notes

- Use existing shadcn/ui components from @repo/design-system
- Follow existing code patterns from event-form.tsx
- Use existing Toast component from @repo/design-system/components/ui/sonner.tsx
- Images use 16:9 aspect ratio on cards
- Modal opens < 300ms (animation duration)
- Toast auto-dismisses after 3s
- Debounced search at 300ms to reduce API calls
- Touch targets minimum 44x44px for mobile
