import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
	manifestErrorResponse,
	manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { database } from "@repo/database";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";

// GET /api/communications/sms/automation-rules - List all SMS automation rules
export async function GET(request: NextRequest) {
	try {
		const { userId, orgId } = await auth();
		if (!userId || !orgId) {
			return manifestErrorResponse("Unauthorized", 401);
		}

		const tenantId = await getTenantIdForOrg(orgId);
		if (!tenantId) {
			return manifestErrorResponse("Tenant not found", 400);
		}

		const searchParams = request.nextUrl.searchParams;
		const isActiveParam = searchParams.get("isActive");
		const triggerType = searchParams.get("triggerType");
		const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
		const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

		const where: Record<string, unknown> = {
			tenant_id: tenantId,
			deleted_at: null,
		};

		if (isActiveParam !== null) {
			where.is_active = isActiveParam === "true";
		}

		if (triggerType) {
			where.trigger_type = triggerType;
		}

		const [rules, total] = await Promise.all([
			database.sms_automation_rules.findMany({
				where,
				orderBy: [{ priority: "asc" }, { created_at: "desc" }],
				take: limit,
				skip: offset,
			}),
			database.sms_automation_rules.count({ where }),
		]);

		return manifestSuccessResponse({
			rules: rules.map((rule) => ({
				id: rule.id,
				tenantId: rule.tenant_id,
				name: rule.name,
				description: rule.description,
				triggerType: rule.trigger_type,
				triggerConfig: rule.trigger_config,
				templateId: rule.template_id,
				customMessage: rule.custom_message,
				recipientType: rule.recipient_type,
				recipientConfig: rule.recipient_config,
				isActive: rule.is_active,
				priority: rule.priority,
				createdAt: rule.created_at?.toISOString() ?? null,
				updatedAt: rule.updated_at?.toISOString() ?? null,
			})),
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + limit < total,
			},
		});
	} catch (error) {
		console.error("Error listing SMS automation rules:", error);
		return manifestErrorResponse("Internal server error", 500);
	}
}

// POST /api/communications/sms/automation-rules - Create a new SMS automation rule
export async function POST(request: NextRequest) {
	try {
		const { userId, orgId } = await auth();
		if (!userId || !orgId) {
			return manifestErrorResponse("Unauthorized", 401);
		}

		const tenantId = await getTenantIdForOrg(orgId);
		if (!tenantId) {
			return manifestErrorResponse("Tenant not found", 400);
		}

		const body = await request.json();
		const {
			name,
			description,
			triggerType,
			triggerConfig,
			templateId,
			customMessage,
			recipientType,
			recipientConfig,
			isActive,
			priority,
		} = body;

		if (!name || !triggerType) {
			return manifestErrorResponse(
				"Rule name and trigger type are required",
				400,
			);
		}

		if (!templateId && !customMessage) {
			return manifestErrorResponse(
				"Either templateId or customMessage is required",
				400,
			);
		}

		const runtime = await createManifestRuntime({
			user: { id: userId, tenantId },
		});

		const result = await runtime.runCommand("create", body, {
			entityName: "SmsAutomationRule",
		});

		if (!result.success) {
			if (result.policyDenial) {
				return manifestErrorResponse(
					`Access denied: ${result.policyDenial.policyName}`,
					403,
				);
			}
			if (result.guardFailure) {
				return manifestErrorResponse(
					`Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
					422,
				);
			}
			return manifestErrorResponse(result.error ?? "Command failed", 400);
		}

		// Create the rule in the database
		const rule = await database.sms_automation_rules.create({
			data: {
				tenant_id: tenantId,
				name,
				description: description || null,
				trigger_type: triggerType,
				trigger_config: triggerConfig || {},
				template_id: templateId || null,
				custom_message: customMessage || null,
				recipient_type: recipientType || "employee",
				recipient_config: recipientConfig || {},
				is_active: isActive ?? true,
				priority: priority ?? 100,
			},
		});

		return manifestSuccessResponse({
			rule: {
				id: rule.id,
				tenantId: rule.tenant_id,
				name: rule.name,
				description: rule.description,
				triggerType: rule.trigger_type,
				triggerConfig: rule.trigger_config,
				templateId: rule.template_id,
				customMessage: rule.custom_message,
				recipientType: rule.recipient_type,
				recipientConfig: rule.recipient_config,
				isActive: rule.is_active,
				priority: rule.priority,
				createdAt: rule.created_at?.toISOString() ?? null,
				updatedAt: rule.updated_at?.toISOString() ?? null,
			},
			events: result.emittedEvents,
		});
	} catch (error) {
		console.error("Error creating SMS automation rule:", error);
		return manifestErrorResponse("Internal server error", 500);
	}
}
