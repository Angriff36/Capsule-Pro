"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProposalTemplate } from "../actions";

interface BrandingState {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

const fontFamilies = [
  { value: "", label: "Default (Helvetica)" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times-Roman", label: "Times Roman" },
  { value: "Courier", label: "Courier" },
];

const defaultColors = {
  primary: "#1e3a5f",
  secondary: "#4b5563",
  accent: "#3b82f6",
};

interface LineItem {
  sortOrder: number;
  itemType: string;
  category: string;
  description: string;
  quantity: number;
  unitOfMeasure?: string;
  unitPrice: number;
  notes?: string;
}

const itemTypes = [
  { value: "menu", label: "Menu Item" },
  { value: "service", label: "Service" },
  { value: "rental", label: "Rental Equipment" },
  { value: "staff", label: "Staffing" },
  { value: "fee", label: "Fee" },
  { value: "discount", label: "Discount" },
];

const eventTypes = [
  { value: "", label: "Any Event Type" },
  { value: "Wedding", label: "Wedding" },
  { value: "Corporate Event", label: "Corporate Event" },
  { value: "Social Gathering", label: "Social Gathering" },
  { value: "Birthday Party", label: "Birthday Party" },
  { value: "Anniversary", label: "Anniversary" },
  { value: "Graduation", label: "Graduation" },
  { value: "Holiday Party", label: "Holiday Party" },
  { value: "Fundraiser", label: "Fundraiser" },
];

export default function NewProposalTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [defaultNotes, setDefaultNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  const [branding, setBranding] = useState<BrandingState>({
    logoUrl: "",
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
    fontFamily: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    itemType: "menu",
    category: "general",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const addLineItem = () => {
    if (!newItem.description) {
      toast.error("Please enter a description");
      return;
    }

    setLineItems([
      ...lineItems,
      {
        sortOrder: lineItems.length,
        itemType: newItem.itemType || "menu",
        category: newItem.category || "general",
        description: newItem.description,
        quantity: newItem.quantity || 1,
        unitOfMeasure: newItem.unitOfMeasure,
        unitPrice: newItem.unitPrice || 0,
        notes: newItem.notes,
      },
    ]);

    setNewItem({
      itemType: "menu",
      category: "general",
      description: "",
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeLineItem = (sortOrder: number) => {
    setLineItems(lineItems.filter((item) => item.sortOrder !== sortOrder));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    startTransition(async () => {
      try {
        const _result = await createProposalTemplate({
          name: name.trim(),
          description: description.trim() || null,
          eventType: eventType || null,
          defaultTerms: defaultTerms.trim() || null,
          defaultTaxRate,
          defaultNotes: defaultNotes.trim() || null,
          defaultLineItems: lineItems,
          isActive,
          isDefault,
          branding: {
            logoUrl: branding.logoUrl.trim() || null,
            primaryColor: branding.primaryColor.trim() || null,
            secondaryColor: branding.secondaryColor.trim() || null,
            accentColor: branding.accentColor.trim() || null,
            fontFamily: branding.fontFamily.trim() || null,
          },
        });

        toast.success("Template created successfully");
        router.push("/crm/proposals/templates");
      } catch (error) {
        toast.error("Failed to create template", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} size="icon" variant="ghost">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Template</h1>
          <p className="text-muted-foreground">
            Create a reusable proposal template
          </p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>
                  Basic information about this template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Wedding Package Standard"
                      required
                      value={name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select onValueChange={setEventType} value={eventType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this template..."
                    rows={2}
                    value={description}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTerms">
                    Default Terms & Conditions
                  </Label>
                  <Textarea
                    id="defaultTerms"
                    onChange={(e) => setDefaultTerms(e.target.value)}
                    placeholder="Enter default terms and conditions..."
                    rows={4}
                    value={defaultTerms}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultNotes">Default Notes</Label>
                  <Textarea
                    id="defaultNotes"
                    onChange={(e) => setDefaultNotes(e.target.value)}
                    placeholder="Default notes for proposals using this template..."
                    rows={2}
                    value={defaultNotes}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Default Line Items</CardTitle>
                <CardDescription>
                  Pre-defined items for this template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new line item */}
                <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        onValueChange={(value) =>
                          setNewItem({ ...newItem, itemType: value })
                        }
                        value={newItem.itemType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            description: e.target.value,
                          })
                        }
                        placeholder="Item description"
                        value={newItem.description || ""}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        min="0"
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            quantity: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="1"
                        type="number"
                        value={newItem.quantity || ""}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        min="0"
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            unitPrice: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={newItem.unitPrice || ""}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={addLineItem}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Line items table */}
                {lineItems.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item) => (
                          <TableRow
                            key={`item-${item.sortOrder}-${item.description}`}
                          >
                            <TableCell>
                              <Badge className="text-xs" variant="outline">
                                {itemTypes.find(
                                  (t) => t.value === item.itemType
                                )?.label || item.itemType}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => removeLineItem(item.sortOrder)}
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {lineItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No items added yet. Add items above to define default line
                    items.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="defaultTaxRate"
                    min="0"
                    onChange={(e) =>
                      setDefaultTaxRate(Number.parseFloat(e.target.value) || 0)
                    }
                    step="0.01"
                    type="number"
                    value={defaultTaxRate}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Available for use in proposals
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Default Template</Label>
                    <p className="text-xs text-muted-foreground">
                      Used when no template is selected
                    </p>
                  </div>
                  <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                  Customize the appearance of proposals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    onChange={(e) =>
                      setBranding({ ...branding, logoUrl: e.target.value })
                    }
                    placeholder="https://example.com/logo.png"
                    value={branding.logoUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to your company logo for PDF proposals
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          primaryColor: e.target.value,
                        })
                      }
                      placeholder={defaultColors.primary}
                      type="text"
                      value={branding.primaryColor}
                    />
                    <Input
                      className="w-12 h-9 p-1 cursor-pointer"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          primaryColor: e.target.value,
                        })
                      }
                      type="color"
                      value={branding.primaryColor || defaultColors.primary}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          secondaryColor: e.target.value,
                        })
                      }
                      placeholder={defaultColors.secondary}
                      type="text"
                      value={branding.secondaryColor}
                    />
                    <Input
                      className="w-12 h-9 p-1 cursor-pointer"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          secondaryColor: e.target.value,
                        })
                      }
                      type="color"
                      value={branding.secondaryColor || defaultColors.secondary}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          accentColor: e.target.value,
                        })
                      }
                      placeholder={defaultColors.accent}
                      type="text"
                      value={branding.accentColor}
                    />
                    <Input
                      className="w-12 h-9 p-1 cursor-pointer"
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          accentColor: e.target.value,
                        })
                      }
                      type="color"
                      value={branding.accentColor || defaultColors.accent}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    onValueChange={(value) =>
                      setBranding({ ...branding, fontFamily: value })
                    }
                    value={branding.fontFamily}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <Button className="w-full" disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create Template"}
              </Button>
              <Button
                disabled={isPending}
                onClick={() => router.back()}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
