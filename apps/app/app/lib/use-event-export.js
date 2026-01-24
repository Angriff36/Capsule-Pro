"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPresets = void 0;
exports.exportEvent = exportEvent;
exports.downloadExportResult = downloadExportResult;
exports.useEventExport = useEventExport;
const react_1 = require("react");
/**
 * Export an event to CSV or PDF format
 *
 * @param eventId - The event ID to export
 * @param options - Export options (format, sections to include, etc.)
 * @returns Promise with export result containing filename and data
 */
async function exportEvent(eventId, options) {
  const { format, include, download = false } = options;
  const includeParam = include.join(",");
  const downloadParam = download ? "true" : "false";
  const response = await fetch(
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
  return data;
}
/**
 * Download export result as a file
 *
 * @param result - The export result from exportEvent()
 * @param defaultFilename - Fallback filename if not provided in result
 */
function downloadExportResult(result, defaultFilename = "event-export") {
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
function useEventExport() {
  const [isExporting, setIsExporting] = (0, react_1.useState)(false);
  const [error, setError] = (0, react_1.useState)(null);
  const [result, setResult] = (0, react_1.useState)(null);
  const exportEventWithState = async (eventId, options) => {
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
  const downloadResult = (defaultFilename) => {
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
exports.exportPresets = {
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
