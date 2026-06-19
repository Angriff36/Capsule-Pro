"use client";

import { useMutation } from "@tanstack/react-query";
import { previewEventEditImpact } from "./preview-event-edit-impact";
import type { EventEditImpact } from "./event-edit-impact";

/**
 * Fires the read-only `previewEventEditImpact` server action and exposes the
 * result + loading/error state to the Event Editor Modal.
 *
 * Intentionally a mutation (not a query) so impact computation runs only when
 * the user asks for it — not on every keystroke. Mirrors the lazy-preview
 * pattern used by the board layer's impact/commit dialog.
 */
export function useEventEditImpactPreview() {
  return useMutation<EventEditImpact, Error, FormData>({
    mutationFn: (formData) => previewEventEditImpact(formData),
  });
}
