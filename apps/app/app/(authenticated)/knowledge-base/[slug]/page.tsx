import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  BookOpenIcon,
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  LightbulbIcon,
  SettingsIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  ToolIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/app/(authenticated)/components/header";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const categoryIcons: Record<string, React.ElementType> = {
  recipe: BookOpenIcon,
  procedure: FileTextIcon,
  troubleshooting: ToolIcon,
  "best-practice": LightbulbIcon,
  equipment: SettingsIcon,
  safety: WrenchIcon,
  general: BookOpenIcon,
};

const KnowledgeEntryPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const { orgId, userId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch the entry via API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(
    `${baseUrl}/api/knowledge-base/entries/${slug}`,
    {
      headers: {
        cookie: (await import("next/headers")).cookies().toString(),
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    notFound();
  }

  const data = await response.json();
  const entry = data.result?.entry;

  if (!entry) {
    notFound();
  }

  const CategoryIcon = categoryIcons[entry.category] ?? BookOpenIcon;

  const helpfulRating =
    entry.helpfulCount + entry.notHelpfulCount > 0
      ? Math.round(
          (entry.helpfulCount / (entry.helpfulCount + entry.notHelpfulCount)) *
            100
        )
      : null;

  return (
    <>
      <Header page="Knowledge Base" pages={["Kitchen Ops"]}>
        <div className="flex items-center gap-2 px-4">
          <Button asChild size="icon" variant="ghost">
            <Link href="/knowledge-base">
              <SettingsIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </Header>
      <Separator />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Back Button */}
        <div>
          <Button asChild variant="ghost">
            <Link href="/knowledge-base">← Back to Knowledge Base</Link>
          </Button>
        </div>

        {/* Entry Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {entry.isFeatured && <Badge variant="default">Featured</Badge>}
            <Badge className="gap-1" variant="secondary">
              <CategoryIcon className="size-3" />
              {entry.category}
            </Badge>
            {entry.difficultyLevel && (
              <Badge variant="outline">{entry.difficultyLevel}</Badge>
            )}
            <Badge variant="outline">v{entry.versionNumber}</Badge>
          </div>
          <h1 className="font-semibold text-3xl">{entry.title}</h1>
          {entry.excerpt && (
            <p className="text-muted-foreground text-lg">{entry.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            <div className="flex items-center gap-1">
              <CalendarIcon className="size-4" />
              Last updated {new Date(entry.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <EyeIcon className="size-4" />
              {entry.viewCount} views
            </div>
            {helpfulRating !== null && (
              <div className="flex items-center gap-1">
                <ThumbsUpIcon className="size-4" />
                {helpfulRating}% found this helpful
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Entry Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="prose prose-slate max-w-none p-6">
                {/* Render content as HTML (assuming it's stored as markdown or HTML) */}
                <div dangerouslySetInnerHTML={{ __html: entry.content }} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Version History */}
            {entry.versions && entry.versions.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Version History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {entry.versions.map((version: any) => (
                      <div
                        className="flex items-center justify-between text-sm"
                        key={version.id}
                      >
                        <div>
                          <div className="font-medium">
                            v{version.versionNumber}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(version.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {version.changeType ?? "update"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Was this helpful?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" size="sm" variant="outline">
                    <ThumbsUpIcon className="size-4" />
                    Yes ({entry.helpfulCount})
                  </Button>
                  <Button className="flex-1 gap-2" size="sm" variant="outline">
                    <ThumbsDownIcon className="size-4" />
                    No ({entry.notHelpfulCount})
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            {entry.attachments && entry.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entry.attachments.map((attachment: any) => (
                      <a
                        className="block rounded-md border p-3 text-sm transition-colors hover:bg-muted"
                        href={attachment.fileUrl}
                        key={attachment.id}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <div className="font-medium">
                          {attachment.displayName ?? attachment.fileName}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {(attachment.fileSize / 1024).toFixed(0)} KB
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default KnowledgeEntryPage;
