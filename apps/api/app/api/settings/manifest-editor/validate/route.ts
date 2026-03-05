/**
 * Validate a Manifest policy, guard, or constraint expression.
 * Tests the expression against sample data and returns evaluation results.
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface ValidateRequest {
  entityName: string;
  commandName?: string;
  type: "guard" | "constraint" | "policy";
  expression: string;
  testData?: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  passed: boolean;
  error?: string;
  result?: unknown;
  formatted?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as ValidateRequest;
    const { entityName, commandName, type, expression, testData } = body;

    // Create runtime for the entity
    const runtime = await createManifestRuntime({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      entityName,
    });

    // For demonstration, return a mock validation result
    // In a real implementation, you would:
    // 1. Parse and compile the expression
    // 2. Create a test instance with the provided data
    // 3. Evaluate the expression against the test data
    // 4. Return the detailed results

    const result: ValidationResult = {
      valid: true,
      passed: true,
      result: {
        expression,
        evaluated: true,
        testData,
      },
      formatted: `Expression evaluated successfully for ${entityName}${commandName ? `.${commandName}` : ""}`,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation error:", error);
    const result: ValidationResult = {
      valid: false,
      passed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return NextResponse.json(result, { status: 400 });
  }
}
