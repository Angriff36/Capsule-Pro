import type { ResolveMentionSuggestionsArgs } from "@liveblocks/client";
import type { ResolveUsersArgs } from "@liveblocks/node";
import { LiveblocksProvider } from "@liveblocks/react/suspense";
import type { ComponentProps, ReactNode } from "react";
type RoomProps = ComponentProps<typeof LiveblocksProvider> & {
  id: string;
  children: ReactNode;
  authEndpoint: string;
  fallback: ReactNode;
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Promise<Liveblocks["UserMeta"]["info"][]>;
  resolveMentionSuggestions?: (
    args: ResolveMentionSuggestionsArgs
  ) => Promise<string[]>;
};
export declare const Room: ({
  id,
  children,
  authEndpoint,
  fallback,
  ...props
}: RoomProps) => import("react").JSX.Element;
//# sourceMappingURL=room.d.ts.map
