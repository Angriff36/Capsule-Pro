"use client";

import { updateDishName, updateDishPrice, updateRecipeName } from "../actions";
import { InlinePriceInput, InlineTextInput } from "./inline-edit";

export function InlineRecipeName({
  recipeId,
  name,
}: {
  recipeId: string;
  name: string;
}) {
  return (
    <InlineTextInput
      className="truncate font-medium text-foreground text-sm transition-colors group-hover:text-[var(--brand-leafy-green)]"
      onSave={(v) => updateRecipeName(recipeId, v)}
      value={name}
    />
  );
}

export function InlineDishName({
  dishId,
  name,
}: {
  dishId: string;
  name: string;
}) {
  return (
    <InlineTextInput
      className="truncate font-medium text-foreground text-sm transition-colors group-hover:text-[var(--brand-leafy-green)]"
      onSave={(v) => updateDishName(dishId, v)}
      value={name}
    />
  );
}

export function InlineDishPrice({
  dishId,
  price,
}: {
  dishId: string;
  price: string | null;
}) {
  return (
    <InlinePriceInput
      className="font-semibold text-[var(--brand-golden-zest)]"
      onSave={(v) => updateDishPrice(dishId, v)}
      value={price}
    />
  );
}
