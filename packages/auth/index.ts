// Public surface barrel for @repo/auth.
// Re-exports component primitives so apps can `import { SignIn, SignUp } from "@repo/auth"`
// instead of deep-importing `@repo/auth/components/sign-in`.
//
// Server / client / proxy modules continue to be imported via their dedicated paths
// (`@repo/auth/server`, `@repo/auth/client`, `@repo/auth/proxy`, `@repo/auth/keys`,
// `@repo/auth/provider`) because they are environment-scoped (e.g. `server-only`)
// and must not be pulled into a single barrel.

export { SignIn } from "./components/sign-in";
export { SignUp } from "./components/sign-up";
