/**
 * @module AllergenManagementModal
 * @intent Provide modal interface for editing allergen and dietary tag information
 * @responsibility Render modal with checkboxes for allergens and dietary tags, handle save operations
 * @domain Kitchen
 * @tags allergens, modal, form, dietary-restrictions
 * @canonical true
 */
interface AllergenManagementModalProps {
  type: "dish" | "recipe";
  id: string;
  name: string;
  currentAllergens: string[];
  currentDietaryTags: string[];
  tenantId: string;
}
export declare function AllergenManagementModal({
  type,
  id,
  name,
  currentAllergens,
  currentDietaryTags,
  tenantId,
}: AllergenManagementModalProps): import("react").JSX.Element;
//# sourceMappingURL=allergen-management-modal.d.ts.map
