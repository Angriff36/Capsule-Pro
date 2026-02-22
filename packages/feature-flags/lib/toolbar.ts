import { withVercelToolbar } from "@vercel/toolbar/plugins/next";
import { keys } from "../keys";

// Only enable the Vercel Toolbar plugin when running on Vercel (VERCEL=1).
// Locally the toolbar's companion server on port 25002 never starts, which
// causes the browser to spam ERR_CONNECTION_REFUSED on localhost:25002/events.
const isVercel = process.env.VERCEL === "1";

export const withToolbar = (config: object) =>
  isVercel && keys().FLAGS_SECRET ? withVercelToolbar()(config) : config;
