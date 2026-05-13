"use client";

import { MockCostDataProvider } from "../_intake/providers/CostDataProvider";
import MenuWizardShell from "../_intake/components/wizard/MenuWizardShell";

const costProvider = new MockCostDataProvider();

export function MenuBuilderClient() {
  return (
    <MenuWizardShell
      costProvider={costProvider}
      pricingConfig={{ enabled: true, showPerPerson: true }}
      ownerViewConfig={{ enabled: true }}
    />
  );
}
