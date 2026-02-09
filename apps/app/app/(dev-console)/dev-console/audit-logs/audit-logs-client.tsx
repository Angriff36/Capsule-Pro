"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  FilterIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

/**
 * Override audit log entry from the API
 */
interface OverrideAudit {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  constraintId: string;
  overrideReason: string;
  overriddenBy: string;
  authorizedBy: string | null;
  authorizedAt: Date | string | null;
  createdAt: Date | string;
}

/**
 * API response shape
 */
interface AuditLogsResponse {
  overrides: OverrideAudit[];
}

/**
 * Entity type options for filtering
 */
const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All Entity Types" },
  { value: "PrepTask", label: "Prep Tasks" },
  { value: "Recipe", label: "Recipes" },
  { value: "RecipeVersion", label: "Recipe Versions" },
  { value: "Dish", label: "Dishes" },
  { value: "Menu", label: "Menus" },
  { value: "MenuDish", label: "Menu Dishes" },
  { value: "Station", label: "Stations" },
  { value: "InventoryItem", label: "Inventory Items" },
  { value: "Event", label: "Events" },
];

/**
 * Format a date for display
 */
function formatDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a constraint code for display
 * Converts SNAKE_CASE to Title Case
 */
function formatConstraintCode(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

export const AuditLogsClient = () => {
  const [auditLogs, setAuditLogs] = useState<OverrideAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");

  /**
   * Fetch audit logs from the API
   */
  const fetchAuditLogs = async (showRefreshLoading = false) => {
    if (showRefreshLoading) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (entityType) {
        params.append("entityType", entityType);
      }
      if (entityId) {
        params.append("entityId", entityId);
      }

      // If no filters, show recent logs across all entities
      // The API requires entityType and entityId, so we'll fetch from multiple types
      let allOverrides: OverrideAudit[] = [];

      if (entityType || entityId) {
        // Fetch with specific filters
        if (entityType && entityId) {
          const response = await fetch(
            `/api/kitchen/overrides?entityType=${entityType}&entityId=${entityId}`,
            { cache: "no-store" }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to fetch audit logs");
          }

          const data: AuditLogsResponse = await response.json();
          allOverrides = data.overrides || [];
        } else {
          // Need both params for API call
          allOverrides = [];
        }
      } else {
        // Fetch recent logs from all entity types
        const typesToFetch = ENTITY_TYPE_OPTIONS.slice(1).map(
          (opt) => opt.value
        );
        // Use a placeholder entity ID to get recent overrides for the type
        const promises = typesToFetch.slice(0, 5).map(async (type) => {
          try {
            const response = await fetch(
              `/api/kitchen/overrides?entityType=${type}&entityId=recent`,
              { cache: "no-store" }
            );
            if (response.ok) {
              const data: AuditLogsResponse = await response.json();
              return data.overrides || [];
            }
            return [];
          } catch {
            return [];
          }
        });

        const results = await Promise.all(promises);
        allOverrides = results.flat();
      }

      // Sort by creation date (newest first)
      allOverrides.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Limit to 100 results
      setAuditLogs(allOverrides.slice(0, 100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setAuditLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  /**
   * Handle form submission for filtering
   */
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void fetchAuditLogs();
  };

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    void fetchAuditLogs(true);
  };

  return (
    <div className="dev-console-stack">
      {/* Filters Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Filters</h2>
            <p>Filter audit logs by entity type and ID</p>
          </div>
          <button
            className="dev-console-button dev-console-button-ghost"
            disabled={refreshing || loading}
            onClick={handleRefresh}
            type="button"
          >
            <RefreshCwIcon
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <form className="grid gap-4 sm:grid-cols-3" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">
              Entity Type
            </label>
            <select
              className="dev-console-input"
              onChange={(e) => setEntityType(e.target.value)}
              value={entityType}
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">
              Entity ID
            </label>
            <input
              className="dev-console-input"
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Enter entity ID..."
              type="text"
              value={entityId}
            />
          </div>

          <div className="flex items-end">
            <button
              className="dev-console-button dev-console-button-primary w-full"
              disabled={loading}
              type="submit"
            >
              <SearchIcon className="h-4 w-4" />
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Audit Log Entries</h2>
            <p>
              {loading
                ? "Loading audit logs..."
                : error
                  ? "Failed to load audit logs"
                  : `${auditLogs.length} ${auditLogs.length === 1 ? "entry" : "entries"} found`}
            </p>
          </div>
        </div>

        {loading && !refreshing && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Loading audit logs...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-rose-400">{error}</p>
              <button
                className="mt-4 text-sm text-blue-400 hover:underline"
                onClick={() => void fetchAuditLogs()}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!(loading || error) && auditLogs.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <FilterIcon className="h-12 w-12 text-slate-600" />
              <div>
                <p className="font-medium text-slate-300">
                  No audit logs found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {entityType || entityId
                    ? "Try adjusting your filters to see more results"
                    : "Override audit logs will appear here when constraints are overridden"}
                </p>
              </div>
            </div>
          </div>
        )}

        {!(loading || error) && auditLogs.length > 0 && (
          <div className="-mx-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Constraint</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Authorized By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatDate(log.createdAt)}
                        </span>
                        {log.authorizedAt && (
                          <span className="text-xs text-slate-500">
                            Auth: {formatDate(log.authorizedAt)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.entityType}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                        {formatConstraintCode(log.constraintId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="max-w-[200px] block text-xs"
                        title={log.overrideReason}
                      >
                        {truncateText(log.overrideReason, 40)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400 font-mono">
                        {log.overriddenBy.slice(0, 8)}...
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>About Audit Logs</h2>
            <p>Understanding constraint override tracking</p>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-2">
          <div>
            <p className="mb-2 font-medium text-slate-300">What's Tracked</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Constraint overrides with authorization</li>
              <li>User who initiated the override</li>
              <li>Reason code and details</li>
              <li>Timestamp of authorization</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Retention</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Logs are retained per tenant</li>
              <li>Indexed for fast lookup</li>
              <li>Includes outbox event emission</li>
              <li>Supports compliance auditing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
