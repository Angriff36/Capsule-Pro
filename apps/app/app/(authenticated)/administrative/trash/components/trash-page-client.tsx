"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  AlertTriangleIcon,
  BanIcon,
  CheckIcon,
  InfoIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Header } from "../../../components/header";
import { DependencyAnalysisDialog } from "./dependency-analysis-dialog";

interface TrashItem {
  id: string;
  entity: string;
  tenantId: string;
  deletedAt: string;
  displayName: string;
  hasDependents: boolean;
}

interface TrashListResponse {
  items: TrashItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  entityTypes: Array<{ value: string; label: string }>;
}

interface DependencyAnalysis {
  entity: {
    id: string;
    type: string;
    displayName: string;
  };
  summary: {
    totalDependents: number;
    deletedDependents: number;
    activeDependents: number;
    canRestore: boolean;
    recommendedAction: "restore" | "cascade_restore" | "cannot_restore";
  };
  dependents: Array<{
    node: {
      id: string;
      entity: string;
      displayName: string;
      isDeleted: boolean;
      canRestore: boolean;
    };
    edge: {
      from: string;
      to: string;
      type: "required" | "optional";
      description: string;
    };
  }>;
  restorePlan?: {
    steps: Array<{
      entityId: string;
      entityType: string;
      displayName: string;
      action: "restore" | "skip";
      reason: string;
    }>;
    warnings: string[];
  };
}

interface RestoreResult {
  success: boolean;
  restored: Array<{ id: string; type: string; displayName: string }>;
  failed: Array<{ id: string; type: string; error: string }>;
  skipped: Array<{ id: string; type: string; reason: string }>;
}

export function TrashPageClient({
  initialParams,
}: {
  initialParams: { entityType?: string; search?: string; page?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [entityTypes, setEntityTypes] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialParams.search ?? "");
  const [selectedEntityType, setSelectedEntityType] = useState(
    initialParams.entityType ?? "all"
  );
  const [currentPage, setCurrentPage] = useState(
    Number.parseInt(initialParams.page ?? "1", 10)
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Actions
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(
    null
  );

  // Dependency analysis
  const [analyzingItem, setAnalyzingItem] = useState<TrashItem | null>(null);
  const [dependencyAnalysis, setDependencyAnalysis] =
    useState<DependencyAnalysis | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);

  const fetchTrashItems = useCallback(async () => {
    setLoading(true);
    setRestoreResult(null);

    const params = new URLSearchParams();
    if (selectedEntityType !== "all") {
      params.append("entityType", selectedEntityType);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    params.append("page", currentPage.toString());
    params.append("limit", "50");

    try {
      const response = await fetch(
        `/api/administrative/trash/list?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch trash items");
      }

      const data: TrashListResponse = await response.json();
      setItems(data.items);
      setPagination(data.pagination);
      setEntityTypes(data.entityTypes);
    } catch (error) {
      console.error("Error fetching trash items:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedEntityType, searchQuery, currentPage]);

  useEffect(() => {
    fetchTrashItems();
  }, [fetchTrashItems]);

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams();
    if (selectedEntityType !== "all") {
      params.append("entityType", selectedEntityType);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    if (currentPage > 1) {
      params.append("page", currentPage.toString());
    }
    const queryString = params.toString();
    router.replace(
      queryString
        ? `/administrative/trash?${queryString}`
        : "/administrative/trash"
    );
  }, [selectedEntityType, searchQuery, currentPage, router]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  const handleEntityTypeChange = (value: string) => {
    setSelectedEntityType(value);
    setCurrentPage(1);
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleRestore = async (
    itemsToRestore: TrashItem[],
    cascade = false
  ) => {
    setRestoring(true);
    setRestoreResult(null);

    try {
      const response = await fetch("/api/administrative/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: itemsToRestore.map((item) => ({
            id: item.id,
            type: item.entity,
          })),
          cascade,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to restore items");
      }

      const result: RestoreResult = await response.json();
      setRestoreResult(result);

      if (result.success) {
        // Refresh the list
        await fetchTrashItems();
        setSelectedItems(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      console.error("Error restoring items:", error);
      setRestoreResult({
        success: false,
        restored: [],
        failed: itemsToRestore.map((item) => ({
          id: item.id,
          type: item.entity,
          error: "Failed to restore",
        })),
        skipped: [],
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleAnalyzeDependency = async (item: TrashItem) => {
    setAnalyzingItem(item);
    setDependencyAnalysis(null);
    setShowDependencyDialog(true);

    try {
      const response = await fetch(
        `/api/administrative/trash/analyze?entityId=${item.id}&entityType=${item.entity}`
      );

      if (!response.ok) {
        throw new Error("Failed to analyze dependencies");
      }

      const analysis: DependencyAnalysis = await response.json();
      setDependencyAnalysis(analysis);
    } catch (error) {
      console.error("Error analyzing dependencies:", error);
      setDependencyAnalysis(null);
    } finally {
      setAnalyzingItem(null);
    }
  };

  const handlePermanentlyDelete = async (item: TrashItem) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${item.displayName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/administrative/trash/restore?entityId=${item.id}&entityType=${item.entity}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to permanently delete");
      }

      // Refresh the list
      await fetchTrashItems();
    } catch (error) {
      console.error("Error permanently deleting:", error);
      alert("Failed to permanently delete the item.");
    }
  };

  const getEntityBadgeColor = (entity: string): string => {
    // Color coding by entity type group
    const eventEntities = ["Event", "EventBudget", "EventProfitability"];
    const clientEntities = ["Client", "ClientContact", "Lead", "Proposal"];
    const kitchenEntities = [
      "Recipe",
      "Ingredient",
      "Menu",
      "Dish",
      "PrepTask",
    ];
    const inventoryEntities = [
      "InventoryItem",
      "InventorySupplier",
      "Shipment",
    ];

    if (eventEntities.includes(entity)) return "bg-blue-100 text-blue-800";
    if (clientEntities.includes(entity)) return "bg-purple-100 text-purple-800";
    if (kitchenEntities.includes(entity)) return "bg-green-100 text-green-800";
    if (inventoryEntities.includes(entity))
      return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <>
      <Header page="Trash" pages={["Administrative"]}>
        <div className="flex items-center gap-2 px-4">
          <Button
            asChild
            onClick={() => fetchTrashItems()}
            size="sm"
            variant="outline"
          >
            <button type="button">
              <RefreshCwIcon className="size-4" />
              Refresh
            </button>
          </Button>
        </div>
      </Header>

      <div className="flex flex-1 flex-col p-4 pt-0">
        {/* Filters and Search */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trash & Recovery</CardTitle>
                <CardDescription>
                  Browse and restore soft-deleted entities
                </CardDescription>
              </div>
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedItems.size} selected
                  </Badge>
                  <Button
                    disabled={restoring}
                    onClick={() =>
                      handleRestore(
                        items.filter((item) => selectedItems.has(item.id))
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Undo2Icon className="mr-1 size-4" />
                    Restore Selected
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {/* Entity Type Filter */}
              <div className="flex items-center gap-2">
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="entity-type-filter"
                >
                  Entity Type:
                </label>
                <Select
                  onValueChange={handleEntityTypeChange}
                  value={selectedEntityType}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="search-input"
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search deleted items..."
                  type="search"
                  value={searchQuery}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Showing {items.length} of {pagination.total} deleted items
              </span>
              {pagination.total > 0 && (
                <span>across {entityTypes.length} entity types</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restore Result Notification */}
        {restoreResult && (
          <Card
            className={
              restoreResult.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {restoreResult.success ? (
                  <CheckIcon className="size-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangleIcon className="size-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-medium">
                    {restoreResult.success
                      ? "Restore completed"
                      : "Restore completed with errors"}
                  </h4>
                  <div className="mt-2 text-sm">
                    {restoreResult.restored.length > 0 && (
                      <p className="text-green-700">
                        {restoreResult.restored.length} item(s) restored
                        successfully
                      </p>
                    )}
                    {restoreResult.failed.length > 0 && (
                      <p className="text-red-700">
                        {restoreResult.failed.length} item(s) failed to restore
                      </p>
                    )}
                    {restoreResult.skipped.length > 0 && (
                      <p className="text-gray-600">
                        {restoreResult.skipped.length} item(s) skipped
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setRestoreResult(null)}
                  size="sm"
                  variant="ghost"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card className="flex-1">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      checked={selectAll}
                      className="size-4 rounded border-gray-300"
                      onChange={handleSelectAll}
                      type="checkbox"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="size-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-32 text-center" colSpan={5}>
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Trash2Icon className="size-12 mb-2 opacity-50" />
                        <p className="text-lg font-medium">No items in trash</p>
                        <p className="text-sm">
                          {searchQuery || selectedEntityType !== "all"
                            ? "Try adjusting your filters"
                            : "Deleted items will appear here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          checked={selectedItems.has(item.id)}
                          className="size-4 rounded border-gray-300"
                          onChange={() => handleSelectItem(item.id)}
                          type="checkbox"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getEntityBadgeColor(item.entity)}
                          variant="secondary"
                        >
                          {item.entity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(item.deletedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleAnalyzeDependency(item)}
                            size="sm"
                            title="Analyze dependencies"
                            variant="ghost"
                          >
                            <InfoIcon className="size-4" />
                          </Button>
                          <Button
                            disabled={restoring}
                            onClick={() => handleRestore([item], false)}
                            size="sm"
                            title="Restore this item"
                            variant="outline"
                          >
                            <Undo2Icon className="size-4" />
                          </Button>
                          <Button
                            className="text-destructive hover:text-destructive"
                            onClick={() => handlePermanentlyDelete(item)}
                            size="sm"
                            title="Permanently delete"
                            variant="ghost"
                          >
                            <BanIcon className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dependency Analysis Dialog */}
      <DependencyAnalysisDialog
        analysis={dependencyAnalysis}
        item={
          dependencyAnalysis
            ? {
                id: dependencyAnalysis.entity.id,
                entity: dependencyAnalysis.entity.type,
                displayName: dependencyAnalysis.entity.displayName,
                deletedAt: "",
                hasDependents: dependencyAnalysis.summary.totalDependents > 0,
                tenantId: "",
              }
            : null
        }
        loading={analyzingItem !== null}
        onOpenChange={setShowDependencyDialog}
        onRestore={(cascade) => {
          if (dependencyAnalysis) {
            handleRestore(
              [
                {
                  id: dependencyAnalysis.entity.id,
                  entity: dependencyAnalysis.entity.type,
                  displayName: dependencyAnalysis.entity.displayName,
                  deletedAt: "",
                  hasDependents: false,
                  tenantId: "",
                },
              ],
              cascade
            );
            setShowDependencyDialog(false);
          }
        }}
        open={showDependencyDialog}
      />
    </>
  );
}
