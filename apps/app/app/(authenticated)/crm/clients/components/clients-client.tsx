"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
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
  Building2Icon,
  CheckIcon,
  FilterIcon,
  Loader2Icon,
  PlusIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getAvailableTags, getClients } from "../actions";

interface Client {
  id: string;
  tenantId: string;
  clientType: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  stateProvince: string | null;
  tags: string[];
  createdAt: Date;
}

interface ClientFilters {
  search?: string;
  tags?: string[];
  assignedTo?: string;
  clientType?: "company" | "individual";
  source?: string;
}

export function ClientsClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Available tags for filtering
  const [availableTags, setAvailableTags] = useState<
    { tag: string; count: number }[]
  >([]);

  // Filters
  const [filters, setFilters] = useState<ClientFilters>({
    search: searchParams.get("search") || "",
    clientType:
      (searchParams.get("clientType") as
        | "company"
        | "individual"
        | undefined) || undefined,
    source: searchParams.get("source") || "",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || undefined,
  });

  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Fetch available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getAvailableTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, []);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClients(
        {
          ...filters,
          search: filters.search || undefined,
          clientType: filters.clientType,
          source: filters.source || undefined,
          tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined,
        },
        pagination.page,
        pagination.limit
      );
      setClients(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load clients", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, pagination]);

  // Initial load
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.clientType) {
      params.set("clientType", filters.clientType);
    }
    if (filters.source) {
      params.set("source", filters.source);
    }
    if (filters.tags && filters.tags.length > 0) {
      params.set("tags", filters.tags.join(","));
    }
    const queryString = params.toString();
    router.push(`/crm/clients${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);

  const handleFilterChange = (key: keyof ClientFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      return { ...prev, tags: newTags.length > 0 ? newTags : undefined };
    });
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
    setAvailableTags([]); // Clear cached tags
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Re-fetch tags after clear
    getAvailableTags().then(setAvailableTags).catch(console.error);
  };

  const handleRowClick = (client: Client) => {
    router.push(`/crm/clients/${client.id}`);
  };

  const getClientDisplayName = (client: Client) => {
    if (client.clientType === "company" && client.company_name) {
      return client.company_name;
    }
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.email || "Unnamed Client";
  };

  const getClientSecondaryInfo = (client: Client) => {
    const parts: string[] = [];
    if (
      client.clientType === "company" &&
      (client.first_name || client.last_name)
    ) {
      parts.push(`${client.first_name || ""} ${client.last_name || ""}`.trim());
    }
    if (client.email) {
      parts.push(client.email);
    }
    return parts.join(" • ");
  };

  const getLocation = (client: Client) => {
    const parts: string[] = [];
    if (client.city) {
      parts.push(client.city);
    }
    if (client.stateProvince) {
      parts.push(client.stateProvince);
    }
    return parts.join(", ") || "—";
  };

  // Table columns
  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: "Client",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {row.original.clientType === "company" ? (
              <Building2Icon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-medium">
              {getClientDisplayName(row.original)}
            </div>
            {getClientSecondaryInfo(row.original) && (
              <div className="text-sm text-muted-foreground">
                {getClientSecondaryInfo(row.original)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => getLocation(row.original),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "—",
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
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const hasFilters = filters.search || filters.clientType || filters.source || (filters.tags && filters.tags.length > 0);

  const selectedTagsCount = filters.tags?.length || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and contact information.
          </p>
        </div>
        <Button onClick={() => router.push("/crm/clients/new")}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Client
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <FilterIcon className="h-4 w-4 text-muted-foreground shrink-0" />

        <form
          className="flex flex-wrap items-center gap-3 flex-1"
          onSubmit={handleSearchSubmit}
        >
          <Input
            className="max-w-[200px]"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email..."
            type="text"
            value={searchInput}
          />
          <Button size="sm" type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Separator className="h-6 shrink-0" orientation="vertical" />

        <Select
          onValueChange={(value) =>
            handleFilterChange("clientType", value === "all" ? "" : value)
          }
          value={filters.clientType || "all"}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="company">Companies</SelectItem>
            <SelectItem value="individual">Individuals</SelectItem>
          </SelectContent>
        </Select>

        <Input
          className="w-[140px]"
          onChange={(e) => handleFilterChange("source", e.target.value)}
          placeholder="Source..."
          type="text"
          value={filters.source || ""}
        />

        {/* Tag Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="w-[160px] justify-between"
              size="sm"
              variant={selectedTagsCount > 0 ? "default" : "outline"}
            >
              <span className="flex items-center gap-2 truncate">
                <TagIcon className="h-4 w-4 shrink-0" />
                {selectedTagsCount > 0
                  ? `${selectedTagsCount} tag${selectedTagsCount > 1 ? "s" : ""}`
                  : "Tags"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup>
                  {availableTags.map(({ tag, count }) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => handleTagToggle(tag)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox
                          checked={filters.tags?.includes(tag) ?? false}
                          className="pointer-events-none"
                        />
                        <span className="flex-1 truncate">{tag}</span>
                        <span className="text-muted-foreground text-xs">
                          {count}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <>
            <Separator className="h-6 shrink-0" orientation="vertical" />
            <Button onClick={clearFilters} size="sm" variant="ghost">
              <XIcon className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2Icon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first client."}
          </p>
          {!hasFilters && (
            <Button onClick={() => router.push("/crm/clients/new")}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="text-sm font-medium text-muted-foreground">
            Showing {clients.length} of {pagination.total} clients
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(row.original);
                        }
                      }}
                      role="button"
                      tabIndex={0}
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
