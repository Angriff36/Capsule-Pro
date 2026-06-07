"use server";

/**
 * Client CRUD Server Actions
 *
 * Server actions for client management operations.
 * Governed writes go through runManifestCommand (constitution §3/§9).
 * Reads remain direct Prisma (constitution §10).
 */

import { auth } from "@repo/auth/server";
import type { Client, ClientContact, ClientInteraction } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/app/lib/decimal";
import { invariant } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";

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

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Record<string, unknown>[]).push({
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
    (whereClause.AND as Record<string, unknown>[]).push({
      tags: { hasSome: filters.tags },
    });
  }

  // Add assignedTo filter
  if (filters.assignedTo) {
    (whereClause.AND as Record<string, unknown>[]).push({
      assignedTo: filters.assignedTo,
    });
  }

  // Add clientType filter
  if (filters.clientType) {
    (whereClause.AND as Record<string, unknown>[]).push({
      clientType: filters.clientType,
    });
  }

  // Add source filter
  if (filters.source) {
    (whereClause.AND as Record<string, unknown>[]).push({
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

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);

  const count = await database.client.count({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });

  return count;
}

/**
 * Get all unique tags used by clients
 */
export async function getAvailableTags(): Promise<
  { tag: string; count: number }[]
> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);

  // Get all clients with tags
  const clients = await database.client.findMany({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
    select: { tags: true },
  });

  // Count occurrences of each tag
  const tagCounts = new Map<string, number>();
  for (const client of clients) {
    for (const tag of client.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  // Sort by count descending, then alphabetically
  const result = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return result;
}

/**
 * Delete a tag from all clients globally.
 *
 */
export async function deleteTagGlobally(tag: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(tag?.trim(), "Tag name is required");

  const trimmedTag = tag.trim();

  const clients = await database.client.findMany({
    where: {
      tenantId,
      deletedAt: null,
      tags: {
        has: trimmedTag,
      },
    },
    select: {
      id: true,
      tags: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      website: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      stateProvince: true,
      postalCode: true,
      countryCode: true,
      defaultPaymentTerms: true,
      taxExempt: true,
      taxId: true,
      notes: true,
      source: true,
      assignedTo: true,
    },
  });

  // Govern each client's tag update through the Client.update command.
  // Client.update has full-replace semantics, so we merge existing values.
  for (const client of clients) {
    const result = await runManifestCommand({
      entity: "Client",
      command: "update",
      instanceId: client.id,
      body: {
        companyName: client.company_name || "",
        firstName: client.first_name || "",
        lastName: client.last_name || "",
        email: client.email || "",
        phone: client.phone || "",
        website: client.website || "",
        addressLine1: client.addressLine1 || "",
        addressLine2: client.addressLine2 || "",
        city: client.city || "",
        stateProvince: client.stateProvince || "",
        postalCode: client.postalCode || "",
        countryCode: client.countryCode || "",
        defaultPaymentTerms: client.defaultPaymentTerms ?? 30,
        taxExempt: client.taxExempt ?? false,
        taxId: client.taxId || "",
        notes: client.notes || "",
        tags: client.tags.filter((value) => value !== trimmedTag),
        source: client.source || "",
        assignedTo: client.assignedTo || "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || `Failed to remove tag from client ${client.id}`);
    }
  }

  revalidatePath("/crm/clients");
  revalidatePath("/crm/segmentation");

  return { success: true };
}

/**
 * Get client by ID with full details
 */
export async function getClientById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);
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
      AND: [{ tenantId }, { customer_id: id }, { deletedAt: null }],
    },
  });

  // Get total revenue
  const revenueResult = await database.cateringOrder.aggregate({
    where: {
      AND: [{ tenantId }, { customer_id: id }, { deletedAt: null }],
    },
    _sum: {
      totalAmount: true,
    },
  });

  // Transform Decimal to match component's expected type
  const totalRevenue =
    revenueResult._sum.totalAmount !== null
      ? { total: revenueResult._sum.totalAmount.toString() }
      : null;

  return {
    ...client,
    contacts,
    preferences,
    interactionCount,
    eventCount,
    totalRevenue,
  };
}

/**
 * @deprecated Use POST /api/manifest/Client/commands/create from the client UI.
 * Direct Prisma bypass is not supported — it skips manifest guards/policies/events.
 */
export async function createClient(_input: CreateClientInput): Promise<never> {
  throw new Error(
    "createClient() server action is disabled. Client create must go through POST /api/manifest/Client/commands/create."
  );
}

/**
 * Update a client via governed Client.update command.
 */
export async function updateClient(
  id: string,
  input: Partial<CreateClientInput>
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Client ID is required");

  // Check if client exists
  const existingClient = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingClient, "Client not found");

  // Check for duplicate email if changing
  if (input.email?.trim() && input.email !== existingClient.email) {
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

  // Client.update requires all params (full replace semantics).
  // Merge existing values with provided input to build the full body.
  const body = {
    companyName: input.company_name !== undefined
      ? (input.company_name?.trim() || "")
      : (existingClient.company_name || ""),
    firstName: input.first_name !== undefined
      ? (input.first_name?.trim() || "")
      : (existingClient.first_name || ""),
    lastName: input.last_name !== undefined
      ? (input.last_name?.trim() || "")
      : (existingClient.last_name || ""),
    email: input.email !== undefined
      ? (input.email?.trim() || "")
      : (existingClient.email || ""),
    phone: input.phone !== undefined
      ? (input.phone?.trim() || "")
      : (existingClient.phone || ""),
    website: input.website !== undefined
      ? (input.website?.trim() || "")
      : (existingClient.website || ""),
    addressLine1: input.addressLine1 !== undefined
      ? (input.addressLine1?.trim() || "")
      : (existingClient.addressLine1 || ""),
    addressLine2: input.addressLine2 !== undefined
      ? (input.addressLine2?.trim() || "")
      : (existingClient.addressLine2 || ""),
    city: input.city !== undefined
      ? (input.city?.trim() || "")
      : (existingClient.city || ""),
    stateProvince: input.stateProvince !== undefined
      ? (input.stateProvince?.trim() || "")
      : (existingClient.stateProvince || ""),
    postalCode: input.postalCode !== undefined
      ? (input.postalCode?.trim() || "")
      : (existingClient.postalCode || ""),
    countryCode: input.countryCode !== undefined
      ? (input.countryCode?.trim() || "")
      : (existingClient.countryCode || ""),
    defaultPaymentTerms: input.defaultPaymentTerms !== undefined
      ? input.defaultPaymentTerms
      : (existingClient.defaultPaymentTerms ?? 30),
    taxExempt: input.taxExempt !== undefined
      ? input.taxExempt
      : (existingClient.taxExempt ?? false),
    taxId: input.taxId !== undefined
      ? (input.taxId?.trim() || "")
      : (existingClient.taxId || ""),
    notes: input.notes !== undefined
      ? (input.notes?.trim() || "")
      : (existingClient.notes || ""),
    tags: input.tags !== undefined
      ? input.tags
      : (existingClient.tags || []),
    source: input.source !== undefined
      ? (input.source?.trim() || "")
      : (existingClient.source || ""),
    assignedTo: input.assignedTo !== undefined
      ? (input.assignedTo || "")
      : (existingClient.assignedTo || ""),
  };

  const result = await runManifestCommand({
    entity: "Client",
    command: "update",
    instanceId: id,
    body,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update client");
  }

  // Read back the updated row to preserve return shape.
  const updatedClient = await database.client.findFirst({
    where: { AND: [{ tenantId }, { id }, { deletedAt: null }] },
  });
  invariant(updatedClient, "Updated client could not be loaded");

  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${id}`);

  return updatedClient;
}

/**
 * Delete a client (soft delete) via governed Client.archive command.
 */
export async function deleteClient(id: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(id, "Client ID is required");

  const existingClient = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingClient, "Client not found");

  const result = await runManifestCommand({
    entity: "Client",
    command: "archive",
    instanceId: id,
    body: {
      reason: "Deleted via CRM client actions",
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete client");
  }

  revalidatePath("/crm/clients");

  return { success: true };
}

/**
 * Get client contacts
 */
export async function getClientContacts(clientId: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);
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
 * Create a client contact via governed ClientContact.create command.
 */
export async function createClientContact(
  clientId: string,
  input: CreateClientContactInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  const result = await runManifestCommand({
    entity: "ClientContact",
    command: "create",
    body: {
      clientId,
      firstName: input.first_name.trim(),
      lastName: input.last_name.trim(),
      title: input.title?.trim() || "",
      email: input.email?.trim() || "",
      phone: input.phone?.trim() || "",
      phoneMobile: input.phoneMobile?.trim() || "",
      isPrimary: input.isPrimary ?? false,
      isBillingContact: input.isBillingContact ?? false,
      notes: input.notes?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create client contact");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "ClientContact.create did not return an id");

  // Read back to preserve return shape.
  const contact = await database.clientContact.findFirst({
    where: { AND: [{ tenantId }, { id: createdId }] },
  });
  invariant(contact, "Created contact could not be loaded");

  revalidatePath(`/crm/clients/${clientId}`);

  return contact;
}

/**
 * Update a client contact via governed ClientContact.update command.
 * For isPrimary changes, uses the separate ClientContact.setPrimary command.
 */
export async function updateClientContact(
  clientId: string,
  contactId: string,
  input: Partial<CreateClientContactInput>
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");
  invariant(contactId, "Contact ID is required");

  const existing = await database.clientContact.findFirst({
    where: {
      AND: [{ tenantId }, { id: contactId }, { clientId }, { deletedAt: null }],
    },
  });
  invariant(existing, "Contact not found");

  // Handle isPrimary via the dedicated setPrimary command
  if (input.isPrimary) {
    const primaryResult = await runManifestCommand({
      entity: "ClientContact",
      command: "setPrimary",
      instanceId: contactId,
      body: { userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!primaryResult.ok) {
      throw new Error(primaryResult.message || "Failed to set primary contact");
    }
  }

  // Build update body: ClientContact.update requires all its params.
  // Merge existing values with provided input.
  const hasOtherChanges =
    input.first_name !== undefined ||
    input.last_name !== undefined ||
    input.title !== undefined ||
    input.email !== undefined ||
    input.phone !== undefined ||
    input.phoneMobile !== undefined ||
    input.isBillingContact !== undefined ||
    input.notes !== undefined;

  if (hasOtherChanges) {
    const body = {
      firstName: input.first_name !== undefined
        ? input.first_name.trim()
        : (existing.first_name || ""),
      lastName: input.last_name !== undefined
        ? input.last_name.trim()
        : (existing.last_name || ""),
      title: input.title !== undefined
        ? (input.title?.trim() || "")
        : (existing.title || ""),
      email: input.email !== undefined
        ? (input.email?.trim() || "")
        : (existing.email || ""),
      phone: input.phone !== undefined
        ? (input.phone?.trim() || "")
        : (existing.phone || ""),
      phoneMobile: input.phoneMobile !== undefined
        ? (input.phoneMobile?.trim() || "")
        : (existing.phoneMobile || ""),
      isBillingContact: input.isBillingContact !== undefined
        ? input.isBillingContact
        : (existing.isBillingContact ?? false),
      notes: input.notes !== undefined
        ? (input.notes?.trim() || "")
        : (existing.notes || ""),
    };

    const result = await runManifestCommand({
      entity: "ClientContact",
      command: "update",
      instanceId: contactId,
      body,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to update client contact");
    }
  }

  // Read back to preserve return shape.
  const contact = await database.clientContact.findFirst({
    where: { AND: [{ tenantId }, { id: contactId }, { clientId }] },
  });
  invariant(contact, "Updated contact could not be loaded");

  revalidatePath(`/crm/clients/${clientId}`);
  return contact;
}

/**
 * Delete a client contact (soft delete) via governed ClientContact.remove command.
 */
export async function deleteClientContact(clientId: string, contactId: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");
  invariant(contactId, "Contact ID is required");

  const existing = await database.clientContact.findFirst({
    where: {
      AND: [{ tenantId }, { id: contactId }, { clientId }, { deletedAt: null }],
    },
  });
  invariant(existing, "Contact not found");

  const result = await runManifestCommand({
    entity: "ClientContact",
    command: "remove",
    instanceId: contactId,
    body: {
      reason: "Deleted via CRM client actions",
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete client contact");
  }

  revalidatePath(`/crm/clients/${clientId}`);
  return { success: true };
}

export interface ClientInteractionFilters {
  interactionType?: string;
  search?: string;
}

/**
 * Get client interactions with optional filtering
 */
export async function getClientInteractions(
  clientId: string,
  limit = 50,
  offset = 0,
  filters: ClientInteractionFilters = {}
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);
  invariant(clientId, "Client ID is required");

  const andConditions: Record<string, unknown>[] = [
    { tenantId },
    { clientId },
    { deletedAt: null },
  ];

  if (filters.interactionType) {
    andConditions.push({ interactionType: filters.interactionType });
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    andConditions.push({
      OR: [
        { subject: { contains: searchLower, mode: "insensitive" } },
        { description: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  const interactions = await database.clientInteraction.findMany({
    where: { AND: andConditions },
    orderBy: [{ interactionDate: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.clientInteraction.count({
    where: { AND: andConditions },
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
 * Create a client interaction via governed ClientInteraction.create command.
 */
export async function createClientInteraction(
  clientId: string,
  input: CreateClientInteractionInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");

  // Verify client exists
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // TODO(capsule-pro/TODO:crm-employee-model): No standalone Employee model exists in the schema.
  // ClientInteraction.employeeId is a UUID with no FK constraint. Related tables exist
  // (EmployeeBankAccount, EmployeeTimeOffRequest, etc.) but they reference employeeId
  // externally — there is no central Employee table to look up userId → employeeId.
  // Needed: an Employee model with a userId field linking Clerk users to employee records.
  // Until then, userId is used directly as the employeeId stand-in.

  const result = await runManifestCommand({
    entity: "ClientInteraction",
    command: "create",
    body: {
      clientId,
      leadId: "",
      employeeId: user.id,
      interactionType: input.interactionType.trim(),
      interactionDate: Date.now(),
      subject: input.subject?.trim() || "",
      description: input.description?.trim() || "",
      followUpDate: input.followUpDate
        ? new Date(input.followUpDate).getTime()
        : null,
      correlationId: "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create client interaction");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "ClientInteraction.create did not return an id");

  // Read back to preserve return shape.
  const interaction = await database.clientInteraction.findFirst({
    where: { AND: [{ tenantId }, { id: createdId }] },
  });
  invariant(interaction, "Created interaction could not be loaded");

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
 * Update a client interaction.
 *
 * Governed via ClientInteraction.update for the fields it covers
 * (interactionType, subject, description, followUpDate). The
 * followUpCompleted field is NOT in the ClientInteraction.update
 * command's mutates, so that field falls through to direct Prisma
 * when provided.
 */
export async function updateClientInteraction(
  clientId: string,
  interactionId: string,
  input: UpdateClientInteractionInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
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

  // Determine if any fields are covered by the governed update command
  const governedFields = [
    "interactionType",
    "subject",
    "description",
    "followUpDate",
  ] as const;
  const hasGovernedChanges = governedFields.some(
    (f) => (input as Record<string, unknown>)[f] !== undefined
  );

  if (hasGovernedChanges) {
    // ClientInteraction.update requires all its params.
    // Merge existing values with provided input.
    const body = {
      interactionType:
        input.interactionType !== undefined
          ? input.interactionType.trim()
          : existingInteraction.interactionType || "",
      subject:
        input.subject !== undefined
          ? (input.subject?.trim() || "")
          : (existingInteraction.subject || ""),
      description:
        input.description !== undefined
          ? (input.description?.trim() || "")
          : (existingInteraction.description || ""),
      followUpDate:
        input.followUpDate !== undefined
          ? (input.followUpDate ? new Date(input.followUpDate).getTime() : null)
          : (existingInteraction.followUpDate
            ? new Date(existingInteraction.followUpDate).getTime()
            : null),
      correlationId: "",
    };

    const result = await runManifestCommand({
      entity: "ClientInteraction",
      command: "update",
      instanceId: interactionId,
      body,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to update client interaction");
    }
  }

  // followUpCompleted is managed by the dedicated `complete` command.
  // Use the governed command when setting to true; no-op when false
  // (uncompleting is a niche case not covered by the lifecycle).
  if (input.followUpCompleted === true) {
    await runManifestCommand({
      entity: "ClientInteraction",
      command: "complete",
      body: {
        id: interactionId,
        completionNotes: "Marked complete via interaction update",
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  // Read back to preserve return shape.
  const updatedInteraction = await database.clientInteraction.findFirst({
    where: { AND: [{ tenantId }, { id: interactionId }] },
  });
  invariant(updatedInteraction, "Updated interaction could not be loaded");

  revalidatePath(`/crm/clients/${clientId}`);

  return updatedInteraction;
}

/**
 * Delete a client interaction (soft delete via Manifest runtime).
 */
export async function deleteClientInteraction(
  clientId: string,
  interactionId: string
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");
  invariant(interactionId, "Interaction ID is required");

  // Verify client exists (read path — constitution §10)
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });

  invariant(client, "Client not found");

  // Verify interaction exists and belongs to this client (read path — constitution §10)
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

  await runManifestCommand({
    entity: "ClientInteraction",
    command: "softDelete",
    instanceId: interactionId,
    body: { userId: user.id },
    user: { id: user.id, tenantId, role: user.role },
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

  const tenantId = await requireCurrentUser().then((u) => u.tenantId);
  invariant(clientId, "Client ID is required");

  const events = await database.cateringOrder.findMany({
    where: {
      AND: [{ tenantId }, { customer_id: clientId }, { deletedAt: null }],
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.cateringOrder.count({
    where: {
      AND: [{ tenantId }, { customer_id: clientId }, { deletedAt: null }],
    },
  });

  return {
    data: events.map((e) => serializeDecimals(e)),
    pagination: {
      limit,
      offset,
      total: totalCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Client Preferences CRUD
// ---------------------------------------------------------------------------

export interface CreateClientPreferenceInput {
  preferenceType: string;
  preferenceKey: string;
  preferenceValue:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[];
  notes?: string;
}

export interface UpdateClientPreferenceInput {
  preferenceType?: string;
  preferenceKey?: string;
  preferenceValue?:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[];
  notes?: string;
}

/**
 * Create a client preference via governed ClientPreference.create command.
 */
export async function createClientPreference(
  clientId: string,
  input: CreateClientPreferenceInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");

  const client = await database.client.findFirst({
    where: { AND: [{ tenantId }, { id: clientId }, { deletedAt: null }] },
  });
  invariant(client, "Client not found");

  const result = await runManifestCommand({
    entity: "ClientPreference",
    command: "create",
    body: {
      clientId,
      preferenceType: input.preferenceType.trim(),
      preferenceKey: input.preferenceKey.trim(),
      preferenceValue: input.preferenceValue as string,
      notes: input.notes?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create client preference");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "ClientPreference.create did not return an id");

  // Read back to preserve return shape.
  const preference = await database.clientPreference.findFirst({
    where: { AND: [{ tenantId }, { id: createdId }] },
  });
  invariant(preference, "Created preference could not be loaded");

  revalidatePath(`/crm/clients/${clientId}`);
  return preference;
}

/**
 * Update a client preference via governed ClientPreference.update command.
 */
export async function updateClientPreference(
  clientId: string,
  preferenceId: string,
  input: UpdateClientPreferenceInput
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");
  invariant(preferenceId, "Preference ID is required");

  const existing = await database.clientPreference.findFirst({
    where: {
      AND: [
        { tenantId },
        { id: preferenceId },
        { clientId },
        { deletedAt: null },
      ],
    },
  });
  invariant(existing, "Preference not found");

  // ClientPreference.update only mutates preferenceValue and notes.
  // Build body merging existing values with provided input.
  const body = {
    preferenceValue:
      input.preferenceValue !== undefined
        ? (input.preferenceValue as string)
        : existing.preferenceValue,
    notes:
      input.notes !== undefined
        ? (input.notes?.trim() || "")
        : (existing.notes || ""),
  };

  const result = await runManifestCommand({
    entity: "ClientPreference",
    command: "update",
    instanceId: preferenceId,
    body,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update client preference");
  }

  // Read back to preserve return shape.
  const preference = await database.clientPreference.findFirst({
    where: { AND: [{ tenantId }, { id: preferenceId }] },
  });
  invariant(preference, "Updated preference could not be loaded");

  revalidatePath(`/crm/clients/${clientId}`);
  return preference;
}

/**
 * Delete a client preference (soft delete) via governed ClientPreference.remove command.
 */
export async function deleteClientPreference(
  clientId: string,
  preferenceId: string
) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  invariant(clientId, "Client ID is required");
  invariant(preferenceId, "Preference ID is required");

  const existing = await database.clientPreference.findFirst({
    where: {
      AND: [
        { tenantId },
        { id: preferenceId },
        { clientId },
        { deletedAt: null },
      ],
    },
  });
  invariant(existing, "Preference not found");

  const result = await runManifestCommand({
    entity: "ClientPreference",
    command: "remove",
    instanceId: preferenceId,
    body: { userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete client preference");
  }

  revalidatePath(`/crm/clients/${clientId}`);
  return { success: true };
}
