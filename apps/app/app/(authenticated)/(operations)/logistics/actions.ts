"use server";

/**
 * Logistics Server Actions
 *
 * Server actions for Driver and Vehicle CRUD operations.
 * All writes go through governed Manifest runtime (constitution §9).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .optional()
    .transform((v) => v || null),
  email: z
    .email({ error: "Invalid email address" })
    .optional()
    .transform((v) => v || null),
  licenseNumber: z
    .string()
    .optional()
    .transform((v) => v || null),
  licenseExpiry: z
    .string()
    .optional()
    .transform((v) => v || null),
  vehicleId: z
    .string()
    .optional()
    .transform((v) => v || null),
  status: z
    .enum(["available", "on_route", "off_duty", "inactive"])
    .default("available"),
  notes: z
    .string()
    .optional()
    .transform((v) => v || null),
});

const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2030)
    .optional()
    .transform((v) => v ?? null),
  plateNumber: z
    .string()
    .optional()
    .transform((v) => v || null),
  vin: z
    .string()
    .optional()
    .transform((v) => v || null),
  capacityWeight: z.coerce
    .number()
    .optional()
    .transform((v) => v ?? null),
  capacityVolume: z.coerce
    .number()
    .optional()
    .transform((v) => v ?? null),
  fuelType: z
    .string()
    .optional()
    .transform((v) => v || null),
  mileage: z.coerce
    .number()
    .optional()
    .transform((v) => v ?? null),
  status: z
    .enum(["available", "in_use", "maintenance", "out_of_service"])
    .default("available"),
  notes: z
    .string()
    .optional()
    .transform((v) => v || null),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse FormData into a plain object and validate with the given Zod schema.
 * Uses safeParse per Zod best-practice to avoid unhandled ZodError exceptions
 * at the action boundary; re-throws as a readable Error on failure.
 */
function parseFormData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T
): z.infer<T> {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    // Keep the last value for multi-value keys (not needed here, but safe)
    raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new driver.
 *
 * Governed write: Driver.create runs through the Manifest runtime (constitution §9).
 * requireCurrentUser supplies the actor + tenant for policy + audit context (§19).
 * licenseExpiry is sent as epoch-ms (GenericPrismaStore coerces to DateTime for
 * @db.Date columns). Empty optionals are sent as "" — GenericPrismaStore coerces
 * "" → NULL for nullable columns (lossless).
 */
export async function createDriver(formData: FormData) {
  const user = await requireCurrentUser();

  const data = parseFormData(formData, driverSchema);

  // Convert licenseExpiry to epoch-ms for GenericPrismaStore DateTime coercion.
  // The Prisma column is @db.Date, so GenericPrismaStore applies asNullableDate()
  // which does `new Date(value)` — an ISO string or epoch-ms both work.
  const licenseExpiry = data.licenseExpiry
    ? new Date(`${data.licenseExpiry}T00:00:00.000Z`).getTime()
    : null;

  const result = await runManifestCommand({
    entity: "Driver",
    command: "create",
    body: {
      name: data.name,
      phone: data.phone ?? "",
      email: data.email ?? "",
      licenseNumber: data.licenseNumber ?? "",
      licenseExpiry,
      vehicleId: data.vehicleId ?? "",
      status: data.status,
      notes: data.notes ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create driver");
  }

  revalidatePath("/logistics/drivers");
  revalidatePath("/logistics");
  redirect("/logistics/drivers");
}

/**
 * Create a new vehicle.
 *
 * Governed write: Vehicle.create runs through the Manifest runtime (constitution §9).
 * Decimal fields (capacityWeight, capacityVolume, mileage) are sent as numbers —
 * GenericPrismaStore applies toDecimalInput() for Prisma Decimal columns.
 * Empty optionals are sent as "" → GenericPrismaStore coerces to NULL (lossless).
 */
export async function createVehicle(formData: FormData) {
  const user = await requireCurrentUser();

  const data = parseFormData(formData, vehicleSchema);

  const result = await runManifestCommand({
    entity: "Vehicle",
    command: "create",
    body: {
      make: data.make,
      model: data.model,
      year: data.year ?? 0,
      plateNumber: data.plateNumber ?? "",
      vin: data.vin ?? "",
      capacityWeight: data.capacityWeight ?? 0,
      capacityVolume: data.capacityVolume ?? 0,
      fuelType: data.fuelType ?? "",
      mileage: data.mileage ?? 0,
      status: data.status,
      notes: data.notes ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create vehicle");
  }

  revalidatePath("/logistics/vehicles");
  revalidatePath("/logistics");
  redirect("/logistics/vehicles");
}
