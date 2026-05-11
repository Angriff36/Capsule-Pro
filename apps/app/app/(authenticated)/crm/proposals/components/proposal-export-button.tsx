"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProposalExportButtonProps {
  proposalId: string;
  proposalNumber: string;
}

export function ProposalExportButton({
  proposalId,
}: ProposalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/crm/proposals/${proposalId}/pdf?download=true`
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? `Failed to generate PDF (${response.status})`
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] ?? `proposal-${proposalId}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (error) {
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
