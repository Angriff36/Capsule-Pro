import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  OperationalRow,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { SparklesIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface LeaderboardRow {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
}

function formatName(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

export default async function LeaderboardPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const leaderboard = await database.$queryRaw<LeaderboardRow[]>(
    Prisma.sql`
    SELECT
      s.employee_id,
      e.first_name,
      e.last_name,
      e.role,
      COUNT(*)::int AS shift_count
    FROM tenant_staff.schedule_shifts s
    JOIN tenant_staff.employees e
      ON e.tenant_id = s.tenant_id
      AND e.id = s.employee_id
    WHERE s.tenant_id = ${tenantId}
      AND s.deleted_at IS NULL
      AND s.shift_start >= date_trunc('week', CURRENT_DATE)
      AND s.shift_start < date_trunc('week', CURRENT_DATE) + interval '1 week'
    GROUP BY s.employee_id, e.first_name, e.last_name, e.role
    ORDER BY shift_count DESC, e.last_name ASC
    `
  );

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Scheduling</MonoLabel>
            <DisplayHeading>Shift Leaderboard</DisplayHeading>
            <CommandBandLede>
              Weekly shift battle arena — first-come shift claiming, ranked by
              completed shifts.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${leaderboard.length} participants`}
            description="Ranked by shifts claimed and completed this week."
            eyebrow="Battle arena"
            title={
              <span className="inline-flex items-center gap-2">
                <SparklesIcon
                  aria-hidden
                  className="size-5 text-muted-foreground"
                />
                This week's rankings
              </span>
            }
          />

          {leaderboard.length === 0 ? (
            <OperationalRow density="compact">
              <p className="text-sm text-muted-foreground">
                No shift activity yet this week. The board fills as people claim
                open shifts.
              </p>
            </OperationalRow>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((person, index) => {
                const fullName = formatName(
                  person.first_name,
                  person.last_name
                );
                return (
                  <OperationalRow
                    density="comfortable"
                    key={person.employee_id}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-10 text-right font-mono text-2xl tabular-nums text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Avatar className="size-12">
                        <AvatarImage alt={fullName} src="" />
                        <AvatarFallback>{fullName.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-ink">
                          {fullName}
                        </div>
                        <div className="text-muted-foreground text-xs tabular-nums">
                          {person.shift_count} shifts this week
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {person.role ? (
                          <Badge variant="default">{person.role}</Badge>
                        ) : null}
                        {index === 0 ? (
                          <Badge variant="success">Lead</Badge>
                        ) : index < 3 ? (
                          <Badge variant="outline">Top performer</Badge>
                        ) : null}
                      </div>
                    </div>
                  </OperationalRow>
                );
              })}
            </div>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
