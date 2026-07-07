import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PayrollPage from "../../app/(authenticated)/(accounting)/payroll/page";

describe("Payroll landing page", () => {
  it("renders actionable overview cards with destination links", () => {
    render(<PayrollPage />);

    expect(
      screen.getByRole("link", { name: /view timecards/i }).getAttribute("href")
    ).toBe("/payroll/timecards");
    expect(
      screen
        .getByRole("link", { name: /review approvals/i })
        .getAttribute("href")
    ).toBe("/payroll/approvals");
    expect(
      screen.getByRole("link", { name: /open payouts/i }).getAttribute("href")
    ).toBe("/payroll/payouts");
  });
});
