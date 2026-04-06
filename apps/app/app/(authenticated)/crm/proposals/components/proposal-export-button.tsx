"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProposalExportButtonProps {
  proposalId: string;
  proposalNumber: string;
}

/**
 * Export button for downloading proposal as PDF.
 * Uses the browser's print-to-PDF capability since there's no server-side PDF generation endpoint.
 */
export function ProposalExportButton({
  proposalNumber,
}: ProposalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Open a print dialog for the current page.
      // Users can "Save as PDF" from the browser's print dialog.
      // This is a reliable client-side approach that doesn't require
      // a server-side PDF generation endpoint.
      window.print();
      toast.success("Use 'Save as PDF' in the print dialog to export");
    } catch (error) {
      console.error("Failed to export proposal PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export proposal PDF"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button disabled={isExporting} onClick={handleExport} variant="outline">
      {isExporting ? (
        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <DownloadIcon className="mr-2 h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
}
