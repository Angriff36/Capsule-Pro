type UploadAction = (formData: FormData) => Promise<void>;
type RecipeImagePlaceholderProps = {
  recipeName: string;
  uploadAction: UploadAction;
};
export declare const RecipeImagePlaceholder: ({
  recipeName,
  uploadAction,
}: RecipeImagePlaceholderProps) => import("react").JSX.Element;
//# sourceMappingURL=recipe-image-placeholder.d.ts.map
