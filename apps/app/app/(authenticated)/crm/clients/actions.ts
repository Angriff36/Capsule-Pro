"use server";

/**
 * Client CRUD Server Actions
 *
 * Server actions for client management operations
 */

import { auth } from "@repo/auth/server";
import type { Client, ClientContact, ClientInteraction } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// Types matching the API
export interface ClientFilters {
  search?: string;
  tags?: string[];
  assignedTo?: string;
  clientType?: "company" | "individual";
  source?: string;
}

export interface CreateClientInput {
  clientType?: "company" | "individual";
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
  defaultPaymentTerms?: number;
  taxExempt?: boolean;
  taxId?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  assignedTo?: string;
}

export interface CreateClientContactInput {
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  phone?: string;
  phoneMobile?: string;
  isPrimary?: boolean;
  isBillingContact?: boolean;
  notes?: string;
}

export interface CreateClientInteractionInput {
  interactionType: string;
  subject?: string;
  description?: string;
  followUpDate?: string;
}

/**
 * Get list of clients with filters and pagination
 */
export async function getClients(
  filters: ClientFilters = {},
  page = 1,
  limit = 50
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Array<Record<string, unknown>>).push({
      OR: [
        { company_name: { contains: searchLower, mode: "insensitive" } },
        { first_name: { contains: searchLower, mode: "insensitive" } },
        { last_name: { contains: searchLower, mode: "insensitive" } },
        { email: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add tag filter
  if (filters.tags && filters.tags.length > 0) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      tags: { hasSome: filters.tags },
    });
  }

  // Add assignedTo filter
  if (filters.assignedTo) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      assignedTo: filters.assignedTo,
    });
  }

  // Add clientType filter
  if (filters.clientType) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      clientType: filters.clientType,
    });
  }

  // Add source filter
  if (filters.source) {
    (whereClause.AND as Array<Record<string, unknown>>).push({
      source: filters.source,
    });
  }

  const offset = (page - 1) * limit;

  const clients = await database.client.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.client.count({
    where: whereClause,
  });

  return {
    data: clients as Client[],
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get client count (for stats)
 */
export async function getClientCount() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const count = await database.client.count({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });

  return count;
}

/**
 * Get client by ID with full details
 */
export async function getClientById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Client ID is required");

  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Get contacts
  const contacts = await database.clientContact.findMany({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  // Get preferences
  const preferences = await database.clientPreference.findMany({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
    orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
  });

  // Get interaction count
  const interactionCount = await database.clientInteraction.count({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
  });

  // Get event count
  const eventCount = await database.cateringOrder.count({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
  });

  // Get total revenue
  const revenueResult = await database.cateringOrder.aggregate({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
    _sum: {
      total: true,
    },
  });

  return {
    ...client,
    contacts,
    preferences,
    interactionCount,
    eventCount,
    totalRevenue: revenueResult._sum.total,
  };
}

/**
 * Create a new client
 */
export async function createClient(input: CreateClientInput) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  // Check for duplicate email
  if (input.email && input.email.trim()) {
    const existingClient = await database.client.findFirst({
      where: {
        AND: [{ tenantId }, { email: input.email.trim() }, { deletedAt: null }],
      },
    });

    invariant(!existingClient, "A client with this email already exists");
  }

  const clientType =
    input.clientType || (input.company_name ? "company" : "individual");

  const client = await database.client.create({
    data: {
      tenantId,
      clientType,
      company_name: input.company_name?.trim() || null,
      first_name: input.first_name?.trim() || null,
      last_name: input.last_name?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      website: input.website?.trim() || null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      stateProvince: input.stateProvince?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      countryCode: input.countryCode?.trim() || null,
      defaultPaymentTerms: input.defaultPaymentTerms ?? 30,
      taxExempt: input.taxExempt ?? false,
      taxId: input.taxId?.trim() || null,
      notes: input.notes?.trim() || null,
      tags: input.tags || [],
      source: input.source?.trim() || null,
      assignedTo: input.assignedTo || null,
    },
  });

  revalidatePath("/crm/clients");

  return client;
}

/**
 * Update a client
 */
export async function updateClient(
  id: string,
  input: Partial<CreateClientInput>
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Client ID is required");

  // Check if client exists
  const existingClient = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingClient, "Client not found");

  // Check for duplicate email if changing
  if (
    input.email &&
    input.email.trim() &&
    input.email !== existingClient.email
  ) {
    const duplicateClient = await database.client.findFirst({
      where: {
        AND: [
          { tenantId },
          { email: input.email.trim() },
          { deletedAt: null },
          { id: { not: id } },
        ],
      },
    });

    invariant(!duplicateClient, "A client with this email already exists");
  }

  const updatedClient = await database.client.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: {
      ...(input.company_name !== undefined && {
        company_name: input.company_name?.trim() || null,
      }),
      ...(input.first_name !== undefined && {
        first_name: input.first_name?.trim() || null,
      }),
      ...(input.last_name !== undefined && {
        last_name: input.last_name?.trim() || null,
      }),
      ...(input.email !== undefined && { email: input.email?.trim() || null }),
      ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
      ...(input.website !== undefined && {
        website: input.website?.trim() || null,
      }),
      ...(input.addressLine1 !== undefined && {
        addressLine1: input.addressLine1?.trim() || null,
      }),
      ...(input.addressLine2 !== undefined && {
        addressLine2: input.addressLine2?.trim() || null,
      }),
      ...(input.city !== undefined && { city: input.city?.trim() || null }),
      ...(input.stateProvince !== undefined && {
        stateProvince: input.stateProvince?.trim() || null,
      }),
      ...(input.postalCode !== undefined && {
        postalCode: input.postalCode?.trim() || null,
      }),
      ...(input.countryCode !== undefined && {
        countryCode: input.countryCode?.trim() || null,
      }),
      ...(input.defaultPaymentTerms !== undefined && {
        defaultPaymentTerms: input.defaultPaymentTerms,
      }),
      ...(input.taxExempt !== undefined && { taxExempt: input.taxExempt }),
      ...(input.taxId !== undefined && { taxId: input.taxId?.trim() || null }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.source !== undefined && {
        source: input.source?.trim() || null,
      }),
      ...(input.assignedTo !== undefined && {
        assignedTo: input.assignedTo || null,
      }),
      ...(input.clientType !== undefined && { clientType: input.clientType }),
    },
  });

  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${id}`);

  return updatedClient;
}

/**
 * Delete a client (soft delete)
 */
export async function deleteClient(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Client ID is required");

  const existingClient = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingClient, "Client not found");

  await database.client.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/crm/clients");

  return { success: true };
}

/**
 * Get client contacts
 */
export async function getClientContacts(clientId: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  const contacts = await database.clientContact.findMany({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return contacts as ClientContact[];
}

/**
 * Create a client contact
 */
export async function createClientContact(
  clientId: string,
  input: CreateClientContactInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // If setting as primary, unset existing primary
  if (input.isPrimary) {
    await database.clientContact.updateMany({
      where: {
        AND: [
          { tenantId },
          { clientId },
          { isPrimary: true },
          { deletedAt: null },
        ],
      },
      data: { isPrimary: false },
    });
  }

  // If setting as billing contact, unset existing
  if (input.isBillingContact) {
    await database.clientContact.updateMany({
      where: {
        AND: [
          { tenantId },
          { clientId },
          { isBillingContact: true },
          { deletedAt: null },
        ],
      },
      data: { isBillingContact: false },
    });
  }

  const contact = await database.clientContact.create({
    data: {
      tenantId,
      clientId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      title: input.title?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      phoneMobile: input.phoneMobile?.trim() || null,
      isPrimary: input.isPrimary ?? false,
      isBillingContact: input.isBillingContact ?? false,
      notes: input.notes?.trim() || null,
    },
  });

  revalidatePath(`/crm/clients/${clientId}`);

  return contact;
}

/**
 * Get client interactions
 */
export async function getClientInteractions(
  clientId: string,
  limit = 50,
  offset = 0
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  const interactions = await database.clientInteraction.findMany({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
    orderBy: [{ interactionDate: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.clientInteraction.count({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
  });

  return {
    data: interactions as ClientInteraction[],
    pagination: {
      limit,
      offset,
      total: totalCount,
    },
  };
}

/**
 * Create a client interaction
 */
export async function createClientInteraction(
  clientId: string,
  input: CreateClientInteractionInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Get current user's employee record
  const employee = await database.employee.findFirst({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });

  invariant(employee, "Employee record not found for current user");

  const interaction = await database.clientInteraction.create({
    data: {
      tenantId,
      clientId,
      employeeId: employee.id,
      interactionType: input.interactionType.trim(),
      subject: input.subject?.trim() || null,
      description: input.description?.trim() || null,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
    },
  });

  revalidatePath(`/crm/clients/${clientId}`);

  return interaction;
}

export interface UpdateClientInteractionInput {
  interactionType?: string;
  subject?: string;
  description?: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
}

/**
 * Update a client interaction
 */
export async function updateClientInteraction(
  clientId: string,
  interactionId: string,
  input: UpdateClientInteractionInput
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");
  invariant(interactionId, "Interaction ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Verify interaction exists and belongs to this client
  const existingInteraction = await database.clientInteraction.findFirst({
    where: {
      AND: [
        { tenantId },
        { id: interactionId },
        { clientId },
        { deletedAt: null },
      ],
    },
  });

  invariant(existingInteraction, "Interaction not found");

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};

  if (input.interactionType !== undefined) {
    updateData.interactionType = input.interactionType.trim();
  }
  if (input.subject !== undefined) {
    updateData.subject = input.subject?.trim() || null;
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.followUpDate !== undefined) {
    updateData.followUpDate = input.followUpDate
      ? new Date(input.followUpDate)
      : null;
  }
  if (input.followUpCompleted !== undefined) {
    updateData.followUpCompleted = input.followUpCompleted;
  }

  const updatedInteraction = await database.clientInteraction.update({
    where: {
      tenantId_id: { tenantId, id: interactionId },
    },
    data: updateData,
  });

  revalidatePath(`/crm/clients/${clientId}`);

  return updatedInteraction;
}

/**
 * Delete a client interaction (soft delete)
 */
export async function deleteClientInteraction(
  clientId: string,
  interactionId: string
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");
  invariant(interactionId, "Interaction ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Verify interaction exists and belongs to this client
  const existingInteraction = await database.clientInteraction.findFirst({
    where: {
      AND: [
        { tenantId },
        { id: interactionId },
        { clientId },
        { deletedAt: null },
      ],
    },
  });

  invariant(existingInteraction, "Interaction not found");

  await database.clientInteraction.update({
    where: {
      tenantId_id: { tenantId, id: interactionId },
    },
    data: { deletedAt: new Date() },
  });

  revalidatePath(`/crm/clients/${clientId}`);

  return { success: true };
}

/**
 * Get client event history
 */
export async function getClientEventHistory(
  clientId: string,
  limit = 50,
  offset = 0
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(clientId, "Client ID is required");

  const events = await database.cateringOrder.findMany({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
    include: {
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
          status: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.cateringOrder.count({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
  });

  return {
    data: events,
    pagination: {
      limit,
      offset,
      total: totalCount,
    },
  };
}
