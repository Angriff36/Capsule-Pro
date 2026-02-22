import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteProposalTemplate,
  duplicateProposalTemplate,
  getProposalTemplates,
} from "./actions";

export default async function ProposalTemplatesPage() {
  const { orgId } = await auth();
  if (!orgId) {
    redirect("/sign-in");
  }

  const templates = await getProposalTemplates();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Proposal Templates
          </h1>
          <p className="text-muted-foreground">
            Manage reusable templates for creating proposals
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/proposals/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Create templates for different event types to speed up proposal
            creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No templates yet. Create your first template to get started.
              </p>
              <Button asChild>
                <Link href="/crm/proposals/templates/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Line Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const lineItems = template.defaultLineItems as unknown[];
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          {template.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.eventType ? (
                          <Badge variant="outline">{template.eventType}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Any</span>
                        )}
                      </TableCell>
                      <TableCell>{lineItems?.length ?? 0} items</TableCell>
                      <TableCell>
                        {template.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={`/crm/proposals/templates/${template.id}/edit`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <form
                            action={async () => {
                              "use server";
                              await duplicateProposalTemplate(template.id);
                            }}
                          >
                            <Button size="sm" type="submit" variant="ghost">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </form>
                          <form
                            action={async () => {
                              "use server";
                              await deleteProposalTemplate(template.id);
                            }}
                          >
                            <Button size="sm" type="submit" variant="ghost">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
