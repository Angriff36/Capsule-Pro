import { Star } from "lucide-react";

export interface Vendor {
  address_line1: string | null;
  address_line2: string | null;
  catalog_item_count: number;
  city: string | null;
  contact_count: number;
  contact_person: string | null;
  country: string | null;
  created_at: string;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  payment_terms: string;
  performance_rating: number | null;
  phone: string | null;
  postal_code: string | null;
  state: string | null;
  supplier_number: string;
  tags: string[] | null;
  tax_id: string | null;
  updated_at: string;
  website: string | null;
}

export interface VendorContact {
  contact_email: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_role: string | null;
  created_at: string;
  id: string;
  is_primary: boolean;
  notes: string | null;
}

export interface VendorRating {
  category: string;
  comment: string | null;
  created_at: string;
  id: string;
  rated_by_name: string | null;
  rating: number;
}

export const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
  { value: "PREPAID", label: "Prepaid" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "NET_45", label: "Net 45" },
  { value: "NET_60", label: "Net 60" },
  { value: "NET_90", label: "Net 90" },
  { value: "COD", label: "COD" },
];

export const RATING_CATEGORIES: { value: string; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "quality", label: "Quality" },
  { value: "delivery", label: "Delivery" },
  { value: "value", label: "Value" },
  { value: "communication", label: "Communication" },
];

export const formatPaymentTerms = (terms: string) => {
  const option = PAYMENT_TERMS_OPTIONS.find((o) => o.value === terms);
  return option?.label || terms;
};

export const RatingStars = ({
  rating,
  size = "sm",
}: {
  rating: number | null;
  size?: "sm" | "md";
}) => {
  const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  if (!rating) {
    return <span className="text-muted-foreground text-xs">Not rated</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          className={`${sizeClass} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          key={i}
        />
      ))}
      <span className="ml-1 text-muted-foreground text-xs">
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
};

export const VendorAddress = ({
  vendor,
}: {
  vendor: Pick<
    Vendor,
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "postal_code"
    | "country"
  >;
}) => {
  const parts = [
    vendor.address_line1,
    vendor.address_line2,
    vendor.city,
    [vendor.state, vendor.postal_code].filter(Boolean).join(" "),
    vendor.country,
  ].filter(Boolean);

  if (!parts.length) {
    return <span className="text-muted-foreground text-sm">No address</span>;
  }
  return <span className="text-sm">{parts.join(", ")}</span>;
};
