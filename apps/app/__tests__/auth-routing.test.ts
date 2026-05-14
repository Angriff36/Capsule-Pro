// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

const clerkState = vi.hoisted(() => ({
  userId: null as string | null,
  authMock: vi.fn(),
  protectMock: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  createRouteMatcher:
    (patterns: string[]) =>
    (req: { url: string }) => {
      const pathname = new URL(req.url).pathname;
      return patterns.some((pattern) => {
        if (pattern.endsWith("(.*)")) {
          const prefix = pattern.slice(0, -4);
          return pathname === prefix || pathname.startsWith(`${prefix}/`);
        }
        return pathname === pattern;
      });
    },
  clerkMiddleware:
    (
      handler: (
        auth: (() => Promise<{ userId: string | null }>) & {
          protect: () => Promise<void>;
        },
        req: { url: string }
      ) => Promise<Response | void>
    ) => {
      return async (req: { url: string }) => {
        const auth = clerkState.authMock as unknown as (() => Promise<{
          userId: string | null;
        }>) & { protect: () => Promise<void> };
        auth.protect = clerkState.protectMock;
        return handler(auth, req);
      };
    },
}));

function request(pathname: string) {
  return {
    url: `http://127.0.0.1:2221${pathname}`,
    headers: new Headers(),
  };
}

async function runMiddleware(pathname: string) {
  const { default: middleware } = await import("../proxy");
  return (middleware as unknown as (req: { url: string }) => Promise<Response | void>)(
    request(pathname)
  );
}

describe("app auth routing", () => {
  beforeEach(() => {
    clerkState.userId = null;
    clerkState.authMock.mockReset();
    clerkState.authMock.mockImplementation(() =>
      Promise.resolve({ userId: clerkState.userId })
    );
    clerkState.protectMock.mockReset();
    clerkState.protectMock.mockResolvedValue(undefined);
  });

  test("/sign-in remains public", async () => {
    const response = await runMiddleware("/sign-in");

    expect(response).toBeUndefined();
    expect(clerkState.authMock).not.toHaveBeenCalled();
    expect(clerkState.protectMock).not.toHaveBeenCalled();
  });

  test("/sign-up remains public", async () => {
    const response = await runMiddleware("/sign-up");

    expect(response).toBeUndefined();
    expect(clerkState.authMock).not.toHaveBeenCalled();
    expect(clerkState.protectMock).not.toHaveBeenCalled();
  });

  test("/calendar requires auth", async () => {
    const response = (await runMiddleware("/calendar")) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
    expect(response.headers.get("location")).toContain("redirect_url=");
  });

  test("arbitrary new top-level app routes require auth", async () => {
    const response = (await runMiddleware("/commander-test-auth-probe")) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
    expect(response.headers.get("location")).toContain("commander-test-auth-probe");
  });

  test("unauthenticated API routes return JSON 401 instead of redirecting", async () => {
    const response = (await runMiddleware("/api/search")) as Response;

    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(401);
    expect(response?.headers.get("content-type")).toBe("application/json");
    await expect(response?.json()).resolves.toEqual({ message: "Unauthorized" });
    expect(clerkState.protectMock).not.toHaveBeenCalled();
  });

  test("matcher includes APIs and app pages but excludes _next/static assets", async () => {
    const { config } = await import("../middleware");
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/api/search")).toBe(true);
    expect(matcher.test("/calendar")).toBe(true);
    expect(matcher.test("/commander-test-auth-probe")).toBe(true);
    expect(matcher.test("/_next/static/chunks/app.js")).toBe(false);
  });
});

