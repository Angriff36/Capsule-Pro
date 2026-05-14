import type {
  CostDataProvider,
  MenuPricingConfig,
  OwnerViewConfig,
} from "../../types/menu";
import type { PricingRules } from "../../types/pricing";
import IntakeWizardShell from "./IntakeWizardShell";
import MenuWizardShell from "./MenuWizardShell";

export type WizardMode = "intake" | "menu";

interface WizardShellProps {
  mode?: WizardMode;
  pricingRules?: PricingRules;
  costProvider?: CostDataProvider;
  menuPricingConfig?: MenuPricingConfig;
  ownerViewConfig?: OwnerViewConfig;
}

export default function WizardShell({
  mode = "intake",
  pricingRules,
  costProvider,
  menuPricingConfig,
  ownerViewConfig,
}: WizardShellProps) {
  if (mode === "menu") {
    return (
      <MenuWizardShell
        costProvider={costProvider}
        ownerViewConfig={ownerViewConfig}
        pricingConfig={menuPricingConfig}
      />
    );
  }

  return <IntakeWizardShell pricingRules={pricingRules} />;
}
