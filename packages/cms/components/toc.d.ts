import { RichText } from "basehub/react-rich-text";
import type { ComponentProps } from "react";
type TableOfContentsProperties = Omit<
  ComponentProps<typeof RichText>,
  "children"
> & {
  readonly data: ComponentProps<typeof RichText>["children"];
};
export declare const TableOfContents: ({
  data,
  ...props
}: TableOfContentsProperties) => import("react").JSX.Element;
//# sourceMappingURL=toc.d.ts.map
