import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { FileTextIcon } from "lucide-react";
import Link from "next/link";

interface DocumentRow {
  id: string;
  file_name: string;
  file_type: string;
  parse_status: string;
  parse_error: string | null;
  created_at: Date;
  event_id: string | null;
}

interface DataImportSectionProps {
  documents: DocumentRow[];
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getParseStatusVariant(
  status: string
): "default" | "destructive" | "outline" {
  if (status === "parsed") {
    return "default";
  }
  if (status === "error") {
    return "destructive";
  }
  return "outline";
}

function getFileTypeLabel(fileType: string): string {
  if (fileType === "application/pdf") {
    return "Event Orders (PDF)";
  }
  return "Staff Roster (CSV)";
}

function DocumentItem({
  doc,
  index,
  showSeparator,
}: {
  doc: DocumentRow;
  index: number;
  showSeparator: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">
          {index + 1}. {getFileTypeLabel(doc.file_type)}
        </span>
        <Badge
          className="text-xs capitalize"
          variant={getParseStatusVariant(doc.parse_status)}
        >
          {doc.parse_status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-dashed p-2">
        <FileTextIcon className="size-8 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.file_name}</p>
          {doc.parse_error ? (
            <p className="text-xs text-destructive">{doc.parse_error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {doc.event_id ? "Linked to event" : "Processing..."}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {doc.parse_status === "error" && (
          <Link className="text-destructive hover:underline" href="#">
            View Errors
          </Link>
        )}
        <span className="ml-auto">{getTimeAgo(doc.created_at)}</span>
      </div>
      {showSeparator && <Separator className="my-2" />}
    </div>
  );
}

export function DataImportSection({ documents }: DataImportSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Data Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length > 0 ? (
          documents
            .slice(0, 3)
            .map((doc, index) => (
              <DocumentItem
                doc={doc}
                index={index}
                key={doc.id}
                showSeparator={index < 2 && documents.length > index + 1}
              />
            ))
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            No recent imports
          </div>
        )}
      </CardContent>
    </Card>
  );
}
