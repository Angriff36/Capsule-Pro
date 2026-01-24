type SearchPageProperties = {
  searchParams: Promise<{
    q: string;
  }>;
};
export declare const generateMetadata: ({
  searchParams,
}: SearchPageProperties) => Promise<{
  title: string;
  description: string;
}>;
declare const SearchPage: ({
  searchParams,
}: SearchPageProperties) => Promise<import("react").JSX.Element>;
export default SearchPage;
//# sourceMappingURL=page.d.ts.map
