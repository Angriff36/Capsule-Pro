import "server-only";
export declare const send: (
  eventType: string,
  payload: object
) => Promise<import("svix").MessageOut | undefined>;
export declare const getAppPortal: () => Promise<
  import("svix").AppPortalAccessOut | undefined
>;
//# sourceMappingURL=svix.d.ts.map
