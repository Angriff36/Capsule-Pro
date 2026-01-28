/**
 * @module AllergenWarningTestPage
 * @intent Visual test page for AllergenWarningBanner component variants
 * @responsibility Display all component states and severity levels for testing
 * @domain Kitchen
 * @tags allergen, test, demo
 * @canonical false
 */

import type { AllergenWarning } from "@repo/database";
import {
  AllergenSeverityBadge,
  AllergenWarningBanner,
  AllergenWarningInline,
} from "@/components/allergen-warning-banner";

export default function AllergenWarningTestPage() {
  // Mock warning data
  const warnings: Array<
    AllergenWarning & {
      dishName?: string;
      affectedGuestDetails?: Array<{
        id: string;
        name: string;
        email?: string | null;
      }>;
    }
  > = [
    {
      tenantId: "test-tenant",
      id: "1",
      eventId: "event-1",
      dishId: "dish-1",
      warningType: "allergen_conflict",
      allergens: ["peanuts", "tree_nuts"],
      affectedGuests: ["guest-1", "guest-2"],
      severity: "critical",
      isAcknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      overrideReason: null,
      resolved: false,
      resolvedAt: null,
      notes: "Severe anaphylaxis risk",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      dishName: "Spicy Peanut Noodles",
      affectedGuestDetails: [
        { id: "guest-1", name: "Sarah Johnson", email: "sarah@example.com" },
        { id: "guest-2", name: "Mike Chen", email: "mike@example.com" },
      ],
    },
    {
      tenantId: "test-tenant",
      id: "2",
      eventId: "event-1",
      dishId: "dish-2",
      warningType: "dietary_restriction",
      allergens: ["vegan", "gluten"],
      affectedGuests: ["guest-3"],
      severity: "warning",
      isAcknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      overrideReason: null,
      resolved: false,
      resolvedAt: null,
      notes: "Vegan and gluten-free required",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      dishName: "Beef Wellington",
      affectedGuestDetails: [{ id: "guest-3", name: "Emma Davis" }],
    },
  ];

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Allergen Warning Banner Tests</h1>
        <p className="text-muted-foreground mt-2">
          Visual test page for allergen warning components
        </p>
      </div>

      {/* Test 1: Critical Warning */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Critical Warning</h2>
        <AllergenWarningBanner
          onAcknowledge={(id: string, reason?: string) =>
            console.log("Acknowledge", id, reason)
          }
          onViewDetails={(id: string) => console.log("View details", id)}
          warning={warnings[0]}
        />
      </section>

      {/* Test 2: Warning Severity */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Warning Severity</h2>
        <AllergenWarningBanner
          onAcknowledge={(id: string, reason?: string) =>
            console.log("Acknowledge", id, reason)
          }
          onViewDetails={(id: string) => console.log("View details", id)}
          warning={warnings[1]}
        />
      </section>

      {/* Test 3: Compact Mode */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Compact Mode</h2>
        <div className="space-y-3">
          <AllergenWarningBanner
            compact
            onAcknowledge={(id: string, reason?: string) =>
              console.log("Acknowledge", id, reason)
            }
            warning={warnings[0]}
          />
          <AllergenWarningBanner
            compact
            onAcknowledge={(id: string, reason?: string) =>
              console.log("Acknowledge", id, reason)
            }
            warning={warnings[1]}
          />
        </div>
      </section>

      {/* Test 4: Inline Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Inline Badges</h2>
        <div className="flex flex-wrap gap-2">
          {warnings.map((warning) => (
            <AllergenWarningInline
              key={warning.id}
              onViewDetails={(id: string) => console.log("View details", id)}
              warning={warning}
            />
          ))}
        </div>
      </section>

      {/* Test 5: Severity Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Severity Badges</h2>
        <div className="flex flex-wrap gap-3">
          <AllergenSeverityBadge severity="critical" />
          <AllergenSeverityBadge severity="warning" />
          <AllergenSeverityBadge severity="info" />
        </div>
      </section>
    </div>
  );
}
