"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
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
  Loader2Icon,
  MapPinIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getVenues,
  type VenueFilters,
  type VenueType,
} from "../actions";

interface Venue {
  id: string;
  tenantId: string;
  name: string;
  venueType: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  capacity: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
}

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: "banquet_hall", label: "Banquet Hall" },
  { value: "outdoor", label: "Outdoor" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "private_home", label: "Private Home" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
];

export function VenuesClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

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
    venueType:
      (searchParams.get("venueType") as VenueType | undefined) || undefined,
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
          venueType: filters.venueType,
          city: filters.city || undefined,
          isActive: filters.isActive,
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
  }, [filters, pagination.page, pagination.limit, pagination]);

  // Initial load
  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.venueType) {
      params.set("venueType", filters.venueType);
    }
    if (filters.city) {
      params.set("city", filters.city);
    }
    if (filters.isActive !== undefined) {
      params.set("isActive", String(filters.isActive));
    }
    const queryString = params.toString();
    router.push(`/crm/venues${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);

  const handleFilterChange = (key: keyof VenueFilters, value: string) => {
    if (key === "isActive") {
      setFilters((prev) => ({
        ...prev,
        isActive: value === "" ? undefined : value === "true",
      }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    }
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

  const hasActiveFilters =
    filters.search || filters.venueType || filters.city || filters.isActive !== undefined;

  // Table columns
  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const venue = row.original;
        return (
          <Link
            href={`/crm/venues/${venue.id}`}
            className="font-medium hover:underline"
          >
            {venue.name}
          </Link>
        );
      },
    },
    {
      accessorKey: "venueType",
      header: "Type",
      cell: ({ row }) => {
        const type = VENUE_TYPES.find((t) => t.value === row.getValue("venueType"));
        return type?.label || row.getValue("venueType");
      },
    },
    {
      accessorKey: "city",
      header: "Location",
      cell: ({ row }) => {
        const city = row.getValue("city") as string | null;
        const state = row.original.stateProvince;
        if (!city && !state) return "-";
        return [city, state].filter(Boolean).join(", ");
      },
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => {
        const capacity = row.getValue("capacity") as number | null;
        return capacity ? `${capacity} guests` : "-";
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[];
        if (!tags || tags.length === 0) return "-";
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: venues,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
          <p className="text-muted-foreground">
            Manage venues, capacity, and coordination notes for every site.
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/venues/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Venue
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Input
              placeholder="Search venues..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-10"
            />
          </div>
        </form>

        <Select
          value={filters.venueType || ""}
          onValueChange={(value) => handleFilterChange("venueType", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Venue Type" />
          </SelectTrigger>
          <SelectContent>
            {VENUE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.isActive === undefined ? "" : String(filters.isActive)}
          onValueChange={(value) => handleFilterChange("isActive", value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <XIcon className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/venues/${row.original.id}`)}
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MapPinIcon className="h-8 w-8" />
                    <p>No venues found</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} venues
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
