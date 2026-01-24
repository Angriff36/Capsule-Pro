import type NextError from "next/error";
type GlobalErrorProperties = {
  readonly error: NextError & {
    digest?: string;
  };
  readonly reset: () => void;
};
declare const GlobalError: ({
  error,
  reset,
}: GlobalErrorProperties) => import("react").JSX.Element;
export default GlobalError;
//# sourceMappingURL=global-error.d.ts.map
