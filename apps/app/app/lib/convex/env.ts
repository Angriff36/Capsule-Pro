import { z } from "zod";

export const convexEnv = {
  url:
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    process.env.CONVEX_URL ??
    "http://127.0.0.1:3210",
};
