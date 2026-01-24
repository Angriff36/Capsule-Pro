export declare const webhooks: {
  send: (
    eventType: string,
    payload: object
  ) => Promise<import("svix").MessageOut | undefined>;
  getAppPortal: () => Promise<import("svix").AppPortalAccessOut | undefined>;
};
//# sourceMappingURL=index.d.ts.map
