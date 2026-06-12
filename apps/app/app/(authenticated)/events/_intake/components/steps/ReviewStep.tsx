import {
  ChefHat,
  FileText,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import type { PriceEstimate, WizardFormData } from "../../types/wizard";
import StepHeader from "../ui/StepHeader";
import PriceEstimateBadge from "../wizard/PriceEstimateBadge";

const SERVICE_LABELS: Record<string, string> = {
  plated: "Plated Dinner",
  buffet: "Buffet",
  stations: "Food Stations",
  "family-style": "Family Style",
  "drop-off": "Drop-Off Catering",
  "cocktail-reception": "Cocktail / Passed",
};

const STAFFING_LABELS: Record<string, string> = {
  minimal: "Minimal",
  standard: "Standard Service",
  elevated: "Elevated Service",
  "white-glove": "White Glove",
};

const BAR_LABELS: Record<string, string> = {
  none: "No Bar",
  "beer-wine": "Beer & Wine",
  "full-bar": "Full Bar",
  "premium-bar": "Premium Bar",
  "byob-service": "BYOB Service",
};

const OCCASION_LABELS: Record<string, string> = {
  wedding: "Wedding",
  corporate: "Corporate Event",
  social: "Social Gathering",
  milestone: "Milestone Celebration",
  nonprofit: "Nonprofit / Fundraiser",
  graduation: "Graduation",
  baby: "Baby Shower / Gender Reveal",
  other: "Other",
};

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-start gap-3 border-stone-100 border-b py-3 last:border-0">
      <span className="mt-0.5 text-stone-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-stone-400 text-xs uppercase tracking-wider">
          {label}
        </span>
        <p className="mt-0.5 text-sm text-stone-700">{value}</p>
      </div>
    </div>
  );
}

interface Props {
  estimate: PriceEstimate;
  formData: WizardFormData;
}

export default function ReviewStep({ formData, estimate }: Props) {
  const rentalsDisplay =
    formData.rentalsNeeded.length > 0
      ? formData.rentalsNeeded.map((r) => r.replace(/-/g, " ")).join(", ")
      : "";
  const addOnsDisplay =
    formData.addOns.length > 0
      ? formData.addOns.map((a) => a.replace(/-/g, " ")).join(", ")
      : "";

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Take a moment to review everything before submitting. You can go back to adjust any details."
        title="Review your inquiry"
      />

      <PriceEstimateBadge estimate={estimate} />

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <SummaryRow
          icon={<Sparkles className="h-4 w-4" />}
          label="Occasion"
          value={[
            OCCASION_LABELS[formData.occasionType] || formData.occasionType,
            formData.eventName ? `"${formData.eventName}"` : "",
          ]
            .filter(Boolean)
            .join(" - ")}
        />
        {formData.vibeDescription && (
          <SummaryRow
            icon={<Sparkles className="h-4 w-4" />}
            label="Vision & Vibe"
            value={formData.vibeDescription}
          />
        )}
        <SummaryRow
          icon={<Users className="h-4 w-4" />}
          label="Guests & Format"
          value={[
            `~${formData.guestCount} guests`,
            formData.eventFormat?.replace(/-/g, " "),
          ]
            .filter(Boolean)
            .join(" / ")}
        />
        <SummaryRow
          icon={<UtensilsCrossed className="h-4 w-4" />}
          label="Service Style"
          value={[
            SERVICE_LABELS[formData.serviceStyle] || formData.serviceStyle,
            formData.courseCount ? `${formData.courseCount} courses` : "",
          ]
            .filter(Boolean)
            .join(" / ")}
        />
        <SummaryRow
          icon={<ChefHat className="h-4 w-4" />}
          label="Cuisine & Dietary"
          value={[
            formData.cuisinePreferences.join(", "),
            formData.dietaryNeeds.length > 0
              ? `Dietary: ${formData.dietaryNeeds.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ")}
        />
        <SummaryRow
          icon={<UserCheck className="h-4 w-4" />}
          label="Staffing"
          value={
            STAFFING_LABELS[formData.staffingLevel] || formData.staffingLevel
          }
        />
        <SummaryRow
          icon={<Wine className="h-4 w-4" />}
          label="Bar & Extras"
          value={[
            BAR_LABELS[formData.barService] || formData.barService,
            rentalsDisplay ? `Rentals: ${rentalsDisplay}` : "",
            addOnsDisplay ? `Add-ons: ${addOnsDisplay}` : "",
          ]
            .filter(Boolean)
            .join(" | ")}
        />
        <SummaryRow
          icon={<MapPin className="h-4 w-4" />}
          label="Logistics"
          value={[
            formData.eventDate,
            formData.venueType?.replace(/-/g, " "),
            formData.venueName,
            formData.city,
          ]
            .filter(Boolean)
            .join(" / ")}
        />
        {formData.additionalNotes && (
          <SummaryRow
            icon={<FileText className="h-4 w-4" />}
            label="Notes"
            value={formData.additionalNotes}
          />
        )}
      </div>

      <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-200">
            <FileText className="h-4 w-4 text-stone-500" />
          </div>
          <div>
            <p className="text-sm text-stone-600">
              Submitting to{" "}
              <strong className="text-stone-800">{formData.email}</strong>
            </p>
            <p className="mt-1 text-stone-400 text-xs">
              Our team will review your inquiry and follow up within 1 business
              day. The estimate shown is non-binding and for reference only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
