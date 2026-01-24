"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { DownloadIcon, FileIcon, FileTextIcon, LoaderIcon } from "lucide-react";
import {
  exportEvent,
  downloadExportResult,
  type ExportFormat,
  type ExportSection,
  type EventExportOptions,
} from "../../../../lib/use-event-export";

interface EventExportButtonProps {
  eventId: string;
  eventName?: string;
}

/**
 * Export button with dropdown menu for different export options
 *
 * Provides:
 * - Quick export options (PDF Full, PDF Summary)
 * - Format-specific options (CSV, PDF)
 * - Section selection for granular exports
 */
export function EventExportButton({ eventId, eventName }: EventExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat, include: ExportSection[]) => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      const options: EventExportOptions = {
        format,
        include,
        download: true,
      };

      await exportEvent(eventId, options);
    } catch (error) {
      console.error("Export failed:", error);
      // You could add a toast notification here
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const isLoading = isExporting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Quick Export Options */}
        <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "menu", "staff"])}>
          <FileTextIcon className="mr-2 h-4 w-4" />
          PDF Full Export
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf", ["summary"])}>
          <FileTextIcon className="mr-2 h-4 w-4" />
          PDF Summary Only
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* CSV Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileIcon className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary"])}>
              Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary", "menu"])}>
              Summary + Menu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary", "staff"])}>
              Summary + Staff
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary", "guests"])}>
              Summary + Guests
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary", "tasks"])}>
              Summary + Tasks
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("csv", ["summary", "menu", "staff", "guests", "tasks"])}>
              Full CSV Export
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* PDF Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileTextIcon className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary"])}>
              Summary Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "menu"])}>
              Summary + Menu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "staff"])}>
              Summary + Staff
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "guests"])}>
              Summary + Guests
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "tasks"])}>
              Summary + Tasks
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("pdf", ["summary", "menu", "staff", "guests", "tasks"])}>
              Full PDF Export
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple export button that triggers a default export
 */
export function EventExportButtonSimple({
  eventId,
  format = "pdf",
}: {
  eventId: string;
  format?: ExportFormat;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const options: EventExportOptions = {
        format,
        include: ["summary", "menu", "staff"],
        download: true,
      };

      await exportEvent(eventId, options);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="mr-2 h-4 w-4" />
      )}
      Export
    </Button>
  );
}
