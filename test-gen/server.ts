// Generated Server Code - Express/Hono compatible routes
// Copy this to your server file

import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors());

export default app;
