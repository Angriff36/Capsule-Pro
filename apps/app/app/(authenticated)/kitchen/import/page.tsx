import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
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
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <KitchenImportClient />
      </div>
    </>
  );
};

export default KitchenImportPage;
