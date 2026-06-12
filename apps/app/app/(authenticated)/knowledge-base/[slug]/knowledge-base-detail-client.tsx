"use client";

import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { ArrowLeft, BookOpen, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getKnowledgeBaseEntry } from "@/app/lib/manifest-client.generated";

interface KnowledgeBaseEntry {
  category: string | null;
  content: string | null;
  createdAt: string;
  id: string;
  publishedAt: string | null;
  slug: string;
  status: string;
  tags: string[] | null;
  title: string;
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));

export default function KnowledgeBaseDetailClient({ slug }: { slug: string }) {
  const [entry, setEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getKnowledgeBaseEntry(slug);
        if (result) {
          setEntry(result as unknown as KnowledgeBaseEntry);
        } else {
          setError("Article not found");
        }
      } catch {
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [slug]);

  if (loading) {
    return (
      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Operations / Knowledge base</MonoLabel>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
          </CommandBandHeader>
        </CommandBand>
        <OperationalColumn>
          <div className="space-y-6">
            <Skeleton className="h-64" />
          </div>
        </OperationalColumn>
      </PageCanvas>
    );
  }

  if (error || !entry) {
    return (
      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Operations / Knowledge base</MonoLabel>
              <DisplayHeading>Article not found</DisplayHeading>
              <CommandBandLede>
                {error || "The requested article could not be loaded."}
              </CommandBandLede>
            </div>
          </CommandBandHeader>
        </CommandBand>
        <OperationalColumn>
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/knowledge-base">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Knowledge Base
              </Link>
            </Button>
          </div>
        </OperationalColumn>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              Operations / Knowledge base
              {entry.category ? ` / ${entry.category}` : ""}
            </MonoLabel>
            <DisplayHeading>{entry.title}</DisplayHeading>
            <CommandBandLede>
              <span className="inline-flex items-center gap-4">
                {entry.status === "published" ? (
                  <Badge variant="default">Published</Badge>
                ) : (
                  <Badge variant="secondary">{entry.status}</Badge>
                )}
                {entry.publishedAt && (
                  <span className="inline-flex items-center gap-1 text-white/70">
                    <Calendar className="h-3.5 w-3.5" />
                    Published {formatDate(entry.publishedAt)}
                  </span>
                )}
              </span>
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <div className="mb-6">
          <Button asChild size="sm" variant="outline">
            <Link href="/knowledge-base">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Knowledge Base
            </Link>
          </Button>
        </div>

        {entry.tags && entry.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Article Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entry.content ? (
              <div className="prose prose-sm max-w-none whitespace-pre-line text-ink leading-relaxed">
                {entry.content}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No content available for this article.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-muted-foreground text-xs">
          Created {formatDate(entry.createdAt)}
          {entry.publishedAt && entry.publishedAt !== entry.createdAt && (
            <span> &middot; Published {formatDate(entry.publishedAt)}</span>
          )}
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
}
