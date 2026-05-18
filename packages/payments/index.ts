import "server-only";
import Stripe from "stripe";
import { keys } from "./keys";

// Lazy singleton — initialized on first use to prevent build-time Stripe client init.
let _stripe: Stripe | null = null;
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      _stripe = new Stripe(keys().STRIPE_SECRET_KEY, {
        apiVersion: "2026-01-28.clover",
      });
    }
    return (_stripe as any)[prop];
  },
});

export type { Stripe } from "stripe";
