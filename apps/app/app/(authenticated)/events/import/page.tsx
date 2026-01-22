import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { importEvent } from "../actions";

const ImportEventPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  return (
    <>
      <Header page="Import event" pages={["Operations", "Events"]}>
        <Button asChild variant="ghost">
          <Link href="/events">Back to events</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Upload a CSV or PDF</CardTitle>
            <CardDescription>
              CSVs with prep list or dish columns are supported. PDFs will
              create a placeholder event for manual review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={importEvent} className="flex flex-col gap-4">
              <Input
                accept=".csv,.pdf,image/*"
                name="file"
                required
                type="file"
              />
              <Button type="submit">Import event</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ImportEventPage;
