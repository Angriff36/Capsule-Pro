"use server";
import { listCateringOrders, listClientContacts, listClientInteractions, listClientPreferences, listClients } from "@/app/lib/manifest-client.generated";

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
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// Types matching the API
export interface ClientFilters {
  assignedTo?: string;
  clientType?: "company" | "individual";
  search?: string;
  source?: string;
  tags?: string[];
}

export interface CreateClientInput {
  addressLine1?: string;
  addressLine2?: string;
  assignedTo?: string;
  city?: string;
  clientType?: "company" | "individual";
  company_name?: string;
  countryCode?: string;
  defaultPaymentTerms?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
  postalCode?: string;
  source?: string;
  stateProvince?: string;
  tags?: string[];
  taxExempt?: boolean;
  taxId?: string;
  website?: string;
}

export interface CreateClientContactInput {
  email?: string;
  first_name: string;
  isBillingContact?: boolean;
  isPrimary?: boolean;
  last_name: string;
  notes?: string;
  phone?: string;
  phoneMobile?: string;
  title?: string;
}

export interface CreateClientInteractionInput {
  description?: string;
  followUpDate?: string;
  interactionType: string;
  subject?: string;
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

  const clients = (await listClients()).data;

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
  const clients = (await listClients()).data;

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

  const clients = (await listClients()).data;

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
      throw new Error(
        result.message || `Failed to remove tag from client ${client.id}`
      );
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
  const contacts = (await listClientContacts()).data;

  // Get preferences
  const preferences = (await listClientPreferences()).data;

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
    revenueResult._sum.totalAmount === null
      ? null
      : { total: revenueResult._sum.totalAmount.toString() };

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
    companyName:
      input.company_name === undefined
        ? existingClient.company_name || ""
        : input.company_name?.trim() || "",
    firstName:
      input.first_name === undefined
        ? existingClient.first_name || ""
        : input.first_name?.trim() || "",
    lastName:
      input.last_name === undefined
        ? existingClient.last_name || ""
        : input.last_name?.trim() || "",
    email:
      input.email === undefined
        ? existingClient.email || ""
        : input.email?.trim() || "",
    phone:
      input.phone === undefined
        ? existingClient.phone || ""
        : input.phone?.trim() || "",
    website:
      input.website === undefined
        ? existingClient.website || ""
        : input.website?.trim() || "",
    addressLine1:
      input.addressLine1 === undefined
        ? existingClient.addressLine1 || ""
        : input.addressLine1?.trim() || "",
    addressLine2:
      input.addressLine2 === undefined
        ? existingClient.addressLine2 || ""
        : input.addressLine2?.trim() || "",
    city:
      input.city === undefined
        ? existingClient.city || ""
        : input.city?.trim() || "",
    stateProvince:
      input.stateProvince === undefined
        ? existingClient.stateProvince || ""
        : input.stateProvince?.trim() || "",
    postalCode:
      input.postalCode === undefined
        ? existingClient.postalCode || ""
        : input.postalCode?.trim() || "",
    countryCode:
      input.countryCode === undefined
        ? existingClient.countryCode || ""
        : input.countryCode?.trim() || "",
    defaultPaymentTerms:
      input.defaultPaymentTerms === undefined
        ? (existingClient.defaultPaymentTerms ?? 30)
        : input.defaultPaymentTerms,
    taxExempt:
      input.taxExempt === undefined
        ? (existingClient.taxExempt ?? false)
        : input.taxExempt,
    taxId:
      input.taxId === undefined
        ? existingClient.taxId || ""
        : input.taxId?.trim() || "",
    notes:
      input.notes === undefined
        ? existingClient.notes || ""
        : input.notes?.trim() || "",
    tags: input.tags === undefined ? existingClient.tags || [] : input.tags,
    source:
      input.source === undefined
        ? existingClient.source || ""
        : input.source?.trim() || "",
    assignedTo:
      input.assignedTo === undefined
        ? existingClient.assignedTo || ""
        : input.assignedTo || "",
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

  const contacts = (await listClientContacts()).data;

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
      firstName:
        input.first_name === undefined
          ? existing.first_name || ""
          : input.first_name.trim(),
      lastName:
        input.last_name === undefined
          ? existing.last_name || ""
          : input.last_name.trim(),
      title:
        input.title === undefined
          ? existing.title || ""
          : input.title?.trim() || "",
      email:
        input.email === undefined
          ? existing.email || ""
          : input.email?.trim() || "",
      phone:
        input.phone === undefined
          ? existing.phone || ""
          : input.phone?.trim() || "",
      phoneMobile:
        input.phoneMobile === undefined
          ? existing.phoneMobile || ""
          : input.phoneMobile?.trim() || "",
      isBillingContact:
        input.isBillingContact === undefined
          ? (existing.isBillingContact ?? false)
          : input.isBillingContact,
      notes:
        input.notes === undefined
          ? existing.notes || ""
          : input.notes?.trim() || "",
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

  const interactions = (await listClientInteractions()).data;

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
  description?: string;
  followUpCompleted?: boolean;
  followUpDate?: string;
  interactionType?: string;
  subject?: string;
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
        input.interactionType === undefined
          ? existingInteraction.interactionType || ""
          : input.interactionType.trim(),
      subject:
        input.subject === undefined
          ? existingInteraction.subject || ""
          : input.subject?.trim() || "",
      description:
        input.description === undefined
          ? existingInteraction.description || ""
          : input.description?.trim() || "",
      followUpDate:
        input.followUpDate === undefined
          ? existingInteraction.followUpDate
            ? new Date(existingInteraction.followUpDate).getTime()
            : null
          : input.followUpDate
            ? new Date(input.followUpDate).getTime()
            : null,
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

  const events = (await listCateringOrders()).data;

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
  notes?: string;
  preferenceKey: string;
  preferenceType: string;
  preferenceValue:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[];
}

export interface UpdateClientPreferenceInput {
  notes?: string;
  preferenceKey?: string;
  preferenceType?: string;
  preferenceValue?:
    | string
    | number
    | boolean
    | Record<string, unknown>
    | unknown[];
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
      input.preferenceValue === undefined
        ? existing.preferenceValue
        : (input.preferenceValue as string),
    notes:
      input.notes === undefined
        ? existing.notes || ""
        : input.notes?.trim() || "",
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
