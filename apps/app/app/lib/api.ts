const DEFAULT_API_BASE_URL = "http://127.0.0.1:2223";

const normalizeBaseUrl = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  return value.replace(/\/$/, "");
};

const resolvedApiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export const getApiBaseUrl = (): string => {
  // On the client, we MUST return an empty string to use the Next.js rewrite proxy.
  // This avoids CORS issues and ensures session cookies are shared correctly.
  if (typeof window !== "undefined") {
    return "";
  }

  if (resolvedApiBaseUrl) {
    return resolvedApiBaseUrl;
  }

  return DEFAULT_API_BASE_URL;
};

export const apiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}/${path}`;
};

export const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(apiUrl(path), {
    credentials: "include",
    ...init,
  });
