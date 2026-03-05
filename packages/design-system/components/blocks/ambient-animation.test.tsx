/**
 * Ambient Animation Test
 *
 * Unit tests for the ambient animation component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmbientAnimation } from "./ambient-animation";

describe("AmbientAnimation", () => {
  it("renders children correctly", () => {
    render(
      <AmbientAnimation isVisible={true}>
        <div data-testid="child">Test Content</div>
      </AmbientAnimation>
    );

    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByText("Test Content")).toBeTruthy();
  });

  it("applies animation variant correctly", () => {
    const { container } = render(
      <AmbientAnimation isVisible={true} variant="particles">
        <div>Content</div>
      </AmbientAnimation>
    );

    // Check that the animation layer exists
    const animationLayer = container.querySelector(".pointer-events-none");
    expect(animationLayer).toBeTruthy();
  });

  it("hides animation when isVisible is false", () => {
    const { container } = render(
      <AmbientAnimation isVisible={false}>
        <div data-testid="child">Content</div>
      </AmbientAnimation>
    );

    // Children should still be visible
    expect(screen.getByTestId("child")).toBeTruthy();

    // Animation should be hidden (opacity-0 class)
    const animationLayer = container.querySelector(".opacity-0");
    expect(animationLayer).toBeTruthy();
  });

  it("renders different variants", () => {
    const variants = ["particles", "waves", "pulse"] as const;

    variants.forEach((variant) => {
      const { container, unmount } = render(
        <AmbientAnimation isVisible={true} variant={variant}>
          <div>Content</div>
        </AmbientAnimation>
      );

      // Check that the animation container exists
      const animationLayer = container.querySelector(".pointer-events-none");
      expect(animationLayer).toBeTruthy();

      unmount();
    });
  });

  it("applies intensity correctly", () => {
    const { container } = render(
      <AmbientAnimation intensity={0.8} isVisible={true}>
        <div>Content</div>
      </AmbientAnimation>
    );

    // The component should render without errors
    expect(container.firstChild).toBeTruthy();
  });
});
