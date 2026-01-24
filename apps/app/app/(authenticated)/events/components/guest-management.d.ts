/**
 * @module GuestManagement
 * @intent Manage event guests with comprehensive list view, add/edit forms, and real-time conflict detection
 * @responsibility Provide full CRUD functionality for event guests with dietary/allergen conflict warnings
 * @domain Events
 * @tags guests, events, dietary-restrictions, allergens
 * @canonical true
 */
interface GuestManagementProps {
  eventId: string;
}
export declare function GuestManagement({
  eventId,
}: GuestManagementProps): import("react").JSX.Element;
//# sourceMappingURL=guest-management.d.ts.map
