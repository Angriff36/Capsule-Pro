"use client";

import MenuWizardShell from "../_intake/components/wizard/MenuWizardShell";
import { MockCostDataProvider } from "../_intake/providers/CostDataProvider";

const costProvider = new MockCostDataProvider();

export function MenuBuilderClient() {
  return (
    <MenuWizardShell
      costProvider={costProvider}
      ownerViewConfig={{ enabled: true }}
      pricingConfig={{ enabled: true, showPerPerson: true }}
    />
  );
}
