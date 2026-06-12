"use client";

import {
  ArrowLeft,
  Clock,
  Download,
  MapPin,
  Printer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface RunSheetDish {
  allergens: string[];
  course?: string;
  description?: string;
  dietaryTags: string[];
  id: string;
  name: string;
  recipe?: {
    title: string;
    yieldQuantity: number;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    ingredients: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unitCode: string | null;
    }>;
    instructions: string | null;
  } | null;
  servings?: number;
  source: "battle-board" | "event-menu";
}

interface RunSheetStaff {
  assignmentRole: string | null;
  id: string;
  name: string;
  role: string | null;
}

interface RunSheetTimeline {
  description?: string;
  endTime: string | null;
  id: string;
  isCompleted: boolean;
  startTime: string | null;
  title: string;
}

interface ShoppingItem {
  dishes: string[];
  name: string;
  quantity: number;
  unit: string | null;
}

interface RunSheetData {
  dishes: RunSheetDish[];
  event: {
    id: string;
    title: string;
    eventDate: string | null;
    eventType: string | null;
    venueName: string | null;
    venueAddress: string | null;
    guestCount: number | null;
    status: string | null;
    client: { id: string; name: string; email?: string; phone?: string } | null;
  };
  generatedAt: string;
  shoppingList: ShoppingItem[];
  source: "battle-board" | "event-menu";
  staff: RunSheetStaff[];
  timeline: RunSheetTimeline[];
}

interface RunSheetClientProps {
  eventId: string;
}

export function RunSheetClient({ eventId }: RunSheetClientProps) {
  const [data, setData] = useState<RunSheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<
    "menu" | "staff" | "timeline" | "shopping"
  >("menu");

  const fetchRunSheet = useCallback(async () => {
    setIsLoading(true);
    try {
      // NOTE: No generated function for /api/events/:eventId/run-sheet — custom aggregate endpoint.
      const res = await apiFetch(`/api/events/${eventId}/run-sheet`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load run sheet");
      }
    } catch {
      toast.error("Failed to load run sheet");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRunSheet();
  }, [fetchRunSheet]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) {
      return;
    }

    const rows: string[][] = [["Section", "Item", "Details", "Notes"]];
    for (const dish of data.dishes) {
      rows.push([
        "Menu",
        dish.name,
        `${dish.servings ?? "N/A"} servings`,
        dish.allergens.join(", ") || "None",
      ]);
    }
    for (const staff of data.staff) {
      rows.push([
        "Staff",
        staff.name,
        staff.role ?? "N/A",
        staff.assignmentRole ?? "",
      ]);
    }
    for (const item of data.timeline) {
      rows.push([
        "Timeline",
        item.title,
        `${item.startTime ?? "TBD"} - ${item.endTime ?? "TBD"}`,
        item.isCompleted ? "Done" : "Pending",
      ]);
    }
    for (const item of data.shoppingList) {
      rows.push([
        "Shopping",
        item.name,
        `${item.quantity.toFixed(1)} ${item.unit ?? "units"}`,
        item.dishes.join(", "),
      ]);
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.event.title.replace(/[^\w\s-]/g, "").trim() || "event"}-run-sheet.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-64 rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-muted-foreground">Failed to load run sheet data.</p>
        <Link
          className="mt-4 inline-flex items-center gap-1 text-primary text-sm hover:underline"
          href={`/events/${eventId}`}
        >
          <ArrowLeft className="h-3 w-3" /> Back to event
        </Link>
      </div>
    );
  }

  const eventDate = data.event.eventDate
    ? new Date(data.event.eventDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "TBD";

  const sections = [
    { key: "menu" as const, label: "Menu", count: data.dishes.length },
    { key: "staff" as const, label: "Staff", count: data.staff.length },
    {
      key: "timeline" as const,
      label: "Timeline",
      count: data.timeline.length,
    },
    {
      key: "shopping" as const,
      label: "Shopping List",
      count: data.shoppingList.length,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:px-0 print:py-4">
      {/* Header — hidden in print */}
      <div className="mb-6 flex items-start justify-between print:hidden">
        <div>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
            href={`/events/${eventId}`}
          >
            <ArrowLeft className="h-3 w-3" /> Back to event
          </Link>
          <h1 className="font-bold text-2xl">{data.event.title} — Run Sheet</h1>
          <div className="mt-1 flex items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {eventDate}
            </span>
            {data.event.venueName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {data.event.venueName}
              </span>
            )}
            {data.event.guestCount && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {data.event.guestCount} guests
              </span>
            )}
          </div>
          {data.event.client && (
            <p className="mt-1 text-muted-foreground text-sm">
              Client: {data.event.client.name}
              {data.event.client.email && ` (${data.event.client.email})`}
            </p>
          )}
          <p className="mt-1 text-muted-foreground text-xs">
            Source:{" "}
            {data.source === "battle-board"
              ? "Finalized Battle Board"
              : "Event Menu"}{" "}
            — Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-sm hover:bg-accent"
            onClick={handleExportCSV}
            type="button"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90"
            onClick={handlePrint}
            type="button"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="mb-4 hidden print:block">
        <h1 className="font-bold text-xl">{data.event.title} — Run Sheet</h1>
        <p className="text-sm">
          {eventDate} | {data.event.venueName ?? "TBD"} |{" "}
          {data.event.guestCount ?? 0} guests
        </p>
        {data.event.client && (
          <p className="text-sm">Client: {data.event.client.name}</p>
        )}
      </div>

      {/* Section tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-background/95 p-1 print:hidden">
        {sections.map((s) => (
          <button
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-sm transition-all ${
              activeSection === s.key
                ? "bg-ink text-ink-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            type="button"
          >
            {s.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {/* Menu Section */}
      {activeSection === "menu" && (
        <div className="space-y-3 print:space-y-2">
          {data.dishes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No dishes assigned to this event.
            </p>
          ) : (
            data.dishes.map((dish) => (
              <div
                className="rounded-lg border border-border bg-card p-4 print:border-black"
                key={dish.id}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{dish.name}</h3>
                    {dish.description && (
                      <p className="mt-0.5 text-muted-foreground text-sm">
                        {dish.description}
                      </p>
                    )}
                    {dish.course && (
                      <p className="mt-1 text-muted-foreground text-xs">
                        Course: {dish.course}
                      </p>
                    )}
                    {dish.servings && (
                      <p className="text-muted-foreground text-xs">
                        Servings: {dish.servings}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dish.allergens.map((a) => (
                      <span
                        className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive text-xs"
                        key={a}
                      >
                        {a}
                      </span>
                    ))}
                    {dish.dietaryTags.map((t) => (
                      <span
                        className="rounded-full bg-muted px-1.5 py-0.5 text-xs"
                        key={t}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {dish.recipe && (
                  <div className="mt-3 border-border border-t pt-3">
                    <p className="mb-2 font-medium text-muted-foreground text-xs">
                      Recipe: {dish.recipe.title}
                      {dish.recipe.prepTimeMinutes &&
                        ` — Prep: ${dish.recipe.prepTimeMinutes}min`}
                      {dish.recipe.cookTimeMinutes &&
                        ` — Cook: ${dish.recipe.cookTimeMinutes}min`}
                    </p>
                    {dish.recipe.instructions && (
                      <p className="whitespace-pre-line text-muted-foreground text-xs">
                        {dish.recipe.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Staff Section */}
      {activeSection === "staff" && (
        <div className="rounded-lg border border-border bg-card">
          {data.staff.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No staff assigned to this event.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-border border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Role
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Assignment
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr
                    className="border-border border-b last:border-0"
                    key={s.id}
                  >
                    <td className="px-4 py-2 text-sm">{s.name}</td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {s.role ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {s.assignmentRole ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Timeline Section */}
      {activeSection === "timeline" && (
        <div className="space-y-2">
          {data.timeline.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No timeline items for this event.
            </p>
          ) : (
            data.timeline.map((item) => (
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  item.isCompleted
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-card"
                }`}
                key={item.id}
              >
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${item.isCompleted ? "bg-success" : "bg-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium text-sm ${item.isCompleted ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-muted-foreground text-xs">
                  {item.startTime
                    ? new Date(item.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "TBD"}
                  {" — "}
                  {item.endTime
                    ? new Date(item.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "TBD"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Shopping List Section */}
      {activeSection === "shopping" && (
        <div className="rounded-lg border border-border bg-card">
          {data.shoppingList.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              No ingredient data available. Add recipes to dishes to generate a
              shopping list.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-border border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Ingredient
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Quantity
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Unit
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                    Used In
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.shoppingList.map((item, idx) => (
                  <tr
                    className="border-border border-b last:border-0"
                    key={`${item.name}-${idx}`}
                  >
                    <td className="px-4 py-2 font-medium text-sm">
                      {item.name}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {item.quantity.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-sm">
                      {item.unit ?? "units"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {item.dishes.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
