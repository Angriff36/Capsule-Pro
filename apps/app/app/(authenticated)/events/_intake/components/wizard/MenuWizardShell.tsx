import { BookOpen, Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { validateMenuSelection } from "../../engine/menuConstraints";
import {
  MENU_WIZARD_STEPS,
  useMenuWizardState,
} from "../../hooks/useMenuWizardState";
import type {
  CostDataProvider,
  MenuPricingConfig,
  OwnerViewConfig,
} from "../../types/menu";
import { formatCurrency } from "../../utils/webhookPayload";
import MenuAddOnsStep from "../menu-steps/MenuAddOnsStep";
import MenuContextStep from "../menu-steps/MenuContextStep";
import MenuDietaryStep from "../menu-steps/MenuDietaryStep";
import MenuDirectionStep from "../menu-steps/MenuDirectionStep";
import MenuMainsStep from "../menu-steps/MenuMainsStep";
import MenuReviewStep from "../menu-steps/MenuReviewStep";
import MenuServiceStyleStep from "../menu-steps/MenuServiceStyleStep";
import MenuSidesStep from "../menu-steps/MenuSidesStep";
import ProgressBar from "./ProgressBar";
import StepNavigation from "./StepNavigation";

interface Props {
  costProvider?: CostDataProvider;
  pricingConfig?: MenuPricingConfig;
  ownerViewConfig?: OwnerViewConfig;
}

export default function MenuWizardShell({
  costProvider,
  pricingConfig,
  ownerViewConfig,
}: Props) {
  const showPrice = pricingConfig?.enabled ?? false;
  const ownerEnabled = ownerViewConfig?.enabled ?? false;
  const [ownerView, setOwnerView] = useState(false);
  const showCost = ownerEnabled && ownerView;

  const menu = useMenuWizardState(costProvider);
  const { formData, loadCosts, setIsGeneratingStory, setMenuStory } = menu;

  useEffect(() => {
    if (showCost && formData.selectedItems.length > 0) {
      loadCosts(formData.selectedItems);
    }
  }, [formData.selectedItems, loadCosts, showCost]);

  const canProceed = useMemo(() => {
    switch (menu.currentStep) {
      case 0:
        return !!menu.formData.occasionType && menu.formData.guestCount > 0;
      case 1:
        return !!menu.formData.serviceStyle;
      case 2:
        return !!menu.formData.menuDirection;
      case 3: {
        const v = validateMenuSelection(menu.formData);
        const hasMain = menu.formData.selectedItems.some((id) =>
          id.startsWith("main-")
        );
        return (
          hasMain && v.errors.filter((e) => e.includes("main")).length === 0
        );
      }
      case 4: {
        const hasSide = menu.formData.selectedItems.some((id) =>
          id.startsWith("side-")
        );
        return hasSide;
      }
      case 5:
        return true;
      case 6:
        return true;
      case 7:
        return validateMenuSelection(menu.formData).valid;
      default:
        return true;
    }
  }, [menu.currentStep, menu.formData]);

  const handleGenerateStory = useCallback(async () => {
    setIsGeneratingStory(true);
    try {
      const response = await fetch("/api/menu-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (response.ok) {
        const result = await response.json();
        setMenuStory(result.story || "");
      }
    } catch {
      // non-critical
    } finally {
      setIsGeneratingStory(false);
    }
  }, [formData, setIsGeneratingStory, setMenuStory]);

  const handleFinalize = () => {
    // no-op on last step, review is the end
  };

  const renderStep = () => {
    switch (menu.currentStep) {
      case 0:
        return (
          <MenuContextStep
            formData={menu.formData}
            updateField={menu.updateField}
          />
        );
      case 1:
        return (
          <MenuServiceStyleStep
            formData={menu.formData}
            updateField={menu.updateField}
          />
        );
      case 2:
        return (
          <MenuDirectionStep
            formData={menu.formData}
            updateField={menu.updateField}
          />
        );
      case 3:
        return (
          <MenuMainsStep
            costCache={menu.costCache}
            formData={menu.formData}
            showCost={showCost}
            showPrice={showPrice}
            toggleMenuItem={menu.toggleMenuItem}
          />
        );
      case 4:
        return (
          <MenuSidesStep
            costCache={menu.costCache}
            formData={menu.formData}
            showCost={showCost}
            showPrice={showPrice}
            toggleMenuItem={menu.toggleMenuItem}
          />
        );
      case 5:
        return (
          <MenuDietaryStep
            formData={menu.formData}
            toggleDietaryNeed={menu.toggleDietaryNeed}
            updateDietaryCount={menu.updateDietaryCount}
          />
        );
      case 6:
        return (
          <MenuAddOnsStep
            costCache={menu.costCache}
            formData={menu.formData}
            showCost={showCost}
            showPrice={showPrice}
            toggleMenuItem={menu.toggleMenuItem}
            updateField={menu.updateField}
          />
        );
      case 7:
        return (
          <MenuReviewStep
            costCache={menu.costCache}
            formData={menu.formData}
            isGeneratingStory={menu.isGeneratingStory}
            menuStory={menu.menuStory}
            onGenerateStory={handleGenerateStory}
            perPersonTotal={menu.perPersonTotal}
            showCost={showCost}
            showPrice={showPrice}
          />
        );
      default:
        return null;
    }
  };

  const selectedCount = menu.formData.selectedItems.length;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-800 tracking-tight hidden sm:block">
              Menu Composer
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-full px-3 py-1.5">
                <span>
                  {selectedCount} {selectedCount === 1 ? "item" : "items"}
                </span>
                {showPrice && (
                  <span className="text-stone-400">
                    | {formatCurrency(menu.perPersonTotal)}/pp
                  </span>
                )}
              </div>
            )}
            {ownerEnabled && (
              <button
                className={`
                  flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all
                  ${
                    ownerView
                      ? "bg-stone-800 text-white border-stone-800"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                  }
                `}
                onClick={() => setOwnerView(!ownerView)}
                type="button"
              >
                {ownerView ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
                {ownerView ? "Hide Costs" : "Owner View"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <ProgressBar
          currentStep={menu.currentStep}
          onStepClick={menu.goToStep}
          steps={MENU_WIZARD_STEPS}
        />
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 md:p-10">
          <div className="animate-fadeIn" key={menu.currentStep}>
            {renderStep()}
          </div>

          <StepNavigation
            canProceed={canProceed}
            currentStep={menu.currentStep}
            isSubmitting={false}
            onBack={menu.goBack}
            onNext={menu.goNext}
            onSubmit={handleFinalize}
            submitLabel="View Final Menu"
            submittingLabel="Loading..."
            totalSteps={MENU_WIZARD_STEPS.length}
          />
        </div>
      </main>

      <footer className="text-center py-8 px-4">
        <p className="text-xs text-stone-300">
          Menu items are subject to seasonal availability. Final selections
          confirmed with your event coordinator.
        </p>
      </footer>
    </div>
  );
}
