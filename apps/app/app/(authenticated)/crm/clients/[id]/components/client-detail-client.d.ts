interface ClientDetailProps {
  client: {
    id: string;
    tenantId: string;
    clientType: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
    defaultPaymentTerms: number | null;
    taxExempt: boolean;
    taxId: string | null;
    notes: string | null;
    tags: string[];
    source: string | null;
    assignedTo: string | null;
    createdAt: Date;
    updatedAt: Date;
    contacts: Array<{
      id: string;
      first_name: string;
      last_name: string;
      title: string | null;
      email: string | null;
      phone: string | null;
      isPrimary: boolean;
      isBillingContact: boolean;
    }>;
    preferences: Array<{
      id: string;
      preferenceType: string;
      preferenceKey: string;
      preferenceValue: unknown;
      notes: string | null;
    }>;
    interactionCount: number;
    eventCount: number;
    totalRevenue: {
      total: string;
    } | null;
  };
}
export declare function ClientDetailClient({
  client,
}: ClientDetailProps): import("react").JSX.Element;
//# sourceMappingURL=client-detail-client.d.ts.map
