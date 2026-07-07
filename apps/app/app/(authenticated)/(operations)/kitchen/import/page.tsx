import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { OperationalPageShell } from "../../../components/operational-page-shell";
import { Header } from "../../../components/header";
import { KitchenImportClient } from "./kitchen-import-client";

const KitchenImportPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header
        page="Bulk Import"
        pages={[{ label: "Kitchen", href: "/kitchen" }]}
      />
      <OperationalPageShell
        description="Bulk import recipes, ingredients, and kitchen data."
        eyebrow="Kitchen / Import"
        title="Bulk import"
        withCanvas={false}
      >
        <KitchenImportClient />
      </OperationalPageShell>
    </>
  );
};

export default KitchenImportPage;
