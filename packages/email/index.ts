import { Resend } from "resend";
import { keys } from "./keys";

export const resend = new Resend(keys().RESEND_TOKEN);

// Re-export templates
export { ContactTemplate } from "./templates/contact";
export { ContractTemplate } from "./templates/contract";
export { ProposalTemplate } from "./templates/proposal";

// Export types
export type { ContactTemplateProps } from "./templates/contact";
export type { ContractTemplateProps } from "./templates/contract";
export type { ProposalTemplateProps } from "./templates/proposal";
