import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import { keys } from "../keys";

// Only enable the Vercel Toolbar plugin in real Vercel production builds.
// When local dev inherits VERCEL=1, the companion server on port 25002 is
// absent and browsers may log failed /events requests (including DNS/connection errors).
const isVercel =
  process.env.VERCEL === "1" && process.env.NODE_ENV === "production";

export const withToolbar = (config: object) =>
  isVercel && keys().FLAGS_SECRET ? withVercelToolbar()(config) : config;
