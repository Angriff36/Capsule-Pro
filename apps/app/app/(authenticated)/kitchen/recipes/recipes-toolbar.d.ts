type RecipesTab = {
  value: string;
  label: string;
  count?: number;
};
type RecipesToolbarProps = {
  tabs: RecipesTab[];
  activeTab: string;
  initialQuery?: string;
  initialCategory?: string;
  initialDietary?: string;
  initialStatus?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
};
export declare const RecipesToolbar: ({
  tabs,
  activeTab,
  initialQuery,
  initialCategory,
  initialDietary,
  initialStatus,
  primaryAction,
}: RecipesToolbarProps) => import("react").JSX.Element;
//# sourceMappingURL=recipes-toolbar.d.ts.map
