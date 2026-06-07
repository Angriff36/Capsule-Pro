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
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

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
    // Read bypasses Manifest per constitution §10
    const payment = await database.payment.findFirst({
      where: { tenantId, id: paymentId, deletedAt: null },
    });

    if (!payment || payment.status === "COMPLETED") {
      return;
    }

    // Synthetic system-user context for webhook (no Clerk auth)
    const systemUser = { id: "system", tenantId, role: "admin" };

    // Governed write: Payment.process
    const processResult = await runManifestCommand({
      entity: "Payment",
      command: "process",
      body: { id: paymentId, tenantId, gatewayTransactionId: data.id },
      user: systemUser,
    });

    if (!processResult.ok) {
      const errorText = await processResult.text();
      log.error("Manifest Payment.process failed", { errorText, paymentId, tenantId });
      return;
    }

    if (payment.invoiceId) {
      // Read bypasses Manifest per constitution §10
      const invoice = await database.invoice.findFirst({
        where: { tenantId, id: payment.invoiceId, deletedAt: null },
      });

      if (invoice) {
        const paymentAmount = Number(payment.amount);
        const currentAmountDue = Number(invoice.amountDue);

        // Governed write: Invoice.applyPayment
        const applyResult = await runManifestCommand({
          entity: "Invoice",
          command: "applyPayment",
          body: {
            id: payment.invoiceId,
            tenantId,
            paymentAmount,
            paymentId,
          },
          user: systemUser,
        });

        if (!applyResult.ok) {
          const errorText = await applyResult.text();
          log.error("Manifest Invoice.applyPayment failed", { errorText, invoiceId: payment.invoiceId, tenantId });
          return;
        }

        // If the invoice is now fully paid, transition to PAID status
        if (Math.abs(currentAmountDue - paymentAmount) < 0.01) {
          const markPaidResult = await runManifestCommand({
            entity: "Invoice",
            command: "markAsPaid",
            body: { id: payment.invoiceId, tenantId },
            user: systemUser,
          });

          if (!markPaidResult.ok) {
            const errorText = await markPaidResult.text();
            log.error("Manifest Invoice.markAsPaid failed", { errorText, invoiceId: payment.invoiceId, tenantId });
          }
        }
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
    // Read bypasses Manifest per constitution §10
    const payment = await database.payment.findFirst({
      where: { tenantId, id: paymentId, deletedAt: null },
    });

    if (!payment || payment.status === "FAILED") {
      return;
    }

    // Synthetic system-user context for webhook (no Clerk auth)
    const systemUser = { id: "system", tenantId, role: "admin" };

    // Governed write: Payment.processFailed
    const result = await runManifestCommand({
      entity: "Payment",
      command: "processFailed",
      body: { id: paymentId, tenantId },
      user: systemUser,
    });

    if (!result.ok) {
      const errorText = await result.text();
      log.error("Manifest Payment.processFailed failed", { errorText, paymentId, tenantId });
    }
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
