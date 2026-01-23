import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { Header } from "../../../../components/header";
import { BudgetDetailClient } from "./budget-detail-client";

type BudgetDetailPageProps = {
  params: Promise<{
    budgetId: string;
  }>;
};

const BudgetDetailPage = async ({ params }: BudgetDetailPageProps) => {
  const { budgetId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch the budget with related data
  const budget = await database.eventBudget.findFirst({
    where: {
      AND: [{ tenantId }, { id: budgetId }, { deletedAt: null }],
    },
  });

  if (!budget) {
    notFound();
  }

  return (
    <>
      <Header page="Budget Details" pages={["Operations", "Events", "Budgets"]}>
        <a
          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          href="/events/budgets"
        >
          Back to Budgets
        </a>
      </Header>
      <BudgetDetailClient budgetId={budgetId} tenantId={tenantId} />
    </>
  );
};

export default BudgetDetailPage;
