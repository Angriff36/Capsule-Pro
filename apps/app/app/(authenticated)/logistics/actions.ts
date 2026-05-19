"use server";

/**
 * Logistics Server Actions
 *
 * Server actions for Driver and Vehicle CRUD operations.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

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
    .string()
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

async function requireAuth() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");
  return getTenantId();
}

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
 */
export async function createDriver(formData: FormData) {
  const tenantId = await requireAuth();

  const data = parseFormData(formData, driverSchema);

  // Parse licenseExpiry to Date if provided
  const licenseExpiry = data.licenseExpiry
    ? new Date(`${data.licenseExpiry}T00:00:00.000Z`)
    : null;

  await database.driver.create({
    data: {
      tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      licenseNumber: data.licenseNumber,
      licenseExpiry,
      vehicleId: data.vehicleId,
      status: data.status,
      notes: data.notes,
    },
  });

  revalidatePath("/logistics/drivers");
  revalidatePath("/logistics");
  redirect("/logistics/drivers");
}

/**
 * Create a new vehicle.
 */
export async function createVehicle(formData: FormData) {
  const tenantId = await requireAuth();

  const data = parseFormData(formData, vehicleSchema);

  await database.vehicle.create({
    data: {
      tenantId,
      make: data.make,
      model: data.model,
      year: data.year,
      plateNumber: data.plateNumber,
      vin: data.vin,
      capacityWeight: data.capacityWeight,
      capacityVolume: data.capacityVolume,
      fuelType: data.fuelType,
      mileage: data.mileage,
      status: data.status,
      notes: data.notes,
    },
  });

  revalidatePath("/logistics/vehicles");
  revalidatePath("/logistics");
  redirect("/logistics/vehicles");
}
