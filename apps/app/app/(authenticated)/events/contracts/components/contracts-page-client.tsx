/**
 * @module ContractsPageClient
 * @intent Client-side filtering, search, and pagination for contracts list
 * @responsibility Handle user interactions for contracts list page
 * @domain Events
 * @tags contracts, events, crm
 * @canonical true
 */

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
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertCircleIcon,
  CalendarIcon,
  FileIcon,
  FileJsonIcon,
  FileTextIcon,
  FileTextIcon as FileTextIconLucide,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const statusVariantMap: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  signed: "default",
  expired: "destructive",
  canceled: "secondary",
};

const statusColorMap: Record<string, string> = {
  draft: "text-gray-600 dark:text-gray-400",
  sent: "text-blue-600 dark:text-blue-400",
  signed: "text-green-600 dark:text-green-400",
  expired: "text-red-600 dark:text-red-400",
  canceled: "text-gray-500 dark:text-gray-500",
};

const getDocumentIcon = (documentType: string | null) => {
  switch (documentType) {
    case "application/pdf":
      return <FileTextIconLucide className="size-4" />;
    case "application/json":
      return <FileJsonIcon className="size-4" />;
    default:
      return <FileIcon className="size-4" />;
  }
};

type Contract = {
  id: string;
  tenantId: string;
  eventId: string;
  clientId: string;
  contractNumber: string | null;
  title: string;
  status: string;
  documentUrl: string | null;
  documentType: string | null;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  event?: {
    id: string;
    title: string;
    eventDate: Date;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
};

type ContractsPageClientProps = {
  contracts: Contract[];
  uniqueStatuses: string[];
  uniqueClients: string[];
  uniqueDocumentTypes: string[];
  tenantId: string;
};

const ITEMS_PER_PAGE = 12;

export const ContractsPageClient = ({
  contracts,
  uniqueStatuses,
  uniqueClients,
  uniqueDocumentTypes,
  tenantId,
}: ContractsPageClientProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.contractNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contract.client?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contract.event?.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" || contract.status === statusFilter;

      // Client filter
      const matchesClient =
        clientFilter === "all" || contract.client?.name === clientFilter;

      // Document type filter
      const matchesDocumentType =
        documentTypeFilter === "all" ||
        contract.documentType === documentTypeFilter;

      return (
        matchesSearch && matchesStatus && matchesClient && matchesDocumentType
      );
    });
  }, [contracts, searchQuery, statusFilter, clientFilter, documentTypeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleClientFilterChange = (value: string) => {
    setClientFilter(value);
    setCurrentPage(1);
  };

  const handleDocumentTypeFilterChange = (value: string) => {
    setDocumentTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setClientFilter("all");
    setDocumentTypeFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    clientFilter !== "all" ||
    documentTypeFilter !== "all";

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Filters Section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Filters</h2>
        <Card className="mt-3">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Search
            </label>
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search contracts..."
                value={searchQuery}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Status
            </label>
            <Select
              onValueChange={handleStatusFilterChange}
              value={statusFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem
                    className="capitalize"
                    key={status}
                    value={status}
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter */}
          <div className="lg:w-56">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Client
            </label>
            <Select
              onValueChange={handleClientFilterChange}
              value={clientFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {uniqueClients.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Type Filter */}
          <div className="lg:w-56">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Document Type
            </label>
            <Select
              onValueChange={handleDocumentTypeFilterChange}
              value={documentTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {uniqueDocumentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button className="lg:mt-6" onClick={clearFilters} variant="ghost">
              <XIcon className="mr-2 size-4" />
              Clear filters
            </Button>
          )}
          </CardContent>
        </Card>
      </section>

      {/* Contracts Grid Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Contracts ({filteredContracts.length})
          </h2>
          <p className="text-muted-foreground text-sm">
            Showing {paginatedContracts.length} of {filteredContracts.length}
            {filteredContracts.length !== contracts.length && (
              <span> (filtered from {contracts.length} total)</span>
            )}
          </p>
        </div>
      {paginatedContracts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>No contracts found</EmptyTitle>
            <EmptyDescription>
              {hasActiveFilters
                ? "Try adjusting your filters or search query"
                : "No contracts have been created yet"}
            </EmptyDescription>
          </EmptyHeader>
          {hasActiveFilters ? (
            <EmptyContent>
              <Button onClick={clearFilters} variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {paginatedContracts.map((contract) => (
            <Link
              className="group"
              href={`/events/contracts/${contract.id}`}
              key={`${contract.tenantId}-${contract.id}`}
            >
              <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardDescription className="flex items-center gap-1.5">
                      {getDocumentIcon(contract.documentType)}
                      <span className="truncate">
                        {contract.contractNumber ?? "No contract number"}
                      </span>
                    </CardDescription>
                    <Badge
                      className={statusColorMap[contract.status] || ""}
                      variant={statusVariantMap[contract.status] || "outline"}
                    >
                      {contract.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">
                    {contract.title}
                  </CardTitle>
                  {contract.notes && (
                    <CardDescription className="line-clamp-2">
                      {contract.notes}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {contract.client && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="size-4 shrink-0" />
                      <span className="truncate">{contract.client.name}</span>
                    </div>
                  )}
                  {contract.event && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="size-4 shrink-0" />
                      <span className="truncate">{contract.event.title}</span>
                      <span className="text-muted-foreground/60 text-xs">
                        ({dateFormatter.format(contract.event.eventDate)})
                      </span>
                    </div>
                  )}
                  {contract.expiresAt && (
                    <div
                      className={`flex items-center gap-2 ${
                        contract.status === "expired" ||
                        (
                          new Date(contract.expiresAt) < new Date() &&
                            contract.status !== "signed"
                        )
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      <AlertCircleIcon className="size-4 shrink-0" />
                      <span>
                        Expires:{" "}
                        {dateFormatter.format(new Date(contract.expiresAt))}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          <Separator />
          <div className="flex items-center justify-between pt-4">
            <p className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      </section>
    </div>
  );
};
