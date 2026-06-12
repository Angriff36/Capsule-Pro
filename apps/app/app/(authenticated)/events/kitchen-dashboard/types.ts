export interface KitchenEvent {
  createdAt: string;
  eventDate: string;
  eventNumber: string | null;
  eventType: string;
  guestCount: number;
  id: string;
  notes: string | null;
  status: string;
  tags: string[];
  title: string;
  venueAddress: string | null;
  venueName: string | null;
}
