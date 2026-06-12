import { UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultPricingRules } from "../../config/pricingRules";
import { useWizardState, WIZARD_STEPS } from "../../hooks/useWizardState";
import type { PricingRules } from "../../types/pricing";
import { submitLead } from "../../utils/submitLead";
import EventDetailsStep from "../steps/EventDetailsStep";
import EventVisionStep from "../steps/EventVisionStep";
import ExtrasStep from "../steps/ExtrasStep";
import FinalDetailsStep from "../steps/FinalDetailsStep";
import LogisticsStep from "../steps/LogisticsStep";
import MenuPreferencesStep from "../steps/MenuPreferencesStep";
import ReviewStep from "../steps/ReviewStep";
import ServiceStyleStep from "../steps/ServiceStyleStep";
import StaffingStep from "../steps/StaffingStep";
import ConfirmationScreen from "./ConfirmationScreen";
import PriceEstimateBadge from "./PriceEstimateBadge";
import ProgressBar from "./ProgressBar";
import StepNavigation from "./StepNavigation";

interface Props {
  pricingRules?: PricingRules;
}

export default function IntakeWizardShell({ pricingRules }: Props) {
  const rules = pricingRules || defaultPricingRules;
  const wizard = useWizardState(rules);
  const [submitResult, setSubmitResult] = useState<{
    aiSummary: string;
    emailDraft: string;
  } | null>(null);

  const canProceed = useMemo(() => {
    const d = wizard.formData;
    switch (wizard.currentStep) {
      case 0:
        return !!d.occasionType;
      case 1:
        return !!d.eventFormat && d.guestCount > 0;
      case 2:
        return !!d.serviceStyle;
      case 3:
        return true;
      case 4:
        return !!d.staffingLevel;
      case 5:
        return !!d.barService;
      case 6:
        return true;
      case 7:
        return (
          !!d.contactName.trim() && !!d.email.trim() && d.email.includes("@")
        );
      case 8:
        return !!d.contactName.trim() && !!d.email.trim();
      default:
        return true;
    }
  }, [wizard.currentStep, wizard.formData]);

  const handleSubmit = async () => {
    wizard.setIsSubmitting(true);
    try {
      const result = await submitLead(wizard.formData, wizard.estimate);
      setSubmitResult({
        aiSummary: result.aiSummary,
        emailDraft: result.emailDraft,
      });
      wizard.setIsSubmitted(true);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      wizard.setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    window.location.reload();
  };

  if (wizard.isSubmitted && submitResult) {
    return (
      <ConfirmationScreen
        aiSummary={submitResult.aiSummary}
        contactName={wizard.formData.contactName}
        email={wizard.formData.email}
        emailDraft={submitResult.emailDraft}
        estimate={wizard.estimate}
        onReset={handleReset}
      />
    );
  }

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return (
          <EventVisionStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 1:
        return (
          <EventDetailsStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 2:
        return (
          <ServiceStyleStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 3:
        return (
          <MenuPreferencesStep
            formData={wizard.formData}
            toggleArrayItem={wizard.toggleArrayItem}
            updateField={wizard.updateField}
          />
        );
      case 4:
        return (
          <StaffingStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 5:
        return (
          <ExtrasStep
            formData={wizard.formData}
            toggleArrayItem={wizard.toggleArrayItem}
            updateField={wizard.updateField}
          />
        );
      case 6:
        return (
          <LogisticsStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 7:
        return (
          <FinalDetailsStep
            formData={wizard.formData}
            updateField={wizard.updateField}
          />
        );
      case 8:
        return (
          <ReviewStep estimate={wizard.estimate} formData={wizard.formData} />
        );
      default:
        return null;
    }
  };

  const showEstimate =
    wizard.currentStep >= 2 && wizard.currentStep < WIZARD_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="sticky top-0 z-50 border-stone-100 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800">
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-semibold text-sm text-stone-800 tracking-tight sm:block">
              Event Inquiry
            </span>
          </div>
          {showEstimate && (
            <PriceEstimateBadge compact estimate={wizard.estimate} />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 pb-4 sm:px-6">
        <ProgressBar
          currentStep={wizard.currentStep}
          onStepClick={wizard.goToStep}
          steps={WIZARD_STEPS}
        />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm md:p-10">
          <div className="animate-fadeIn" key={wizard.currentStep}>
            {renderStep()}
          </div>

          <StepNavigation
            canProceed={canProceed}
            currentStep={wizard.currentStep}
            isSubmitting={wizard.isSubmitting}
            onBack={wizard.goBack}
            onNext={wizard.goNext}
            onSubmit={handleSubmit}
            totalSteps={WIZARD_STEPS.length}
          />
        </div>
      </main>

      <footer className="px-4 py-8 text-center">
        <p className="text-stone-300 text-xs">
          All estimates are non-binding. Your information is handled with care
          and never shared.
        </p>
      </footer>
    </div>
  );
}
