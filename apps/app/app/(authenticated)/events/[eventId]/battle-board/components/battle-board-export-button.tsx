"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { DownloadIcon, FileTextIcon, LoaderIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BattleBoardExportButtonProps {
  eventId: string;
  eventName: string;
}

/**
 * Export button for Battle Board PDF
 *
 * Provides options to:
 * - Download PDF directly
 * - Get shareable link
 * - Email PDF (placeholder for future)
 */
export function BattleBoardExportButton({
  eventId,
  eventName,
}: BattleBoardExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/battle-board/pdf?download=true`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `battle-board-${eventName.replaceAll(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Battle Board PDF downloaded");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(
        `Failed to export PDF: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleGetLink = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/battle-board/pdf?download=false`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate PDF");
      }

      const data = await response.json();

      // Copy data URL to clipboard
      await navigator.clipboard.writeText(data.dataUrl);
      toast.success("PDF link copied to clipboard");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(
        `Failed to generate PDF link: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting} size="sm" variant="outline">
          {isExporting ? (
            <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <FileTextIcon className="mr-2 h-4 w-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGetLink}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Copy PDF Link
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <MailIcon className="mr-2 h-4 w-4" />
          Email PDF (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
