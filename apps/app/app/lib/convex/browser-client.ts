"use client";

import { ConvexReactClient } from "convex/react";
import { convexEnv } from "./env";

let browserClient: ConvexReactClient | null = null;

export function getConvexBrowserClient(): ConvexReactClient {
  if (!browserClient) {
    browserClient = new ConvexReactClient(convexEnv.url);
  }
  return browserClient;
}
