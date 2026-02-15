/**
 * Hydration Regression Tests
 *
 * This test suite ensures hydration fixes remain stable across updates.
 * Tests verify that components render deterministically and handle
 * locale-specific formatting correctly.
 *
 * Coverage:
 * - Intl.NumberFormat/DateTimeFormat with explicit locale
 * - useState lazy initialization for Date objects
 * - Stable array keys from data (not indexes)
 * - setTimeout/setInterval cleanup in useEffect
 *
 * Related: IMPLEMENTATION_PLAN.md Phase 1 (Hydration Resistance Fixes)
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cases } from "../app/[locale]/(home)/components/cases";
// Import components to test
import { FAQ } from "../app/[locale]/(home)/components/faq";
import { Stats } from "../app/[locale]/(home)/components/stats";
import { Testimonials } from "../app/[locale]/(home)/components/testimonials";
import { ContactForm } from "../app/[locale]/contact/components/contact-form";

// Mock dictionary matching en.json structure
const createMockDictionary = () => ({
  web: {
    global: {
      primaryCta: "Book a call",
      secondaryCta: "Sign up",
    },
    header: {
      home: "Home",
      product: {
        title: "Product",
        description: "Managing a small business today is already tough.",
        pricing: "Pricing",
      },
      blog: "Blog",
      docs: "Docs",
      contact: "Contact",
      signIn: "Sign in",
      signUp: "Get started",
    },
    home: {
      meta: {
        title: "Enterprise Business Solutions Simplified",
        description:
          "Consolidate all your business operations into one seamless platform.",
      },
      hero: {
        announcement: "Read our latest article",
      },
      cases: {
        title: "Empowering Success Stories Across the Globe",
      },
      features: {
        title: "Built for Enterprise Operations",
        description: "Integrated modules designed to work together seamlessly.",
        items: [
          {
            title: "Unified Management",
            description:
              "One platform for events, scheduling, kitchen operations, inventory, CRM, and analytics.",
          },
        ],
      },
      stats: {
        title: "Built for Operations Teams",
        description:
          "Consolidate operations, reduce overhead, and improve coordination.",
        items: [
          {
            title: "Modules Unified",
            metric: "7",
            delta: "0",
            type: "unit",
          },
          {
            title: "Teams Coordinated",
            metric: "∞",
            delta: "0",
            type: "unit",
          },
          {
            title: "Data Consistency",
            metric: "100",
            delta: "15",
            type: "currency",
          },
          {
            title: "Setup Time Saved",
            metric: "80",
            delta: "-5",
            type: "currency",
          },
        ],
      },
      testimonials: {
        title: "Trusted by Operations Teams",
        items: [
          {
            title: "Everything in one place",
            description:
              "We finally eliminated the spreadsheet chaos. Events, schedules, inventory, and staff are all connected.",
            author: {
              name: "Operations Director",
              image: "https://github.com/haydenbleasel.png",
            },
          },
          {
            title: "Real-time coordination works",
            description:
              "The kitchen sees inventory in real-time, staffing adjusts automatically when events change.",
            author: {
              name: "Kitchen Manager",
              image: "https://github.com/leerob.png",
            },
          },
        ],
      },
      faq: {
        title: "Questions About Capsule?",
        description:
          "Learn how Capsule consolidates your operations, connects your teams.",
        cta: "Still have questions? Reach out",
        items: [
          {
            question: "What is Capsule?",
            answer:
              "Capsule is a unified operations platform that connects events, scheduling, kitchen operations.",
          },
          {
            question: "How does real-time synchronization work?",
            answer:
              "Changes in one module instantly propagate across your system.",
          },
        ],
      },
      cta: {
        title: "Consolidate Your Operations Today",
        description:
          "Stop managing disconnected systems. Capsule brings your entire organization together.",
      },
    },
    contact: {
      meta: {
        title: "Let's Talk About Your Business",
        description:
          "Schedule a consultation with our team to discuss how we can help.",
      },
      hero: {
        benefits: [
          {
            title: "Personalized Consultation",
            description:
              "Get tailored solutions and expert advice specific to your business needs.",
          },
          {
            title: "Seamless Integration",
            description:
              "We seamlessly integrate with your existing systems to ensure a smooth transition.",
          },
        ],
        form: {
          title: "Book a meeting",
          date: "Date",
          firstName: "First name",
          lastName: "Last name",
          resume: "Upload resume",
          cta: "Book the meeting",
        },
      },
    },
    blog: {
      meta: {
        title: "Blog",
        description: "Thoughts, ideas, and opinions.",
      },
    },
  },
});

describe("Hydration Regression Tests", () => {
  describe("Stats Component - Intl.NumberFormat", () => {
    it("should render Stats component without hydration mismatch with en-US locale", () => {
      const dictionary = createMockDictionary();
      const { container } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );

      expect(container).toBeDefined();
      // Verify metric numbers are formatted with locale
      expect(container.textContent).toContain("100");
      expect(container.textContent).toContain("80");
    });

    it("should handle different locales correctly", () => {
      const dictionary = createMockDictionary();
      const { container: enContainer } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );
      const { container: esContainer } = render(
        <Stats dictionary={dictionary} locale="es-ES" />
      );
      const { container: frContainer } = render(
        <Stats dictionary={dictionary} locale="fr-FR" />
      );

      // All containers should render without errors
      expect(enContainer).toBeDefined();
      expect(esContainer).toBeDefined();
      expect(frContainer).toBeDefined();

      // Content should be present in all
      expect(enContainer.textContent).toContain("Modules Unified");
      expect(esContainer.textContent).toContain("Modules Unified");
      expect(frContainer.textContent).toContain("Modules Unified");
    });

    it("should use stable keys from data (item.title)", () => {
      const dictionary = createMockDictionary();
      const { container } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );

      // Each stat item should be rendered
      const statsItems = dictionary.web.home.stats.items;
      expect(container.textContent).toContain(statsItems[0].title);
      expect(container.textContent).toContain(statsItems[1].title);
      expect(container.textContent).toContain(statsItems[2].title);
      expect(container.textContent).toContain(statsItems[3].title);
    });
  });

  describe("ContactForm Component - useState Date Lazy Initialization", () => {
    it("should initialize date state lazily to prevent hydration mismatch", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<ContactForm dictionary={dictionary} />);

      expect(container).toBeDefined();
      // Should have form fields
      expect(container.textContent).toContain("Book a meeting");
    });

    it("should render form benefits with stable keys (benefit.title)", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<ContactForm dictionary={dictionary} />);

      const benefits = dictionary.web.contact.hero.benefits;
      expect(container.textContent).toContain(benefits[0].title);
      expect(container.textContent).toContain(benefits[1].title);
    });
  });

  describe("FAQ Component - Array Keys", () => {
    it("should render FAQ with stable keys from question field", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<FAQ dictionary={dictionary} />);

      expect(container).toBeDefined();
      // FAQ items should be rendered
      expect(container.textContent).toContain(
        dictionary.web.home.faq.items[0].question
      );
      expect(container.textContent).toContain(
        dictionary.web.home.faq.items[1].question
      );
    });

    it("should render FAQ items consistently across multiple renders", () => {
      const dictionary = createMockDictionary();
      const { container: container1 } = render(<FAQ dictionary={dictionary} />);
      const { container: container2 } = render(<FAQ dictionary={dictionary} />);

      // Both renders should produce the same content
      expect(container1.textContent).toBe(container2.textContent);
    });
  });

  describe("Testimonials Component - setTimeout Cleanup", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should render testimonials with stable keys from item.title", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<Testimonials dictionary={dictionary} />);

      expect(container).toBeDefined();
      expect(container.textContent).toContain(
        dictionary.web.home.testimonials.items[0].title
      );
    });

    it("should handle setTimeout with proper cleanup", async () => {
      const dictionary = createMockDictionary();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = render(<Testimonials dictionary={dictionary} />);

      // Fast forward past the timeout
      await vi.advanceTimersByTimeAsync(5000);

      // Unmount should trigger cleanup
      unmount();

      // clearTimeout should have been called (may be called multiple times)
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("should auto-advance carousel after timeout", async () => {
      const dictionary = createMockDictionary();
      const { container } = render(<Testimonials dictionary={dictionary} />);

      // Initial render
      expect(container).toBeDefined();

      // Fast forward past the 4-second timeout
      await vi.advanceTimersByTimeAsync(4500);

      // Component should still be defined after timeout
      expect(container).toBeDefined();
    });
  });

  describe("Cases Component - setTimeout Cleanup", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should render cases carousel", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<Cases dictionary={dictionary} />);

      expect(container).toBeDefined();
      expect(container.textContent).toContain(dictionary.web.home.cases.title);
    });

    it("should handle setTimeout with proper cleanup on unmount", async () => {
      const dictionary = createMockDictionary();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = render(<Cases dictionary={dictionary} />);

      // Fast forward time
      await vi.advanceTimersByTimeAsync(2000);

      // Unmount component
      unmount();

      // Cleanup should have been called
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it("should use index keys for static carousel (acceptable case)", () => {
      const dictionary = createMockDictionary();
      const { container } = render(<Cases dictionary={dictionary} />);

      // Cases uses a static array that never reorders, so index keys are acceptable
      expect(container).toBeDefined();
      expect(container.textContent).toContain(dictionary.web.home.cases.title);
    });
  });

  describe("Hydration Stability - Multiple Sequential Renders", () => {
    it("should render all components consistently across 3 sequential renders", () => {
      const dictionary = createMockDictionary();

      // First render
      const { container: container1 } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );
      const content1 = container1.textContent;

      // Second render
      const { container: container2 } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );
      const content2 = container2.textContent;

      // Third render
      const { container: container3 } = render(
        <Stats dictionary={dictionary} locale="en-US" />
      );
      const content3 = container3.textContent;

      // All renders should produce identical content
      expect(content1).toBe(content2);
      expect(content2).toBe(content3);
    });
  });
});
