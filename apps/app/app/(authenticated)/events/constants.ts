export const eventStatuses = [
  "draft",
  "confirmed",
  "tentative",
  "cancelled",
  "completed",
  "postponed",
] as const;

export type EventStatus = (typeof eventStatuses)[number];
