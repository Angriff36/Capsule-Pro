type AuthTokenGetter = () => Promise<string | null>;

let authTokenGetter: AuthTokenGetter | null = null;

export async function getAuthToken(): Promise<string | null> {
  return authTokenGetter ? authTokenGetter() : null;
}

export function setAuthTokenGetter(getter: AuthTokenGetter): void {
  authTokenGetter = getter;
}

export function clearAuthTokenGetter(): void {
  authTokenGetter = null;
}
