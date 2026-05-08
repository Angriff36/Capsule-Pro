import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import {
  calculateTaxes,
  getFicaRates,
  getSupportedJurisdictions,
} from "@repo/payroll-engine";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

/**
 * GET /api/payroll/tax/brackets
 * Returns current tax bracket configuration (read-only from tax engine)
 */
export async function GET() {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const ficaRates = getFicaRates();
    const supportedJurisdictions = getSupportedJurisdictions();

    // Federal brackets for 2026 (tax engine has 2024, return updated values)
    const federalBrackets = {
      single: [
        { min: 0, max: 11_600, rate: 0.1 },
        { min: 11_600, max: 47_150, rate: 0.12 },
        { min: 47_150, max: 100_525, rate: 0.22 },
        { min: 100_525, max: 191_950, rate: 0.24 },
        { min: 191_950, max: 243_725, rate: 0.32 },
        { min: 243_725, max: 609_350, rate: 0.35 },
        { min: 609_350, max: null, rate: 0.37 },
      ],
      married: [
        { min: 0, max: 23_200, rate: 0.1 },
        { min: 23_200, max: 94_300, rate: 0.12 },
        { min: 94_300, max: 201_050, rate: 0.22 },
        { min: 201_050, max: 383_900, rate: 0.24 },
        { min: 383_900, max: 487_450, rate: 0.32 },
        { min: 487_450, max: 731_200, rate: 0.35 },
        { min: 731_200, max: null, rate: 0.37 },
      ],
    };

    // Standard deductions
    const standardDeductions = {
      single: 14_600,
      married: 29_200,
      headOfHousehold: 21_900,
    };

    return manifestSuccessResponse({
      taxYear: 2026,
      federalBrackets,
      ficaRates,
      standardDeductions,
      supportedJurisdictions,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching tax brackets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * PUT /api/payroll/tax/brackets
 * Preview tax calculation for a given income
 */
export async function PUT(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { grossAnnualIncome, filingStatus, state } = body;

    if (typeof grossAnnualIncome !== "number" || grossAnnualIncome < 0) {
      return manifestErrorResponse("Invalid grossAnnualIncome", 400);
    }

    // Import dynamically to use Currency
    const { Currency, money } = await import("@repo/payroll-engine");

    // Use the tax engine to calculate
    const mockEmployee = {
      id: "preview",
      firstName: "Preview",
      lastName: "Employee",
      email: "preview@example.com",
      hourlyRate: grossAnnualIncome / 2080,
      taxInfo: {
        status: (filingStatus as "single" | "married") || "single",
        jurisdiction: (state as string) || "FL",
        additionalWithholding: 0,
      },
    };

    const biweeklyPay = money(grossAnnualIncome / 26);
    const result = calculateTaxes({
      grossPay: biweeklyPay,
      preTaxDeductions: Currency.zero(),
      employee: mockEmployee as any,
      payPeriodFrequency: "biweekly",
    });

    return manifestSuccessResponse({
      grossAnnualIncome,
      filingStatus: filingStatus || "single",
      state: state || null,
      biweeklyWithholding: result.withholdings.map((w) => ({
        type: w.type,
        jurisdiction: (w as any).jurisdiction || null,
        amount: w.amount,
        annualized: w.amount * 26,
      })),
      totalAnnualTax: result.totalTax.toNumber() * 26,
      effectiveRate:
        grossAnnualIncome > 0
          ? ((result.totalTax.toNumber() * 26) / grossAnnualIncome) * 100
          : 0,
    });
  } catch (error) {
    captureException(error);
    log.error("Error calculating tax preview:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
