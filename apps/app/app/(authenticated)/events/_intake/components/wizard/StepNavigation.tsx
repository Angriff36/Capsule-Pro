import { ArrowLeft, ArrowRight, Eye, Send } from "lucide-react";

interface StepNavigationProps {
  canProceed: boolean;
  currentStep: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  totalSteps: number;
}

export default function StepNavigation({
  totalSteps,
  currentStep,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  canProceed,
  submitLabel = "Submit Inquiry",
  submittingLabel = "Submitting...",
}: StepNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const SubmitIcon = submitLabel === "Submit Inquiry" ? Send : Eye;

  return (
    <div className="flex items-center justify-between border-stone-100 border-t pt-8">
      <button
        className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-sm transition-all ${
          isFirstStep
            ? "cursor-not-allowed text-stone-300"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
        }
        `}
        disabled={isFirstStep}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isLastStep ? (
        <button
          className={`flex items-center gap-2 rounded-lg px-8 py-3 font-medium text-sm transition-all ${
            isSubmitting || !canProceed
              ? "cursor-not-allowed bg-stone-300 text-stone-500"
              : "bg-stone-800 text-white shadow-lg hover:bg-stone-700 hover:shadow-xl active:scale-[0.98]"
          }
          `}
          disabled={isSubmitting || !canProceed}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {submittingLabel}
            </>
          ) : (
            <>
              {submitLabel}
              <SubmitIcon className="h-4 w-4" />
            </>
          )}
        </button>
      ) : (
        <button
          className={`flex items-center gap-2 rounded-lg px-8 py-3 font-medium text-sm transition-all ${
            canProceed
              ? "bg-stone-800 text-white shadow-lg hover:bg-stone-700 hover:shadow-xl active:scale-[0.98]"
              : "cursor-not-allowed bg-stone-300 text-stone-500"
          }
          `}
          disabled={!canProceed}
          onClick={onNext}
          type="button"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
