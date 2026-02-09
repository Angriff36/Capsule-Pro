"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { ChevronDown, Layout, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteLayout,
  getLayout,
  type LayoutListItem,
  listLayouts,
} from "../actions/layouts";
import type { ViewportState } from "../types";

interface LayoutSwitcherProps {
  boardId: string;
  onLoadLayout?: (
    viewport: ViewportState,
    visibleCards: string[],
    gridSize: number,
    showGrid: boolean,
    snapToGrid: boolean
  ) => void;
  onSaveClick?: () => void;
  currentViewport?: ViewportState;
  currentVisibleCards?: string[];
  currentGridSize?: number;
  currentShowGrid?: boolean;
  currentSnapToGrid?: boolean;
}

export function LayoutSwitcher({
  boardId,
  onLoadLayout,
  onSaveClick,
  currentViewport,
  currentVisibleCards,
  currentGridSize,
  currentShowGrid,
  currentSnapToGrid,
}: LayoutSwitcherProps) {
  const [layouts, setLayouts] = useState<LayoutListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Load layouts when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadLayouts();
    }
  }, [isOpen, loadLayouts]);

  const loadLayouts = async () => {
    setIsLoading(true);
    const result = await listLayouts(boardId);
    if (result.success && result.data) {
      setLayouts(result.data);
    }
    setIsLoading(false);
  };

  const handleLoadLayout = async (layoutId: string) => {
    const result = await getLayout(layoutId);
    if (result.success && result.data) {
      onLoadLayout?.(
        result.data.viewport,
        result.data.visibleCards,
        result.data.gridSize,
        result.data.showGrid,
        result.data.snapToGrid
      );
      setIsOpen(false);
    }
  };

  const handleDeleteLayout = async (layoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(layoutId);
    const result = await deleteLayout(layoutId);
    if (result.success) {
      setLayouts((prev) => prev.filter((l) => l.id !== layoutId));
    }
    setIsDeleting(null);
  };

  const handleSaveCurrent = () => {
    setIsOpen(false);
    onSaveClick?.();
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" size="sm" variant="outline">
          <Layout className="h-4 w-4" />
          <span>Layouts</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Layout className="h-4 w-4" />
          Saved Layouts
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-2" onClick={handleSaveCurrent}>
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span>Save Current Layout</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : layouts.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            No saved layouts
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {layouts.map((layout) => (
              <DropdownMenuItem
                className="flex items-center justify-between gap-2"
                key={layout.id}
                onClick={() => handleLoadLayout(layout.id)}
              >
                <span className="flex-1 truncate">{layout.name}</span>
                <Button
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  disabled={isDeleting === layout.id}
                  onClick={(e) => handleDeleteLayout(layout.id, e)}
                  size="sm"
                  variant="ghost"
                >
                  {isDeleting === layout.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {!isLoading && layouts.length > 0 && (
          <div className="border-t px-2 py-1.5 text-muted-foreground text-xs">
            {layouts.length} layout{layouts.length !== 1 ? "s" : ""}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
