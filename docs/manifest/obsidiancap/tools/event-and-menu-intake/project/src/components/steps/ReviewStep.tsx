import type { WizardFormData, PriceEstimate } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import PriceEstimateBadge from '../wizard/PriceEstimateBadge';
import {
  Sparkles, Users, UtensilsCrossed, ChefHat,
  UserCheck, Wine, MapPin, FileText,
} from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  plated: 'Plated Dinner',
  buffet: 'Buffet',
  stations: 'Food Stations',
  'family-style': 'Family Style',
  'drop-off': 'Drop-Off Catering',
  'cocktail-reception': 'Cocktail / Passed',
};

const STAFFING_LABELS: Record<string, string> = {
  minimal: 'Minimal',
  standard: 'Standard Service',
  elevated: 'Elevated Service',
  'white-glove': 'White Glove',
};

const BAR_LABELS: Record<string, string> = {
  none: 'No Bar',
  'beer-wine': 'Beer & Wine',
  'full-bar': 'Full Bar',
  'premium-bar': 'Premium Bar',
  'byob-service': 'BYOB Service',
};

const OCCASION_LABELS: Record<string, string> = {
  wedding: 'Wedding',
  corporate: 'Corporate Event',
  social: 'Social Gathering',
  milestone: 'Milestone Celebration',
  nonprofit: 'Nonprofit / Fundraiser',
  graduation: 'Graduation',
  baby: 'Baby Shower / Gender Reveal',
  other: 'Other',
};

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      <span className="text-stone-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-stone-400 uppercase tracking-wider">{label}</span>
        <p className="text-sm text-stone-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

interface Props {
  formData: WizardFormData;
  estimate: PriceEstimate;
}

export default function ReviewStep({ formData, estimate }: Props) {
  const rentalsDisplay = formData.rentalsNeeded.length > 0
    ? formData.rentalsNeeded.map((r: string) => r.replace(/-/g, ' ')).join(', ')
    : '';
  const addOnsDisplay = formData.addOns.length > 0
    ? formData.addOns.map((a: string) => a.replace(/-/g, ' ')).join(', ')
    : '';

  return (
    <div className="space-y-8">
      <StepHeader
        title="Review your inquiry"
        subtitle="Take a moment to review everything before submitting. You can go back to adjust any details."
      />

      <PriceEstimateBadge estimate={estimate} />

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <SummaryRow
          icon={<Sparkles className="w-4 h-4" />}
          label="Occasion"
          value={[
            OCCASION_LABELS[formData.occasionType] || formData.occasionType,
            formData.eventName ? `"${formData.eventName}"` : '',
          ].filter(Boolean).join(' - ')}
        />
        {formData.vibeDescription && (
          <SummaryRow
            icon={<Sparkles className="w-4 h-4" />}
            label="Vision & Vibe"
            value={formData.vibeDescription}
          />
        )}
        <SummaryRow
          icon={<Users className="w-4 h-4" />}
          label="Guests & Format"
          value={[
            `~${formData.guestCount} guests`,
            formData.eventFormat?.replace(/-/g, ' '),
          ].filter(Boolean).join(' / ')}
        />
        <SummaryRow
          icon={<UtensilsCrossed className="w-4 h-4" />}
          label="Service Style"
          value={[
            SERVICE_LABELS[formData.serviceStyle] || formData.serviceStyle,
            formData.courseCount ? `${formData.courseCount} courses` : '',
          ].filter(Boolean).join(' / ')}
        />
        <SummaryRow
          icon={<ChefHat className="w-4 h-4" />}
          label="Cuisine & Dietary"
          value={[
            formData.cuisinePreferences.join(', '),
            formData.dietaryNeeds.length > 0 ? `Dietary: ${formData.dietaryNeeds.join(', ')}` : '',
          ].filter(Boolean).join(' | ')}
        />
        <SummaryRow
          icon={<UserCheck className="w-4 h-4" />}
          label="Staffing"
          value={STAFFING_LABELS[formData.staffingLevel] || formData.staffingLevel}
        />
        <SummaryRow
          icon={<Wine className="w-4 h-4" />}
          label="Bar & Extras"
          value={[
            BAR_LABELS[formData.barService] || formData.barService,
            rentalsDisplay ? `Rentals: ${rentalsDisplay}` : '',
            addOnsDisplay ? `Add-ons: ${addOnsDisplay}` : '',
          ].filter(Boolean).join(' | ')}
        />
        <SummaryRow
          icon={<MapPin className="w-4 h-4" />}
          label="Logistics"
          value={[
            formData.eventDate,
            formData.venueType?.replace(/-/g, ' '),
            formData.venueName,
            formData.city,
          ].filter(Boolean).join(' / ')}
        />
        {formData.additionalNotes && (
          <SummaryRow
            icon={<FileText className="w-4 h-4" />}
            label="Notes"
            value={formData.additionalNotes}
          />
        )}
      </div>

      <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-stone-500" />
          </div>
          <div>
            <p className="text-sm text-stone-600">
              Submitting to <strong className="text-stone-800">{formData.email}</strong>
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Our team will review your inquiry and follow up within 1 business day.
              The estimate shown is non-binding and for reference only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
