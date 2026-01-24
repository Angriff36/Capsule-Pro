import "server-only";
type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | {
      [key: string]: Json | undefined;
    };
type LiveblocksUserInfo = {
  [key: string]: Json | undefined;
  name?: string;
  avatar?: string;
};
type AuthenticateOptions = {
  userId: string;
  orgId: string;
  userInfo?: LiveblocksUserInfo;
};
export declare const authenticate: ({
  userId,
  orgId,
  userInfo,
}: AuthenticateOptions) => Promise<Response>;
//# sourceMappingURL=auth.d.ts.map
