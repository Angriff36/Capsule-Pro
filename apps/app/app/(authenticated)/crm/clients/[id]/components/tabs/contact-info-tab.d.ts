interface ContactInfoTabProps {
  client: {
    id: string;
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
  };
  onEdit?: () => void;
}
export declare function ContactInfoTab({
  client,
  onEdit,
}: ContactInfoTabProps): import("react").JSX.Element;
//# sourceMappingURL=contact-info-tab.d.ts.map
