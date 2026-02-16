"use client";

import { Label } from "@repo/design-system/components/ui/label";
import { MenuFormWithConstraints } from "./menu-form-with-constraints";

export function NewMenuFormClient() {
  return (
    <MenuFormWithConstraints formMode="create">
      {({ handleSubmit, isSubmitting, error, dishesSelector }) => (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Menu Information</h2>

              <div className="grid gap-2">
                <Label htmlFor="name">Menu Name *</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="name"
                  name="name"
                  placeholder="Enter menu name"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="description"
                  name="description"
                  placeholder="Enter menu description"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  id="category"
                  name="category"
                  placeholder="e.g., Italian, Asian, Buffet"
                />
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pricing</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="basePrice">Base Price ($)</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="basePrice"
                    name="basePrice"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pricePerPerson">Price Per Person ($)</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="pricePerPerson"
                    name="pricePerPerson"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minGuests">Min Guests</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="minGuests"
                    name="minGuests"
                    placeholder="0"
                    type="number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxGuests">Max Guests</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    id="maxGuests"
                    name="maxGuests"
                    placeholder="0"
                    type="number"
                  />
                </div>
              </div>
            </div>

            {/* Dishes Section */}
            {dishesSelector}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                onClick={() => window.history.back()}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Creating..." : "Create Menu"}
              </button>
            </div>
          </div>
        </form>
      )}
    </MenuFormWithConstraints>
  );
}
