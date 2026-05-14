import { ArrowLeft, ArrowRight, Eye, Send } from "lucide-react";

interface StepNavigationProps {
  totalSteps: number;
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canProceed: boolean;
  submitLabel?: string;
  submittingLabel?: string;
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
    <div className="flex items-center justify-between pt-8 border-t border-stone-100">
      <button
        className={`
          flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all
          ${
            isFirstStep
              ? "text-stone-300 cursor-not-allowed"
              : "text-stone-600 hover:text-stone-800 hover:bg-stone-100"
          }
        `}
        disabled={isFirstStep}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {isLastStep ? (
        <button
          className={`
            flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium transition-all
            ${
              isSubmitting || !canProceed
                ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                : "bg-stone-800 text-white hover:bg-stone-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
            }
          `}
          disabled={isSubmitting || !canProceed}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {submittingLabel}
            </>
          ) : (
            <>
              {submitLabel}
              <SubmitIcon className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        <button
          className={`
            flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium transition-all
            ${
              canProceed
                ? "bg-stone-800 text-white hover:bg-stone-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
                : "bg-stone-300 text-stone-500 cursor-not-allowed"
            }
          `}
          disabled={!canProceed}
          onClick={onNext}
          type="button"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
