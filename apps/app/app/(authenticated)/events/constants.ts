export const eventStatuses = [
  "confirmed",
  "tentative",
  "cancelled",
  "completed",
  "postponed",
] as const;

export type EventStatus = (typeof eventStatuses)[number];
