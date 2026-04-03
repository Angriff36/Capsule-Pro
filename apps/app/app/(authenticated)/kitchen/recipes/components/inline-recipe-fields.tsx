"use client";

import { updateRecipeName, updateDishName, updateDishPrice } from "../actions";
import { InlineTextInput, InlinePriceInput } from "./inline-edit";

export function InlineRecipeName({
  recipeId,
  name,
}: {
  recipeId: string;
  name: string;
}) {
  return (
    <InlineTextInput
      value={name}
      onSave={(v) => updateRecipeName(recipeId, v)}
      className="font-medium text-sm text-foreground truncate group-hover:text-[var(--brand-leafy-green)] transition-colors"
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
      value={name}
      onSave={(v) => updateDishName(dishId, v)}
      className="font-medium text-sm text-foreground truncate group-hover:text-[var(--brand-leafy-green)] transition-colors"
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
      value={price}
      onSave={(v) => updateDishPrice(dishId, v)}
      className="font-semibold text-[var(--brand-golden-zest)]"
    />
  );
}
