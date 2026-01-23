"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  BuildingIcon,
  FilterIcon,
  Loader2Icon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getVenues } from "../actions";

interface Venue {
  id: string;
  tenantId: string;
  name: string;
  venueType: string | null;
  city: string | null;
  stateProvince: string | null;
  capacity: number | null;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
}

interface VenueFilters {
  search?: string;
  tags?: string[];
  venueType?: string;
  city?: string;
  isActive?: boolean;
  minCapacity?: number;
}

const VENUE_TYPES = [
  "banquet_hall",
  "outdoor",
  "restaurant",
  "hotel",
  "private_home",
  "corporate",
  "other",
] as const;

const VENUE_TYPE_LABELS: Record<string, string> = {
  banquet_hall: "Banquet Hall",
  outdoor: "Outdoor",
  restaurant: "Restaurant",
  hotel: "Hotel",
  private_home: "Private Home",
  corporate: "Corporate",
  other: "Other",
};

export function VenuesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<VenueFilters>({
    search: searchParams.get("search") || "",
    venueType: searchParams.get("venueType") || "",
    city: searchParams.get("city") || "",
    isActive:
      searchParams.get("isActive") === "true"
        ? true
        : searchParams.get("isActive") === "false"
          ? false
          : undefined,
  });

  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Fetch venues
  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVenues(
        {
          ...filters,
          search: filters.search || undefined,
          venueType: filters.venueType as
            | (typeof VENUE_TYPES)[number]
            | undefined,
          city: filters.city || undefined,
        },
        pagination.page,
        pagination.limit
      );
      setVenues(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load venues", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Initial load
  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.venueType) params.set("venueType", filters.venueType);
    if (filters.city) params.set("city", filters.city);
    if (filters.isActive !== undefined)
      params.set("isActive", String(filters.isActive));
    const queryString = params.toString();
    router.push(`/crm/venues${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);

  const handleFilterChange = (
    key: keyof VenueFilters,
    value: string | boolean | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRowClick = (venue: Venue) => {
    router.push(`/crm/venues/${venue.id}`);
  };

  const getVenueTypeLabel = (venueType: string | null) => {
    if (!venueType) return "—";
    return VENUE_TYPE_LABELS[venueType] || venueType;
  };

  const getLocation = (venue: Venue) => {
    const parts: string[] = [];
    if (venue.city) parts.push(venue.city);
    if (venue.stateProvince) parts.push(venue.stateProvince);
    return parts.join(", ") || "—";
  };

  const getCapacity = (venue: Venue) => {
    return venue.capacity ? `${venue.capacity.toLocaleString()} guests` : "—";
  };

  // Table columns
  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: "name",
      header: "Venue",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BuildingIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.venueType && (
              <div className="text-sm text-muted-foreground">
                {getVenueTypeLabel(row.original.venueType)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPinIcon className="h-3 w-3" />
          {getLocation(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <UsersIcon className="h-3 w-3" />
          {getCapacity(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) =>
        row.original.tags && row.original.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 2).map((tag) => (
              <Badge className="text-xs" key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {row.original.tags.length > 2 && (
              <Badge className="text-xs" variant="secondary">
                +{row.original.tags.length - 2}
              </Badge>
            )}
          </div>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
  ];

  const table = useReactTable({
    data: venues,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasFilters =
    filters.search ||
    filters.venueType ||
    filters.city ||
    filters.isActive !== undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venues</h1>
          <p className="text-muted-foreground">
            Manage event venues, facilities, and equipment information.
          </p>
        </div>
        <Button onClick={() => router.push("/crm/venues/new")}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Venue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />

        <form
          className="flex items-center gap-2 flex-1"
          onSubmit={handleSearchSubmit}
        >
          <Input
            className="max-w-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, city, address..."
            type="text"
            value={searchInput}
          />
          <Button size="sm" type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          onChange={(e) =>
            handleFilterChange("venueType", e.target.value || undefined)
          }
          value={filters.venueType || ""}
        >
          <option value="">All Types</option>
          {VENUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {VENUE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <Input
          className="max-w-xs"
          onChange={(e) =>
            handleFilterChange("city", e.target.value || undefined)
          }
          placeholder="City..."
          type="text"
          value={filters.city || ""}
        />

        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          onChange={(e) => {
            const value = e.target.value;
            handleFilterChange(
              "isActive",
              value === "" ? undefined : value === "true"
            );
          }}
          value={filters.isActive === undefined ? "" : String(filters.isActive)}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        {hasFilters && (
          <Button onClick={clearFilters} size="sm" variant="ghost">
            <XIcon className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BuildingIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No venues found</h3>
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first venue."}
          </p>
          {!hasFilters && (
            <Button onClick={() => router.push("/crm/venues/new")}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {venues.length} of {pagination.total} venues
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      key={row.id}
                      onClick={() => handleRowClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center"
                      colSpan={columns.length}
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
