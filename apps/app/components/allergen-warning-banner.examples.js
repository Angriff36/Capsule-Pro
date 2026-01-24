/**
 * @module AllergenWarningBannerExamples
 * @intent Provide usage examples and demos for the AllergenWarningBanner component
 * @responsibility Demonstrate all variants and states of the allergen warning banner
 * @domain Kitchen
 * @tags allergen, examples, demo
 * @canonical false
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AllergenWarningBannerExamples;
const card_1 = require("@repo/design-system/components/ui/card");
const separator_1 = require("@repo/design-system/components/ui/separator");
const allergen_warning_banner_1 = require("./allergen-warning-banner");
/**
 * Example data for demonstration purposes
 */
const exampleWarnings = [
  {
    tenantId: "tenant-1",
    id: "warning-1",
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
    notes: "Guest has severe anaphylaxis",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    dishName: "Pad Thai with Crushed Peanuts",
    affectedGuestDetails: [
      { id: "guest-1", name: "Sarah Johnson", email: "sarah.j@example.com" },
      { id: "guest-2", name: "Michael Chen", email: "mchen@example.com" },
    ],
  },
  {
    tenantId: "tenant-1",
    id: "warning-2",
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
    notes: "Guest requires vegan and gluten-free options",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    dishName: "Beef Wellington",
    affectedGuestDetails: [
      { id: "guest-3", name: "Emma Davis", email: "emma.d@example.com" },
    ],
  },
  {
    tenantId: "tenant-1",
    id: "warning-3",
    eventId: "event-2",
    dishId: "dish-3",
    warningType: "cross_contamination",
    allergens: ["shellfish", "fish"],
    affectedGuests: ["guest-4", "guest-5", "guest-6"],
    severity: "warning",
    isAcknowledged: true,
    acknowledgedBy: "user-123",
    acknowledgedAt: new Date(Date.now() - 86_400_000),
    overrideReason: "Separate prep area confirmed with chef",
    resolved: false,
    resolvedAt: null,
    notes: "Shared equipment risk",
    createdAt: new Date(Date.now() - 172_800_000),
    updatedAt: new Date(Date.now() - 86_400_000),
    deletedAt: null,
    dishName: "Grilled Salmon with Shrimp Scampi",
    affectedGuestDetails: [
      { id: "guest-4", name: "John Smith" },
      { id: "guest-5", name: "Lisa Wong" },
      { id: "guest-6", name: "David Brown" },
    ],
  },
  {
    tenantId: "tenant-1",
    id: "warning-4",
    eventId: "event-3",
    dishId: null,
    warningType: "dietary_restriction",
    allergens: ["kosher", "halal"],
    affectedGuests: ["guest-7"],
    severity: "info",
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
    overrideReason: null,
    resolved: false,
    resolvedAt: null,
    notes: "Guest requested religious dietary accommodations",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    dishName: undefined,
    affectedGuestDetails: [
      { id: "guest-7", name: "Ahmed Hassan", email: "ahassan@example.com" },
    ],
  },
  {
    tenantId: "tenant-1",
    id: "warning-5",
    eventId: "event-1",
    dishId: "dish-4",
    warningType: "allergen_conflict",
    allergens: ["dairy", "eggs"],
    affectedGuests: ["guest-8"],
    severity: "critical",
    isAcknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null,
    overrideReason: null,
    resolved: true,
    resolvedAt: new Date(),
    notes: "Alternative dessert provided",
    createdAt: new Date(Date.now() - 259_200_000),
    updatedAt: new Date(),
    deletedAt: null,
    dishName: "Crème Brûlée",
    affectedGuestDetails: [
      { id: "guest-8", name: "Jennifer Lee", email: "jlee@example.com" },
    ],
  },
];
/**
 * Example usage page component
 */
function AllergenWarningBannerExamples() {
  const handleAcknowledge = async (warningId, reason) => {
    console.log("Acknowledging warning:", warningId, "Reason:", reason);
    // In a real app, this would call your API
    // await fetch(`/api/allergen-warnings/${warningId}/acknowledge`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ reason }),
    // });
  };
  const handleDismiss = async (warningId) => {
    console.log("Dismissing warning:", warningId);
    // In a real app, this would call your API
    // await fetch(`/api/allergen-warnings/${warningId}/dismiss`, {
    //   method: "POST",
    // });
  };
  const handleViewDetails = (warningId) => {
    console.log("Viewing details for warning:", warningId);
    // In a real app, this would navigate to a details page or open a modal
    // router.push(`/events/allergen-warnings/${warningId}`);
  };
  return (
    <div className="container mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Allergen Warning Banner Component
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive allergen and dietary restriction warnings with
          severity-based styling
        </p>
      </div>

      <separator_1.Separator />

      {/* Critical Severity Examples */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Critical Severity</h2>
          <p className="text-muted-foreground text-sm">
            Used for life-threatening allergen conflicts requiring immediate
            attention
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Pending Critical Warning</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <allergen_warning_banner_1.AllergenWarningBanner
              onAcknowledge={handleAcknowledge}
              onViewDetails={handleViewDetails}
              warning={exampleWarnings[0]}
            />
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Resolved Critical Warning</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <allergen_warning_banner_1.AllergenWarningBanner
              onAcknowledge={handleAcknowledge}
              onViewDetails={handleViewDetails}
              warning={exampleWarnings[4]}
            />
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Warning Severity Examples */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Warning Severity</h2>
          <p className="text-muted-foreground text-sm">
            Used for dietary restrictions and cross-contamination risks
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Pending Warning</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <allergen_warning_banner_1.AllergenWarningBanner
              onAcknowledge={handleAcknowledge}
              onViewDetails={handleViewDetails}
              warning={exampleWarnings[1]}
            />
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>
              Acknowledged Warning with Override Reason
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <allergen_warning_banner_1.AllergenWarningBanner
              onAcknowledge={handleAcknowledge}
              onViewDetails={handleViewDetails}
              warning={exampleWarnings[2]}
            />
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Info Severity Examples */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Info Severity</h2>
          <p className="text-muted-foreground text-sm">
            Used for religious dietary preferences and informational alerts
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>
              Info Warning with Dismiss Option
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <allergen_warning_banner_1.AllergenWarningBanner
              onAcknowledge={handleAcknowledge}
              onDismiss={handleDismiss}
              onViewDetails={handleViewDetails}
              warning={exampleWarnings[3]}
            />
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Compact Mode */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Compact Mode</h2>
          <p className="text-muted-foreground text-sm">
            Inline variant for use in cards and tight spaces
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Compact Banners</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3">
            {exampleWarnings.slice(0, 3).map((warning) => (
              <allergen_warning_banner_1.AllergenWarningBanner
                compact
                key={warning.id}
                onAcknowledge={handleAcknowledge}
                warning={warning}
              />
            ))}
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Inline Badge */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Inline Badge</h2>
          <p className="text-muted-foreground text-sm">
            Small clickable badge for use in tables and lists
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Inline Badges</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex flex-wrap gap-2">
              {exampleWarnings.map((warning) => (
                <allergen_warning_banner_1.AllergenWarningInline
                  key={warning.id}
                  onViewDetails={handleViewDetails}
                  warning={warning}
                />
              ))}
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Severity Badges */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Severity Badges</h2>
          <p className="text-muted-foreground text-sm">
            Standalone severity indicators for use in tables
          </p>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>All Severity Levels</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex flex-wrap gap-3">
              <allergen_warning_banner_1.AllergenSeverityBadge severity="critical" />
              <allergen_warning_banner_1.AllergenSeverityBadge severity="warning" />
              <allergen_warning_banner_1.AllergenSeverityBadge severity="info" />
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </section>

      <separator_1.Separator />

      {/* Usage Documentation */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Usage Documentation</h2>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Basic Usage</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="bg-slate-950 text-slate-50 overflow-x-auto rounded-lg p-4 text-sm">
              {`import { AllergenWarningBanner } from "@/components/allergen-warning-banner";
import type { AllergenWarning } from "@repo/database";

function MyComponent() {
  const warning: AllergenWarning & { dishName?: string } = {
    // ... warning data from database
  };

  return (
    <AllergenWarningBanner
      warning={warning}
      onAcknowledge={(id, reason) => {
        console.log("Acknowledged:", id, "Reason:", reason);
      }}
      onViewDetails={(id) => {
        console.log("View details:", id);
      }}
    />
  );
}`}
            </pre>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Compact Mode</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="bg-slate-950 text-slate-50 overflow-x-auto rounded-lg p-4 text-sm">
              {`<AllergenWarningBanner
  warning={warning}
  compact
  onAcknowledge={handleAcknowledge}
/>`}
            </pre>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Inline Badge for Tables</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="bg-slate-950 text-slate-50 overflow-x-auto rounded-lg p-4 text-sm">
              {`import { AllergenWarningInline } from "@/components/allergen-warning-banner";

{warnings.map((warning) => (
  <AllergenWarningInline
    key={warning.id}
    warning={warning}
    onViewDetails={(id) => navigate(\`/warnings/\${id}\`)}
  />
))}`}
            </pre>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Severity Badge</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <pre className="bg-slate-950 text-slate-50 overflow-x-auto rounded-lg p-4 text-sm">
              {`import { AllergenSeverityBadge } from "@/components/allergen-warning-banner";

<AllergenSeverityBadge severity="critical" />
// Outputs: "Critical" badge with red styling`}
            </pre>
          </card_1.CardContent>
        </card_1.Card>
      </section>
    </div>
  );
}
