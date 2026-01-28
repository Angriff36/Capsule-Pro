import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { ImportForm } from "./import-form";

const ImportEventPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header page="Import Event Documents" pages={["Events"]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/events">Events</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/events/battle-boards">Battle Boards</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/events/reports">Reports</Link>
          </Button>
        </div>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <ImportForm />
      </div>
    </>
  );
};

export default ImportEventPage;
