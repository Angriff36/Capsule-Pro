import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MicroTour } from "./micro-tour";

const steps = [
  {
    id: "step-1",
    title: "Welcome",
    description: "This is a lightweight micro-tour",
  },
  {
    id: "step-2",
    title: "Non-Blocking",
    description: "You can still interact with the page",
  },
];

describe("MicroTour", () => {
  it("renders active tour content", () => {
    render(<MicroTour isActive={true} steps={steps} tourId="test-tour" />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Welcome")).toBeTruthy();
    expect(screen.getByText("This is a lightweight micro-tour")).toBeTruthy();
  });

  it("does not render when inactive", () => {
    render(<MicroTour isActive={false} steps={steps} tourId="test-tour" />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("advances to next step", async () => {
    const user = userEvent.setup();

    render(<MicroTour isActive={true} steps={steps} tourId="test-tour" />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Non-Blocking")).toBeTruthy();
    expect(
      screen.getByText("You can still interact with the page")
    ).toBeTruthy();
  });

  it("calls onComplete on final step", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <MicroTour
        isActive={true}
        onComplete={onComplete}
        steps={steps}
        tourId="test-tour"
      />
    );

    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /got it/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
