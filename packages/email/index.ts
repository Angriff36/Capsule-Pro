import { Resend } from "resend";
import { keys } from "./keys";

export const resend = new Resend(keys().RESEND_TOKEN);

// Export types
export type { ContactTemplateProps } from "./templates/contact";
// Re-export templates
export { ContactTemplate } from "./templates/contact";
export type { ContractTemplateProps } from "./templates/contract";
export { ContractTemplate } from "./templates/contract";
export type { ProposalTemplateProps } from "./templates/proposal";
export { ProposalTemplate } from "./templates/proposal";
