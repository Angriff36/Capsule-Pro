"use client";

import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Vendor {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface POFormData {
  expectedDeliveryDate: string;
  locationId: string;
  notes: string;
  vendorId: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface POFormProps {
  /** Rendered between vendor section and notes (e.g., line items card) */
  children?: React.ReactNode;
  form: POFormData;
  locations: Location[];
  onChange: (update: Partial<POFormData>) => void;
  vendors: Vendor[];
}

export function POForm({
  form,
  vendors,
  locations,
  onChange,
  children,
}: POFormProps) {
  return (
    <div className="space-y-6">
      {/* Vendor & Dates */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Vendor *</Label>
          <Select
            onValueChange={(v) => onChange({ vendorId: v })}
            value={form.vendorId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vendor..." />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Delivery Location</Label>
          <Select
            onValueChange={(v) => onChange({ locationId: v })}
            value={form.locationId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Use default location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Expected Delivery Date</Label>
          <DatePicker
            onChange={(e) => onChange({ expectedDeliveryDate: e.target.value })}
            value={form.expectedDeliveryDate}
          />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Internal notes about this order..."
            rows={3}
            value={form.notes}
          />
        </div>
      </div>

      {children}
    </div>
  );
}
