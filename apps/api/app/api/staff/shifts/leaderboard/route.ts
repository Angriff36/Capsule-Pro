import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

interface LeaderboardRow {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "50"), 1),
      200
    );
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(now.getUTCDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

    const shiftCounts = await database.scheduleShift.groupBy({
      by: ["employeeId"],
      where: {
        tenantId,
        deletedAt: null,
        shift_start: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          employeeId: "desc",
        },
      },
      take: limit,
    });

    const employees = await database.user.findMany({
      where: {
        tenantId,
        id: { in: shiftCounts.map((row) => row.employeeId) },
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
    const leaderboard: LeaderboardRow[] = shiftCounts
      .map((row) => {
        const employee = employeesById.get(row.employeeId);
        return {
          employee_id: row.employeeId,
          first_name: employee?.firstName ?? null,
          last_name: employee?.lastName ?? null,
          role: employee?.role ?? null,
          shift_count: row._count._all,
        };
      })
      .sort(
        (a, b) =>
          b.shift_count - a.shift_count ||
          (a.last_name ?? "").localeCompare(b.last_name ?? "")
      );

    return NextResponse.json({ data: leaderboard });
  } catch (error) {
    log.error("Error fetching shift leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
