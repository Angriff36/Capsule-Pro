Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const server_1 = require("@repo/analytics/server");
const log_1 = require("@repo/observability/log");
const headers_1 = require("next/headers");
const server_2 = require("next/server");
const svix_1 = require("svix");
const env_1 = require("@/env");
const handleUserCreated = (data) => {
  server_1.analytics.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });
  server_1.analytics.capture({
    event: "User Created",
    distinctId: data.id,
  });
  return new Response("User created", { status: 201 });
};
const handleUserUpdated = (data) => {
  server_1.analytics.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });
  server_1.analytics.capture({
    event: "User Updated",
    distinctId: data.id,
  });
  return new Response("User updated", { status: 201 });
};
const handleUserDeleted = (data) => {
  if (data.id) {
    server_1.analytics.identify({
      distinctId: data.id,
      properties: {
        deleted: new Date(),
      },
    });
    server_1.analytics.capture({
      event: "User Deleted",
      distinctId: data.id,
    });
  }
  return new Response("User deleted", { status: 201 });
};
const handleOrganizationCreated = (data) => {
  server_1.analytics.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });
  if (data.created_by) {
    server_1.analytics.capture({
      event: "Organization Created",
      distinctId: data.created_by,
    });
  }
  return new Response("Organization created", { status: 201 });
};
const handleOrganizationUpdated = (data) => {
  server_1.analytics.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });
  if (data.created_by) {
    server_1.analytics.capture({
      event: "Organization Updated",
      distinctId: data.created_by,
    });
  }
  return new Response("Organization updated", { status: 201 });
};
const handleOrganizationMembershipCreated = (data) => {
  server_1.analytics.groupIdentify({
    groupKey: data.organization.id,
    groupType: "company",
    distinctId: data.public_user_data.user_id,
  });
  server_1.analytics.capture({
    event: "Organization Member Created",
    distinctId: data.public_user_data.user_id,
  });
  return new Response("Organization membership created", { status: 201 });
};
const handleOrganizationMembershipDeleted = (data) => {
  // Need to unlink the user from the group
  server_1.analytics.capture({
    event: "Organization Member Deleted",
    distinctId: data.public_user_data.user_id,
  });
  return new Response("Organization membership deleted", { status: 201 });
};
const POST = async (request) => {
  if (!env_1.env.CLERK_WEBHOOK_SECRET) {
    return server_2.NextResponse.json({ message: "Not configured", ok: false });
  }
  // Get the headers
  const headerPayload = await (0, headers_1.headers)();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  // If there are no headers, error out
  if (!(svixId && svixTimestamp && svixSignature)) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }
  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);
  // Create a new SVIX instance with your secret.
  const webhook = new svix_1.Webhook(env_1.env.CLERK_WEBHOOK_SECRET);
  let event;
  // Verify the payload with the headers
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (error) {
    log_1.log.error("Error verifying webhook:", { error });
    return new Response("Error occured", {
      status: 400,
    });
  }
  // Get the ID and type
  const { id } = event.data;
  const eventType = event.type;
  log_1.log.info("Webhook", { id, eventType, body });
  let response = new Response("", { status: 201 });
  switch (eventType) {
    case "user.created": {
      response = handleUserCreated(event.data);
      break;
    }
    case "user.updated": {
      response = handleUserUpdated(event.data);
      break;
    }
    case "user.deleted": {
      response = handleUserDeleted(event.data);
      break;
    }
    case "organization.created": {
      response = handleOrganizationCreated(event.data);
      break;
    }
    case "organization.updated": {
      response = handleOrganizationUpdated(event.data);
      break;
    }
    case "organizationMembership.created": {
      response = handleOrganizationMembershipCreated(event.data);
      break;
    }
    case "organizationMembership.deleted": {
      response = handleOrganizationMembershipDeleted(event.data);
      break;
    }
    default: {
      break;
    }
  }
  await server_1.analytics.shutdown();
  return response;
};
exports.POST = POST;
