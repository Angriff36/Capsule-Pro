type RecipesPageProps = {
  searchParams?: Promise<{
    tab?: string;
    q?: string;
    category?: string;
    dietary?: string;
    status?: string;
  }>;
};
declare const KitchenRecipesPage: ({
  searchParams,
}: RecipesPageProps) => Promise<import("react").JSX.Element>;
export default KitchenRecipesPage;
//# sourceMappingURL=page.d.ts.map
