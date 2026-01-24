Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const server_1 = require("@repo/analytics/server");
const server_2 = require("@repo/auth/server");
const error_1 = require("@repo/observability/error");
const log_1 = require("@repo/observability/log");
const payments_1 = require("@repo/payments");
const headers_1 = require("next/headers");
const server_3 = require("next/server");
const env_1 = require("@/env");
const getUserFromCustomerId = async (customerId) => {
  const clerk = await (0, server_2.clerkClient)();
  const users = await clerk.users.getUserList();
  const user = users.data.find(
    (currentUser) => currentUser.privateMetadata.stripeCustomerId === customerId
  );
  return user;
};
const handleCheckoutSessionCompleted = async (data) => {
  if (!data.customer) {
    return;
  }
  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);
  if (!user) {
    return;
  }
  server_1.analytics.capture({
    event: "User Subscribed",
    distinctId: user.id,
  });
};
const handleSubscriptionScheduleCanceled = async (data) => {
  if (!data.customer) {
    return;
  }
  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);
  if (!user) {
    return;
  }
  server_1.analytics.capture({
    event: "User Unsubscribed",
    distinctId: user.id,
  });
};
const POST = async (request) => {
  if (!env_1.env.STRIPE_WEBHOOK_SECRET) {
    return server_3.NextResponse.json({ message: "Not configured", ok: false });
  }
  try {
    const body = await request.text();
    const headerPayload = await (0, headers_1.headers)();
    const signature = headerPayload.get("stripe-signature");
    if (!signature) {
      throw new Error("missing stripe-signature header");
    }
    const event = payments_1.stripe.webhooks.constructEvent(
      body,
      signature,
      env_1.env.STRIPE_WEBHOOK_SECRET
    );
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      }
      case "subscription_schedule.canceled": {
        await handleSubscriptionScheduleCanceled(event.data.object);
        break;
      }
      default: {
        log_1.log.warn(`Unhandled event type ${event.type}`);
      }
    }
    await server_1.analytics.shutdown();
    return server_3.NextResponse.json({ result: event, ok: true });
  } catch (error) {
    const message = (0, error_1.parseError)(error);
    log_1.log.error(message);
    return server_3.NextResponse.json(
      {
        message: "something went wrong",
        ok: false,
      },
      { status: 500 }
    );
  }
};
exports.POST = POST;
