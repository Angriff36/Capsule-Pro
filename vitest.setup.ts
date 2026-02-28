import "@testing-library/jest-dom/vitest";

// Make React available globally for components that don't import it explicitly
// (Next.js with new JSX transform doesn't require React imports)
import React from "react";
import { vi } from "vitest";

global.React = React;

// Only set up browser mocks in jsdom environment (not in node environment)
// Tests that use @vitest-environment node won't have window defined
if (typeof window !== "undefined") {
  // Mock window.matchMedia for embla-carousel
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver for embla-carousel and Next.js
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: readonly number[] = [];

    disconnect() {
      // Intentional empty mock method
    }

    observe() {
      // Intentional empty mock method
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    unobserve() {
      // Intentional empty mock method
    }
  }

  global.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;

  // Mock ResizeObserver for embla-carousel
  class MockResizeObserver implements ResizeObserver {
    disconnect() {
      // Intentional empty mock method
    }

    observe() {
      // Intentional empty mock method
    }

    unobserve() {
      // Intentional empty mock method
    }
  }

  global.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
}
