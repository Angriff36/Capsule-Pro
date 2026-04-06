"use client";

import { Input } from "@repo/design-system/components/ui/input";
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

export interface POFormData {
  vendorId: string;
  expectedDeliveryDate: string;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface POFormProps {
  form: POFormData;
  vendors: Vendor[];
  onChange: (update: Partial<POFormData>) => void;
  /** Rendered between vendor section and notes (e.g., line items card) */
  children?: React.ReactNode;
}

export function POForm({ form, vendors, onChange, children }: POFormProps) {
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
          <Label>Expected Delivery Date</Label>
          <Input
            onChange={(e) => onChange({ expectedDeliveryDate: e.target.value })}
            type="date"
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
