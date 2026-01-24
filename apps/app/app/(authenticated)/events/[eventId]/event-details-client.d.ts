import type { Event } from "@repo/database";
import type { PrepTaskSummary } from "./prep-task-contract";
type EventBudgetStatus = "draft" | "approved" | "locked";
type Budget = {
  id: string;
  tenant_id: string;
  event_id: string | null;
  version: number | null;
  status: EventBudgetStatus | null;
  total_budget_amount: number | null;
  total_actual_amount: number | null;
  variance_amount: number | null;
  variance_percentage: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};
type EventDetailsClientProps = {
  budget: Budget | null;
  event: Event;
  prepTasks: PrepTaskSummary[];
  tenantId?: string;
};
export declare function EventDetailsClient({
  budget,
  event,
  prepTasks: initialPrepTasks,
  tenantId,
}: EventDetailsClientProps): import("react").JSX.Element;
//# sourceMappingURL=event-details-client.d.ts.map
