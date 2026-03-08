/**
 * Cron endpoint for automatic webhook retry processing.
 *
 * This should be called by a scheduled job (Vercel Cron, external scheduler, etc.)
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * GET /api/cron/webhook-retry
 *
 * Authentication: Authorization: Bearer <CRON_SECRET>
 * - If CRON_SECRET env var is not set, returns 503 (not configured)
 * - If header doesn't match, returns 401 (unauthorized)
 *
 * Response: { processed: number, success: number, failed: number, timestamp: string }
 */

import { database, type Prisma } from "@repo/database";
import {
	determineNextStatus,
	sendWebhook,
	shouldAutoDisable,
	type WebhookPayload,
} from "@repo/notifications";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

// Force dynamic rendering — this route reads Authorization headers at runtime
// and calls the database. Static optimization would fail at build time.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Configuration
const MAX_RETRIES_PER_RUN = 100;

export async function GET(request: Request): Promise<NextResponse> {
	const cronSecret = process.env.CRON_SECRET;

	// If CRON_SECRET is not configured, the endpoint is not available
	if (!cronSecret) {
		console.error(
			"[webhook-retry] CRON_SECRET environment variable is not configured",
		);
		return NextResponse.json(
			{ error: "Cron endpoint not configured" },
			{ status: 503 },
		);
	}

	// Validate the Authorization header
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${cronSecret}`) {
		console.error(
			"[webhook-retry] Unauthorized request — invalid or missing Authorization header",
		);
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// Find all deliveries ready for retry across all tenants
		const deliveries = await database.webhookDeliveryLog.findMany({
			where: {
				status: "retrying",
				nextRetryAt: { lte: new Date() },
			},
			take: MAX_RETRIES_PER_RUN,
		});

		if (deliveries.length === 0) {
			return NextResponse.json({
				processed: 0,
				success: 0,
				failed: 0,
				timestamp: new Date().toISOString(),
			});
		}

		let successCount = 0;
		let failedCount = 0;

		// Process each delivery
		for (const delivery of deliveries) {
			try {
				// Get the webhook
				const webhook = await database.outboundWebhook.findFirst({
					where: {
						tenantId: delivery.tenantId,
						id: delivery.webhookId,
						deletedAt: null,
					},
				});

				if (!webhook) {
					// Webhook was deleted, mark delivery as failed
					await database.webhookDeliveryLog.update({
						where: {
							tenantId_id: {
								tenantId: delivery.tenantId,
								id: delivery.id,
							},
						},
						data: {
							status: "failed",
							errorMessage: "Webhook configuration was deleted",
							failedAt: new Date(),
						},
					});
					failedCount++;
					continue;
				}

				// Check if webhook is still active
				if (webhook.status !== "active") {
					await database.webhookDeliveryLog.update({
						where: {
							tenantId_id: {
								tenantId: delivery.tenantId,
								id: delivery.id,
							},
						},
						data: {
							status: "failed",
							errorMessage: `Webhook is ${webhook.status}`,
							failedAt: new Date(),
						},
					});
					failedCount++;
					continue;
				}

				// Increment attempt number
				const newAttemptNumber = delivery.attemptNumber + 1;

				// Send webhook
				const payload = delivery.payload as unknown as WebhookPayload;

				const result = await sendWebhook(
					{
						url: webhook.url,
						secret: webhook.secret,
						apiKey: webhook.apiKey,
						timeoutMs: webhook.timeoutMs,
						customHeaders:
							webhook.customHeaders as Record<string, string> | null,
					},
					payload,
				);

				// Determine next status
				const { status, nextRetryAt } = determineNextStatus(
					newAttemptNumber,
					webhook.retryCount,
					result,
				);

				// Update delivery log
				await database.webhookDeliveryLog.update({
					where: {
						tenantId_id: {
							tenantId: delivery.tenantId,
							id: delivery.id,
						},
					},
					data: {
						status,
						attemptNumber: newAttemptNumber,
						httpResponseStatus: result.httpStatus,
						responseBody: result.responseBody,
						errorMessage: result.errorMessage,
						nextRetryAt,
						deliveredAt: status === "success" ? new Date() : null,
						failedAt: status === "failed" ? new Date() : null,
					},
				});

				// Move to DLQ if permanently failed
				if (status === "failed") {
					await database.webhookDeadLetterQueue.create({
						data: {
							tenantId: delivery.tenantId,
							webhookId: webhook.id,
							originalDeliveryId: delivery.id,
							eventType: delivery.eventType,
							entityType: delivery.entityType,
							entityId: delivery.entityId,
							payload: delivery.payload as unknown as Prisma.InputJsonValue,
							finalErrorMessage: result.errorMessage,
							totalAttempts: newAttemptNumber,
							originalUrl: webhook.url,
						},
					});
				}

				// Update webhook stats
				const updates: {
					lastSuccessAt?: Date;
					lastFailureAt?: Date;
					consecutiveFailures: number;
					status?: "active" | "inactive" | "disabled";
				} = {
					consecutiveFailures: result.success
						? 0
						: webhook.consecutiveFailures + 1,
				};

				if (result.success) {
					updates.lastSuccessAt = new Date();
					successCount++;
				} else {
					updates.lastFailureAt = new Date();
					failedCount++;

					// Auto-disable if too many consecutive failures
					if (shouldAutoDisable(updates.consecutiveFailures)) {
						updates.status = "disabled";
					}
				}

				await database.outboundWebhook.update({
					where: {
						tenantId_id: {
							tenantId: delivery.tenantId,
							id: webhook.id,
						},
					},
					data: updates,
				});
			} catch (deliveryError) {
				console.error(
					`[webhook-retry] Failed to process delivery ${delivery.id}:`,
					deliveryError,
				);
				failedCount++;
				// Continue processing other deliveries
			}
		}

		console.log(
			`[webhook-retry] Processed ${deliveries.length} webhook retries: ${successCount} success, ${failedCount} failed`,
		);

		return NextResponse.json({
			processed: deliveries.length,
			success: successCount,
			failed: failedCount,
			timestamp: new Date().toISOString(),
		});
	} catch (error: unknown) {
		console.error("[webhook-retry] Failed to process webhook retries:", error);
		captureException(error);

		return NextResponse.json(
			{
				error: "Retry processing failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
