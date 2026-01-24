import { type ColorMode } from "@knocklabs/react";
import type { ReactNode } from "react";
type NotificationsProviderProps = {
  children: ReactNode;
  userId: string;
  theme: ColorMode;
};
export declare const NotificationsProvider: ({
  children,
  theme,
  userId,
}: NotificationsProviderProps) =>
  | string
  | number
  | bigint
  | boolean
  | import("react").JSX.Element
  | Iterable<ReactNode>
  | Promise<
      | string
      | number
      | bigint
      | boolean
      | import("react").ReactPortal
      | import("react").ReactElement<
          unknown,
          string | import("react").JSXElementConstructor<any>
        >
      | Iterable<ReactNode>
      | null
      | undefined
    >
  | null
  | undefined;
//# sourceMappingURL=provider.d.ts.map
