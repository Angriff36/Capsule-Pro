import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { BudgetsPageClient } from "./budgets-page-client";

const BudgetsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header page="Budgets" pages={["Operations", "Events"]} />
      <BudgetsPageClient />
    </>
  );
};

export default BudgetsPage;
