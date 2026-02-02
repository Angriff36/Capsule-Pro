import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.string().default("catering"),
  eventDate: z.string().min(1, "Event date is required"),
  guestCount: z.coerce
    .number()
    .int()
    .min(1, "Guest count must be at least 1")
    .default(1),
  status: z
    .enum([
      "draft",
      "confirmed",
      "tentative",
      "postponed",
      "completed",
      "cancelled",
    ])
    .default("confirmed"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  notes: z.string().optional(),
  budget: z.coerce
    .number()
    .positive("Budget must be a positive number")
    .optional()
    .nullable(),
  ticketPrice: z.coerce.number().min(0, "Ticket price must be 0 or higher").optional(),
  ticketTier: z.string().optional(),
  eventFormat: z.string().optional(),
  accessibilityOptions: z.array(z.string()).default([]),
  featuredMediaUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
