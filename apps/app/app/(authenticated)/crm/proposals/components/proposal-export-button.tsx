"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface ProposalExportButtonProps {
  proposalId: string;
  proposalNumber: string;
}

/**
 * Export button for downloading proposal as PDF
 */
export function ProposalExportButton({
  proposalId,
  proposalNumber,
}: ProposalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      toast.loading("Generating proposal PDF...", { id: "pdf-loading" });

      const response = await apiFetch(
        `/api/crm/proposals/${proposalId}/pdf?download=true`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const sanitizedNumber = proposalNumber.replace(/[^a-z0-9-]+/gi, "-");
        a.download = `proposal-${sanitizedNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Proposal PDF downloaded successfully", {
          id: "pdf-loading",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Failed to download proposal PDF:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download proposal PDF",
        { id: "pdf-loading" }
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
