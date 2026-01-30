import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  eventType: z.string().default("catering"),
  eventDate: z.string().min(1, "Event date is required"),
  guestCount: z.coerce.number().int().min(1, "Guest count must be at least 1").default(1),
  status: z.enum(["confirmed", "tentative", "postponed", "completed", "cancelled"]).default("confirmed"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  notes: z.string().optional(),
  budget: z.coerce.number().positive("Budget must be a positive number").optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
