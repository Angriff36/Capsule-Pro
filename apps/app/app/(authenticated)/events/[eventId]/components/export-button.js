"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventExportButton = EventExportButton;
exports.EventExportButtonSimple = EventExportButtonSimple;
const react_1 = require("react");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const use_event_export_1 = require("../../../../lib/use-event-export");
/**
 * Export button with dropdown menu for different export options
 *
 * Provides:
 * - Quick export options (PDF Full, PDF Summary)
 * - Format-specific options (CSV, PDF)
 * - Section selection for granular exports
 */
function EventExportButton({ eventId, eventName }) {
  const [isExporting, setIsExporting] = (0, react_1.useState)(false);
  const [exportFormat, setExportFormat] = (0, react_1.useState)(null);
  const handleExport = async (format, include) => {
    setIsExporting(true);
    setExportFormat(format);
    try {
      const options = {
        format,
        include,
        download: true,
      };
      await (0, use_event_export_1.exportEvent)(eventId, options);
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
    <dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger asChild>
        <button_1.Button disabled={isLoading} size="sm" variant="outline">
          {isLoading ? (
            <lucide_react_1.LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <lucide_react_1.DownloadIcon className="mr-2 h-4 w-4" />
          )}
          Export
        </button_1.Button>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent align="end" className="w-48">
        {/* Quick Export Options */}
        <dropdown_menu_1.DropdownMenuItem
          onClick={() => handleExport("pdf", ["summary", "menu", "staff"])}
        >
          <lucide_react_1.FileTextIcon className="mr-2 h-4 w-4" />
          PDF Full Export
        </dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem
          onClick={() => handleExport("pdf", ["summary"])}
        >
          <lucide_react_1.FileTextIcon className="mr-2 h-4 w-4" />
          PDF Summary Only
        </dropdown_menu_1.DropdownMenuItem>

        <dropdown_menu_1.DropdownMenuSeparator />

        {/* CSV Options */}
        <dropdown_menu_1.DropdownMenuSub>
          <dropdown_menu_1.DropdownMenuSubTrigger>
            <lucide_react_1.FileIcon className="mr-2 h-4 w-4" />
            Export as CSV
          </dropdown_menu_1.DropdownMenuSubTrigger>
          <dropdown_menu_1.DropdownMenuSubContent>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("csv", ["summary"])}
            >
              Summary
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("csv", ["summary", "menu"])}
            >
              Summary + Menu
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("csv", ["summary", "staff"])}
            >
              Summary + Staff
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("csv", ["summary", "guests"])}
            >
              Summary + Guests
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("csv", ["summary", "tasks"])}
            >
              Summary + Tasks
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuSeparator />
            <dropdown_menu_1.DropdownMenuItem
              onClick={() =>
                handleExport("csv", [
                  "summary",
                  "menu",
                  "staff",
                  "guests",
                  "tasks",
                ])
              }
            >
              Full CSV Export
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuSubContent>
        </dropdown_menu_1.DropdownMenuSub>

        {/* PDF Options */}
        <dropdown_menu_1.DropdownMenuSub>
          <dropdown_menu_1.DropdownMenuSubTrigger>
            <lucide_react_1.FileTextIcon className="mr-2 h-4 w-4" />
            Export as PDF
          </dropdown_menu_1.DropdownMenuSubTrigger>
          <dropdown_menu_1.DropdownMenuSubContent>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("pdf", ["summary"])}
            >
              Summary Only
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("pdf", ["summary", "menu"])}
            >
              Summary + Menu
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("pdf", ["summary", "staff"])}
            >
              Summary + Staff
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("pdf", ["summary", "guests"])}
            >
              Summary + Guests
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem
              onClick={() => handleExport("pdf", ["summary", "tasks"])}
            >
              Summary + Tasks
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuSeparator />
            <dropdown_menu_1.DropdownMenuItem
              onClick={() =>
                handleExport("pdf", [
                  "summary",
                  "menu",
                  "staff",
                  "guests",
                  "tasks",
                ])
              }
            >
              Full PDF Export
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuSubContent>
        </dropdown_menu_1.DropdownMenuSub>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  );
}
/**
 * Simple export button that triggers a default export
 */
function EventExportButtonSimple({ eventId, format = "pdf" }) {
  const [isExporting, setIsExporting] = (0, react_1.useState)(false);
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options = {
        format,
        include: ["summary", "menu", "staff"],
        download: true,
      };
      await (0, use_event_export_1.exportEvent)(eventId, options);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <button_1.Button
      disabled={isExporting}
      onClick={handleExport}
      size="sm"
      variant="outline"
    >
      {isExporting ? (
        <lucide_react_1.LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <lucide_react_1.DownloadIcon className="mr-2 h-4 w-4" />
      )}
      Export
    </button_1.Button>
  );
}
