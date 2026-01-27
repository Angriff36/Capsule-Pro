import { auth } from "@repo/auth/server";
import { Header } from "../../../../components/header";
import { MenuEditor } from "../components/menu-editor";

export default async function NewMenuPage() {
  const { userId } = await auth();

  if (!userId) {
    // This should be handled by middleware, but double-check
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        page="Create New Menu"
        pages={["Kitchen Ops", "Recipes", "Menus"]}
      />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <MenuEditor />
        </div>
      </div>
    </div>
  );
}
