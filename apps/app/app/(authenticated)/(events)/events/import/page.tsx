import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OperationalPageShell } from "../../../components/operational-page-shell";
import { Header } from "../../../components/header";
import { ImportForm } from "./import-form";

const ImportEventPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header
        page="Import Event Documents"
        pages={[{ label: "Events", href: "/events" }]}
      >
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
      <OperationalPageShell
        description="Import event documents to generate battle boards and pre-event reports."
        eyebrow="Events / Import"
        title="Import event documents"
      >
        <ImportForm />
      </OperationalPageShell>
    </>
  );
};

export default ImportEventPage;
