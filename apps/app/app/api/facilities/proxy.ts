import type { NextRequest } from "next/server";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:2223";
const TRAILING_SLASH_RE = /\/$/;

const getApiBaseUrl = () =>
  (process.env.NODE_ENV !== "production" && !process.env.VERCEL
    ? DEFAULT_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_URL ||
      process.env.VERCEL_API_URL ||
      DEFAULT_API_BASE_URL
  ).replace(TRAILING_SLASH_RE, "");

const buildTargetUrl = (request: NextRequest, path: string) => {
  const requestUrl = new URL(request.url);
  const target = new URL(`${getApiBaseUrl()}/api/facilities/${path}`);
  target.search = requestUrl.search;
  return target;
};

const getForwardedResponseHeaders = (headers: Headers) => {
  const forwarded = new Headers(headers);
  for (const name of forwarded.keys()) {
    if (name.startsWith("x-middleware-")) {
      forwarded.delete(name);
    }
  }
  return forwarded;
};

export const forwardFacilitiesRequest = async (
  request: NextRequest,
  path: string
) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const response = await fetch(buildTargetUrl(request, path), {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text(),
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: getForwardedResponseHeaders(response.headers),
  });
};
