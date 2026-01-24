/**
 * @module ContractDetailClient
 * @intent Client component for contract detail page with signature capture and actions
 * @responsibility Render contract details, manage signatures, handle document uploads, and process actions
 * @domain Events
 * @tags contracts, client-component, signatures
 * @canonical true
 */
import type { ContractSignature, EventContract } from "@repo/database";
type ContractDetailClientProps = {
  contract: EventContract;
  event: {
    id: string;
    title: string;
    eventDate: Date;
    eventNumber: string | null;
    venueName: string | null;
  } | null;
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  signatures: ContractSignature[];
};
export declare function ContractDetailClient({
  contract,
  event,
  client,
  signatures: initialSignatures,
}: ContractDetailClientProps): import("react").JSX.Element;
//# sourceMappingURL=contract-detail-client.d.ts.map
