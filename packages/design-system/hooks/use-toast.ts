"use client";

import { toast as sonnerToast } from "sonner";

type Toast = typeof sonnerToast;

export function useToast() {
  return { toast: sonnerToast } as { toast: Toast };
}
