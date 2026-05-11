import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
	manifestErrorResponse,
	manifestSuccessResponse,
} from "@/lib/manifest-response";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const { userId, orgId } = await auth();
	if (!(userId && orgId)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const tenantId = await getTenantIdForOrg(orgId);
	if (!tenantId) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { searchParams } = request.nextUrl;
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Math.min(Number(searchParams.get("limit") ?? "25"), 100);
	const status = searchParams.get("status");
	const search = searchParams.get("search");

	const where = {
		tenantId,
		deletedAt: null,
		...(status && status !== "all" ? { status } : {}),
		...(search
			? {
					OR: [
						{ itemName: { contains: search, mode: "insensitive" as const } },
						{ itemNumber: { contains: search, mode: "insensitive" as const } },
						{ reportType: { contains: search, mode: "insensitive" as const } },
					],
				}
			: {}),
	};

	const [reports, total] = await Promise.all([
		database.varianceReport.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		database.varianceReport.count({ where }),
	]);

	const totalPages = Math.ceil(total / limit);

	return manifestSuccessResponse({
		data: reports.map((r) => ({
			id: r.id,
			sessionId: r.sessionId,
			reportType: r.reportType,
			itemId: r.itemId,
			itemNumber: r.itemNumber,
			itemName: r.itemName,
			expectedQuantity: r.expectedQuantity.toString(),
			countedQuantity: r.countedQuantity.toString(),
			variance: r.variance.toString(),
			variancePct: r.variancePct.toString(),
			accuracyScore: r.accuracyScore.toString(),
			status: r.status,
			adjustmentType: r.adjustmentType ?? null,
			adjustmentAmount: r.adjustmentAmount?.toString() ?? null,
			adjustmentDate: r.adjustmentDate?.toISOString() ?? null,
			notes: r.notes ?? null,
			generatedAt: r.generatedAt.toISOString(),
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString(),
		})),
		pagination: { page, limit, total, totalPages },
	});
}
