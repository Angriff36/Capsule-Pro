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
  ownerViewConfig?: OwnerViewConfig;
  pricingConfig?: MenuPricingConfig;
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
      <header className="sticky top-0 z-50 border-stone-100 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-semibold text-sm text-stone-800 tracking-tight sm:block">
              Menu Composer
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-stone-50 px-3 py-1.5 text-stone-500 text-xs">
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
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                  ownerView
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 bg-white text-stone-500 hover:border-stone-400"
                }
                `}
                onClick={() => setOwnerView(!ownerView)}
                type="button"
              >
                {ownerView ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {ownerView ? "Hide Costs" : "Owner View"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 pb-4 sm:px-6">
        <ProgressBar
          currentStep={menu.currentStep}
          onStepClick={menu.goToStep}
          steps={MENU_WIZARD_STEPS}
        />
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-10">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm md:p-10">
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

      <footer className="px-4 py-8 text-center">
        <p className="text-stone-300 text-xs">
          Menu items are subject to seasonal availability. Final selections
          confirmed with your event coordinator.
        </p>
      </footer>
    </div>
  );
}
