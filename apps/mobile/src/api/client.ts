// API Client for native mobile app
// Handles authentication, base URL, and error handling

import { Platform } from "react-native";

const DEFAULT_API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:2223" : "http://localhost:2223";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

interface FetchOptions extends Omit<RequestInit, "body"> {
  token?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, body, ...fetchOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message ?? `HTTP error ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export { API_BASE_URL };
