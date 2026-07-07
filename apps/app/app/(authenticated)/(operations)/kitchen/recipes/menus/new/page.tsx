import { auth } from "@repo/auth/server";
import { Header } from "../../../../../components/header";
import { NewMenuFormClient } from "../components/new-menu-form-client";

export default async function NewMenuPage() {
  const { userId } = await auth();

  if (!userId) {
    // This should be handled by middleware, but double-check
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        page="Create New Menu"
        pages={["Kitchen Ops", "Recipes", "Menus"]}
      />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          <NewMenuFormClient />
        </div>
      </div>
    </div>
  );
}
