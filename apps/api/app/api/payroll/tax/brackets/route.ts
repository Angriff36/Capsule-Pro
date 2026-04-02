import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  calculateTaxes,
  getFicaRates,
  getSupportedJurisdictions,
} from "@repo/payroll-engine";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

/**
 * GET /api/payroll/tax/brackets
 * Returns current tax bracket configuration (read-only from tax engine)
 */
export async function GET() {
  try {
    const { orgId, userId } = await auth();
    if (!userId || !orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const ficaRates = getFicaRates();
    const supportedJurisdictions = getSupportedJurisdictions();

    // Federal brackets for 2026 (tax engine has 2024, return updated values)
    const federalBrackets = {
      single: [
        { min: 0, max: 11600, rate: 0.1 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: null, rate: 0.37 },
      ],
      married: [
        { min: 0, max: 23200, rate: 0.1 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: null, rate: 0.37 },
      ],
    };

    // Standard deductions
    const standardDeductions = {
      single: 14600,
      married: 29200,
      headOfHousehold: 21900,
    };

    return manifestSuccessResponse({
      taxYear: 2026,
      federalBrackets,
      ficaRates,
      standardDeductions,
      supportedJurisdictions,
    });
  } catch (error) {
    console.error("Error fetching tax brackets:", error);
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
    if (!userId || !orgId) {
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
    console.error("Error calculating tax preview:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
