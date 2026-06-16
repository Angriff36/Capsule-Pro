/**
 * Clerk → Convex JWT validation.
 * Create a Clerk JWT template named "convex" with claims:
 *   role, tenant_id (from org/account resolution)
 * @see https://docs.convex.dev/auth/clerk
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
