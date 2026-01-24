"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getClients = getClients;
exports.getClientCount = getClientCount;
exports.getClientById = getClientById;
exports.createClient = createClient;
exports.updateClient = updateClient;
exports.deleteClient = deleteClient;
exports.getClientContacts = getClientContacts;
exports.createClientContact = createClientContact;
exports.getClientInteractions = getClientInteractions;
exports.createClientInteraction = createClientInteraction;
exports.updateClientInteraction = updateClientInteraction;
exports.deleteClientInteraction = deleteClientInteraction;
exports.getClientEventHistory = getClientEventHistory;
/**
 * Client CRUD Server Actions
 *
 * Server actions for client management operations
 */
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Get list of clients with filters and pagination
 */
async function getClients(filters = {}, page = 1, limit = 50) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  const whereClause = {
    AND: [{ tenantId }, { deletedAt: null }],
  };
  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    whereClause.AND.push({
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
    whereClause.AND.push({
      tags: { hasSome: filters.tags },
    });
  }
  // Add assignedTo filter
  if (filters.assignedTo) {
    whereClause.AND.push({
      assignedTo: filters.assignedTo,
    });
  }
  // Add clientType filter
  if (filters.clientType) {
    whereClause.AND.push({
      clientType: filters.clientType,
    });
  }
  // Add source filter
  if (filters.source) {
    whereClause.AND.push({
      source: filters.source,
    });
  }
  const offset = (page - 1) * limit;
  const clients = await database_1.database.client.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });
  const totalCount = await database_1.database.client.count({
    where: whereClause,
  });
  return {
    data: clients,
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
async function getClientCount() {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  const count = await database_1.database.client.count({
    where: {
      AND: [{ tenantId }, { deletedAt: null }],
    },
  });
  return count;
}
/**
 * Get client by ID with full details
 */
async function getClientById(id) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Client ID is required");
  const client = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(client, "Client not found");
  // Get contacts
  const contacts = await database_1.database.clientContact.findMany({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  // Get preferences
  const preferences = await database_1.database.clientPreference.findMany({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
    orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
  });
  // Get interaction count
  const interactionCount = await database_1.database.clientInteraction.count({
    where: {
      AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
    },
  });
  // Get event count
  const eventCount = await database_1.database.cateringOrder.count({
    where: {
      AND: [{ tenantId }, { customer_id: id }, { deletedAt: null }],
    },
  });
  // Get total revenue
  const revenueResult = await database_1.database.cateringOrder.aggregate({
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
 * Create a new client
 */
async function createClient(input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  // Check for duplicate email
  if (input.email && input.email.trim()) {
    const existingClient = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { email: input.email.trim() }, { deletedAt: null }],
      },
    });
    (0, invariant_1.invariant)(
      !existingClient,
      "A client with this email already exists"
    );
  }
  const clientType =
    input.clientType || (input.company_name ? "company" : "individual");
  const client = await database_1.database.client.create({
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
  (0, cache_1.revalidatePath)("/crm/clients");
  return client;
}
/**
 * Update a client
 */
async function updateClient(id, input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Client ID is required");
  // Check if client exists
  const existingClient = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(existingClient, "Client not found");
  // Check for duplicate email if changing
  if (
    input.email &&
    input.email.trim() &&
    input.email !== existingClient.email
  ) {
    const duplicateClient = await database_1.database.client.findFirst({
      where: {
        AND: [
          { tenantId },
          { email: input.email.trim() },
          { deletedAt: null },
          { id: { not: id } },
        ],
      },
    });
    (0, invariant_1.invariant)(
      !duplicateClient,
      "A client with this email already exists"
    );
  }
  const updatedClient = await database_1.database.client.update({
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
  (0, cache_1.revalidatePath)("/crm/clients");
  (0, cache_1.revalidatePath)(`/crm/clients/${id}`);
  return updatedClient;
}
/**
 * Delete a client (soft delete)
 */
async function deleteClient(id) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Client ID is required");
  const existingClient = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(existingClient, "Client not found");
  await database_1.database.client.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: { deletedAt: new Date() },
  });
  (0, cache_1.revalidatePath)("/crm/clients");
  return { success: true };
}
/**
 * Get client contacts
 */
async function getClientContacts(clientId) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  const contacts = await database_1.database.clientContact.findMany({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return contacts;
}
/**
 * Create a client contact
 */
async function createClientContact(clientId, input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  // Verify client exists
  const client = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(client, "Client not found");
  // If setting as primary, unset existing primary
  if (input.isPrimary) {
    await database_1.database.clientContact.updateMany({
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
    await database_1.database.clientContact.updateMany({
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
  const contact = await database_1.database.clientContact.create({
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
  (0, cache_1.revalidatePath)(`/crm/clients/${clientId}`);
  return contact;
}
/**
 * Get client interactions
 */
async function getClientInteractions(clientId, limit = 50, offset = 0) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  const interactions = await database_1.database.clientInteraction.findMany({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
    orderBy: [{ interactionDate: "desc" }],
    take: limit,
    skip: offset,
  });
  const totalCount = await database_1.database.clientInteraction.count({
    where: {
      AND: [{ tenantId }, { clientId }, { deletedAt: null }],
    },
  });
  return {
    data: interactions,
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
async function createClientInteraction(clientId, input) {
  const { orgId, userId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  // Verify client exists
  const client = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(client, "Client not found");
  // Note: Using userId since Employee model doesn't exist in schema
  // TODO: Add Employee model and proper employee lookup
  (0, invariant_1.invariant)(userId, "User ID not found");
  const interaction = await database_1.database.clientInteraction.create({
    data: {
      tenantId,
      clientId,
      employeeId: userId,
      interactionType: input.interactionType.trim(),
      subject: input.subject?.trim() || null,
      description: input.description?.trim() || null,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
    },
  });
  (0, cache_1.revalidatePath)(`/crm/clients/${clientId}`);
  return interaction;
}
/**
 * Update a client interaction
 */
async function updateClientInteraction(clientId, interactionId, input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  (0, invariant_1.invariant)(interactionId, "Interaction ID is required");
  // Verify client exists
  const client = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(client, "Client not found");
  // Verify interaction exists and belongs to this client
  const existingInteraction =
    await database_1.database.clientInteraction.findFirst({
      where: {
        AND: [
          { tenantId },
          { id: interactionId },
          { clientId },
          { deletedAt: null },
        ],
      },
    });
  (0, invariant_1.invariant)(existingInteraction, "Interaction not found");
  // Build update data with only provided fields
  const updateData = {};
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
  const updatedInteraction = await database_1.database.clientInteraction.update(
    {
      where: {
        tenantId_id: { tenantId, id: interactionId },
      },
      data: updateData,
    }
  );
  (0, cache_1.revalidatePath)(`/crm/clients/${clientId}`);
  return updatedInteraction;
}
/**
 * Delete a client interaction (soft delete)
 */
async function deleteClientInteraction(clientId, interactionId) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  (0, invariant_1.invariant)(interactionId, "Interaction ID is required");
  // Verify client exists
  const client = await database_1.database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(client, "Client not found");
  // Verify interaction exists and belongs to this client
  const existingInteraction =
    await database_1.database.clientInteraction.findFirst({
      where: {
        AND: [
          { tenantId },
          { id: interactionId },
          { clientId },
          { deletedAt: null },
        ],
      },
    });
  (0, invariant_1.invariant)(existingInteraction, "Interaction not found");
  await database_1.database.clientInteraction.update({
    where: {
      tenantId_id: { tenantId, id: interactionId },
    },
    data: { deletedAt: new Date() },
  });
  (0, cache_1.revalidatePath)(`/crm/clients/${clientId}`);
  return { success: true };
}
/**
 * Get client event history
 */
async function getClientEventHistory(clientId, limit = 50, offset = 0) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(clientId, "Client ID is required");
  const events = await database_1.database.cateringOrder.findMany({
    where: {
      AND: [{ tenantId }, { customer_id: clientId }, { deletedAt: null }],
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });
  const totalCount = await database_1.database.cateringOrder.count({
    where: {
      AND: [{ tenantId }, { customer_id: clientId }, { deletedAt: null }],
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
