import { Resend } from "resend";
import { keys } from "./keys";

// Lazy singleton — instantiated on first use, not at module load time.
// This prevents build-time crashes when RESEND_TOKEN is not available.
let _resend: Resend | null = null;
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    if (!_resend) {
      _resend = new Resend(keys().RESEND_TOKEN);
    }
    return (_resend as any)[prop];
  },
});

// Export types
export type { ContactTemplateProps } from "./templates/contact";
// Re-export templates
export { ContactTemplate } from "./templates/contact";
export type { ContractTemplateProps } from "./templates/contract";
export { ContractTemplate } from "./templates/contract";
export type { InvoiceTemplateProps } from "./templates/invoice";
export { InvoiceTemplate } from "./templates/invoice";
export type { ProposalTemplateProps } from "./templates/proposal";
export { ProposalTemplate } from "./templates/proposal";
