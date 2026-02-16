import { vi } from "vitest";

export const SignIn = () => <div data-testid="clerk-sign-in" />;
export const SignUp = () => <div data-testid="clerk-sign-up" />;
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
export const useSession = vi.fn(() => ({ session: null, isLoaded: true }));
export const useUser = vi.fn(() => ({ user: null, isLoaded: true }));
export const useAuth = vi.fn(() => ({ isSignedIn: false, isLoaded: true }));
export const useClerk = vi.fn(() => ({}));
export const withClerkMiddleware = vi.fn((handler: unknown) => handler);
export const getAuth = vi.fn(() => ({ userId: null }));
