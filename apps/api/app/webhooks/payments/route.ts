import { analytics } from "@repo/analytics/server";
import { clerkClient } from "@repo/auth/server";
import { database } from "@repo/database";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import type { Stripe } from "@repo/payments";
import { stripe } from "@repo/payments";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/env";

const getUserFromCustomerId = async (customerId: string) => {
  const clerk = await clerkClient();
  const users = await clerk.users.getUserList();

  const user = users.data.find(
    (currentUser) => currentUser.privateMetadata.stripeCustomerId === customerId
  );

  return user;
};

const handleCheckoutSessionCompleted = async (
  data: Stripe.Checkout.Session
) => {
  if (!data.customer) {
    return;
  }

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);

  if (!user) {
    return;
  }

  analytics.capture({
    distinctId: user.id,
    event: "billing:checkout_completed",
    properties: {
      plan: data.metadata?.plan ?? "unknown",
      interval: data.metadata?.interval ?? "monthly",
      amount_cents: data.amount_total,
    },
  });
};

const handleSubscriptionScheduleCanceled = async (
  data: Stripe.SubscriptionSchedule
) => {
  if (!data.customer) {
    return;
  }

  const customerId =
    typeof data.customer === "string" ? data.customer : data.customer.id;
  const user = await getUserFromCustomerId(customerId);

  if (!user) {
    return;
  }

  analytics.capture({
    distinctId: user.id,
    event: "billing:subscription_cancelled",
    properties: {
      plan:
        (typeof data.subscription === "object" && data.subscription !== null
          ? data.subscription.metadata?.plan
          : undefined) ?? "unknown",
    },
  });
};

const handlePaymentIntentSucceeded = async (data: Stripe.PaymentIntent) => {
  const tenantId = data.metadata?.tenantId;
  const paymentId = data.metadata?.paymentId;

  if (!(tenantId && paymentId)) {
    return;
  }

  try {
    const payment = await database.payment.findFirst({
      where: { tenantId, id: paymentId, deletedAt: null },
    });

    if (!payment || payment.status === "COMPLETED") {
      return;
    }

    await database.payment.update({
      where: { tenantId_id: { tenantId, id: paymentId } },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        completedAt: new Date(),
        gatewayTransactionId: data.id,
      },
    });

    if (payment.invoiceId) {
      const invoice = await database.invoice.findFirst({
        where: { tenantId, id: payment.invoiceId, deletedAt: null },
      });

      if (invoice) {
        const paymentAmount = Number(payment.amount);
        const currentAmountPaid = Number(invoice.amountPaid);
        const currentAmountDue = Number(invoice.amountDue);

        await database.invoice.update({
          where: { tenantId_id: { tenantId, id: payment.invoiceId } },
          data: {
            amountPaid: currentAmountPaid + paymentAmount,
            amountDue: currentAmountDue - paymentAmount,
            status:
              Math.abs(currentAmountDue - paymentAmount) < 0.01
                ? "PAID"
                : "PARTIALLY_PAID",
            ...(Math.abs(currentAmountDue - paymentAmount) < 0.01
              ? { paidAt: new Date() }
              : {}),
          },
        });
      }
    }
  } catch (error) {
    log.error("Failed to reconcile payment_intent.succeeded", { error });
  }
};

const handlePaymentIntentFailed = async (data: Stripe.PaymentIntent) => {
  const tenantId = data.metadata?.tenantId;
  const paymentId = data.metadata?.paymentId;

  if (!(tenantId && paymentId)) {
    return;
  }

  try {
    const payment = await database.payment.findFirst({
      where: { tenantId, id: paymentId, deletedAt: null },
    });

    if (!payment || payment.status === "FAILED") {
      return;
    }

    await database.payment.update({
      where: { tenantId_id: { tenantId, id: paymentId } },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        gatewayTransactionId: data.id,
      },
    });
  } catch (error) {
    log.error("Failed to reconcile payment_intent.payment_failed", { error });
  }
};

export const POST = async (request: Request): Promise<Response> => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    log.warn("[StripeWebhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { message: "Webhook not configured", ok: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.text();
    const headerPayload = await headers();
    const signature = headerPayload.get("stripe-signature");

    if (!signature) {
      throw new Error("missing stripe-signature header");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
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
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentIntentFailed(event.data.object);
        break;
      }
      default: {
        log.warn(`Unhandled event type ${event.type}`);
      }
    }

    await analytics.shutdown();

    return NextResponse.json({ result: event, ok: true });
  } catch (error) {
    const message = parseError(error);

    log.error(message);

    return NextResponse.json(
      {
        message: "something went wrong",
        ok: false,
      },
      { status: 500 }
    );
  }
};
