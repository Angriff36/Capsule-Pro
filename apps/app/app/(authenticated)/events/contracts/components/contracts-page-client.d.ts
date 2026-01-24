/**
 * @module ContractsPageClient
 * @intent Client-side filtering, search, and pagination for contracts list
 * @responsibility Handle user interactions for contracts list page
 * @domain Events
 * @tags contracts, events, crm
 * @canonical true
 */
interface Contract {
  id: string;
  tenantId: string;
  eventId: string;
  clientId: string;
  contractNumber: string | null;
  title: string;
  status: string;
  documentUrl: string | null;
  documentType: string | null;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  event?: {
    id: string;
    title: string;
    eventDate: Date;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
}
interface ContractsPageClientProps {
  contracts: Contract[];
  uniqueStatuses: string[];
  uniqueClients: string[];
  uniqueDocumentTypes: string[];
  tenantId: string;
}
export declare const ContractsPageClient: ({
  contracts,
  uniqueStatuses,
  uniqueClients,
  uniqueDocumentTypes,
  tenantId,
}: ContractsPageClientProps) => import("react").JSX.Element;
//# sourceMappingURL=contracts-page-client.d.ts.map
