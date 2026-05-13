import { useState, useMemo } from 'react';
import { useWizardState, WIZARD_STEPS } from '../../hooks/useWizardState';
import { defaultPricingRules } from '../../config/pricingRules';
import { submitLead } from '../../utils/submitLead';
import ProgressBar from './ProgressBar';
import StepNavigation from './StepNavigation';
import PriceEstimateBadge from './PriceEstimateBadge';
import ConfirmationScreen from './ConfirmationScreen';
import EventVisionStep from '../steps/EventVisionStep';
import EventDetailsStep from '../steps/EventDetailsStep';
import ServiceStyleStep from '../steps/ServiceStyleStep';
import MenuPreferencesStep from '../steps/MenuPreferencesStep';
import StaffingStep from '../steps/StaffingStep';
import ExtrasStep from '../steps/ExtrasStep';
import LogisticsStep from '../steps/LogisticsStep';
import FinalDetailsStep from '../steps/FinalDetailsStep';
import ReviewStep from '../steps/ReviewStep';
import type { PricingRules } from '../../types/pricing';
import { UtensilsCrossed } from 'lucide-react';

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
      case 0: return !!d.occasionType;
      case 1: return !!d.eventFormat && d.guestCount > 0;
      case 2: return !!d.serviceStyle;
      case 3: return true;
      case 4: return !!d.staffingLevel;
      case 5: return !!d.barService;
      case 6: return true;
      case 7: return !!d.contactName.trim() && !!d.email.trim() && d.email.includes('@');
      case 8: return !!d.contactName.trim() && !!d.email.trim();
      default: return true;
    }
  }, [wizard.currentStep, wizard.formData]);

  const handleSubmit = async () => {
    wizard.setIsSubmitting(true);
    try {
      const result = await submitLead(wizard.formData, wizard.estimate);
      setSubmitResult({ aiSummary: result.aiSummary, emailDraft: result.emailDraft });
      wizard.setIsSubmitted(true);
    } catch (err) {
      console.error('Submit failed:', err);
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
        contactName={wizard.formData.contactName}
        email={wizard.formData.email}
        estimate={wizard.estimate}
        aiSummary={submitResult.aiSummary}
        emailDraft={submitResult.emailDraft}
        onReset={handleReset}
      />
    );
  }

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 0:
        return <EventVisionStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 1:
        return <EventDetailsStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 2:
        return <ServiceStyleStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 3:
        return (
          <MenuPreferencesStep
            formData={wizard.formData}
            updateField={wizard.updateField}
            toggleArrayItem={wizard.toggleArrayItem}
          />
        );
      case 4:
        return <StaffingStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 5:
        return (
          <ExtrasStep
            formData={wizard.formData}
            updateField={wizard.updateField}
            toggleArrayItem={wizard.toggleArrayItem}
          />
        );
      case 6:
        return <LogisticsStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 7:
        return <FinalDetailsStep formData={wizard.formData} updateField={wizard.updateField} />;
      case 8:
        return <ReviewStep formData={wizard.formData} estimate={wizard.estimate} />;
      default:
        return null;
    }
  };

  const showEstimate = wizard.currentStep >= 2 && wizard.currentStep < WIZARD_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-800 tracking-tight hidden sm:block">
              Event Inquiry
            </span>
          </div>
          {showEstimate && <PriceEstimateBadge estimate={wizard.estimate} compact />}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <ProgressBar steps={WIZARD_STEPS} currentStep={wizard.currentStep} onStepClick={wizard.goToStep} />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-10">
          <div key={wizard.currentStep} className="animate-fadeIn">
            {renderStep()}
          </div>

          <StepNavigation
            totalSteps={WIZARD_STEPS.length}
            currentStep={wizard.currentStep}
            onBack={wizard.goBack}
            onNext={wizard.goNext}
            onSubmit={handleSubmit}
            isSubmitting={wizard.isSubmitting}
            canProceed={canProceed}
          />
        </div>
      </main>

      <footer className="text-center py-8 px-4">
        <p className="text-xs text-stone-300">
          All estimates are non-binding. Your information is handled with care and never shared.
        </p>
      </footer>
    </div>
  );
}
