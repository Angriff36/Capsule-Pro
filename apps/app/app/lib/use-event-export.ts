"use client";

import { useState } from "react";
import { apiFetch } from "@/app/lib/api";

/**
 * Client-side hook for event export functionality
 */

export type ExportFormat = "csv" | "pdf";
export type ExportSection = "summary" | "menu" | "staff" | "guests" | "tasks";

export interface EventExportOptions {
  format: ExportFormat;
  include: ExportSection[];
  download?: boolean;
}

export interface EventExportResult {
  filename: string;
  dataUrl?: string;
  content?: string;
  contentType: string;
}

/**
 * Export an event to CSV or PDF format
 *
 * @param eventId - The event ID to export
 * @param options - Export options (format, sections to include, etc.)
 * @returns Promise with export result containing filename and data
 */
export async function exportEvent(
  eventId: string,
  options: EventExportOptions
): Promise<EventExportResult> {
  const { format, include, download = false } = options;

  const includeParam = include.join(",");
  const downloadParam = download ? "true" : "false";

  const response = await apiFetch(
    `/api/events/${eventId}/export/${format}?include=${includeParam}&download=${downloadParam}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Export failed");
  }

  if (download) {
    // For downloads, the response is the file directly
    const blob = await response.blob();
    const filename =
      response.headers
        .get("Content-Disposition")
        ?.split("filename=")[1]
        ?.replace(/"/g, "") || `event-export.${format}`;

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      filename,
      contentType:
        response.headers.get("Content-Type") || `application/${format}`,
    };
  }

  // For non-downloads, parse the JSON response
  const data = await response.json();
  return data as EventExportResult;
}

/**
 * Download export result as a file
 *
 * @param result - The export result from exportEvent()
 * @param defaultFilename - Fallback filename if not provided in result
 */
export function downloadExportResult(
  result: EventExportResult,
  defaultFilename = "event-export"
): void {
  const { dataUrl, content, filename, contentType } = result;

  if (dataUrl) {
    // Base64 data URL (for PDFs)
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download =
      filename ||
      `${defaultFilename}.${contentType.includes("pdf") ? "pdf" : "csv"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (content) {
    // Raw content (for CSVs)
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${defaultFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Hook for event export with loading and error states
 */
export function useEventExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EventExportResult | null>(null);

  const exportEventWithState = async (
    eventId: string,
    options: EventExportOptions
  ): Promise<EventExportResult | null> => {
    setIsExporting(true);
    setError(null);
    setResult(null);

    try {
      const exportResult = await exportEvent(eventId, options);
      setResult(exportResult);
      return exportResult;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const downloadResult = (defaultFilename?: string) => {
    if (result) {
      downloadExportResult(result, defaultFilename);
    }
  };

  return {
    isExporting,
    error,
    result,
    exportEvent: exportEventWithState,
    downloadResult,
  };
}

/**
 * Default export configurations
 */
export const exportPresets: Record<string, EventExportOptions> = {
  summary: {
    format: "pdf",
    include: ["summary"],
    download: true,
  },
  full: {
    format: "pdf",
    include: ["summary", "menu", "staff", "guests", "tasks"],
    download: true,
  },
  menuOnly: {
    format: "csv",
    include: ["summary", "menu"],
    download: true,
  },
  staffOnly: {
    format: "csv",
    include: ["summary", "staff"],
    download: true,
  },
};
