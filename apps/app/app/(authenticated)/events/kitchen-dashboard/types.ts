export interface KitchenEvent {
  id: string;
  title: string;
  eventNumber: string | null;
  status: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  venueName: string | null;
  venueAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
}
