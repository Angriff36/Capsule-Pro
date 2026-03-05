/**
 * @module RecipeOptimizer
 * @intent Handle API requests for AI-powered recipe optimization
 * @responsibility Generate cost reduction suggestions, nutritional analysis, and improvement recommendations
 * @domain Kitchen
 * @tags recipes, api, optimization, ai
 * @canonical true
 */

import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { RecipeOptimization } from "@repo/manifest-adapters/src/recipe-optimization-engine";
import {
  batchOptimizeRecipes,
  optimizeRecipe,
} from "@repo/manifest-adapters/src/recipe-optimization-engine";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

// AI model configuration
const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.7;

/**
 * Enhanced optimization suggestion with AI-generated insights
 */
interface EnhancedOptimization extends RecipeOptimization {
  aiInsights?: {
    summary: string;
    prioritizedActions: Array<{
      action: string;
      rationale: string;
      expectedOutcome: string;
      effort: "low" | "medium" | "high";
    }>;
    seasonalConsiderations?: string;
    dietaryAlternatives?: string[];
  };
}

/**
 * Generate AI insights for recipe optimization
 */
async function generateAIInsights(
  optimization: RecipeOptimization,
  tenantId: string
): Promise<EnhancedOptimization["aiInsights"]> {
  const systemPrompt = `You are an expert culinary consultant with deep knowledge of food costs, nutrition, and kitchen operations.

Your role is to analyze recipe optimization data and provide actionable, prioritized recommendations.

**Your insights should:**
1. PRIORITIZE by cost savings AND operational feasibility
2. CONSIDER impact on food quality and customer satisfaction
3. FACTOR in seasonal ingredient availability and pricing
4. SUGGEST dietary alternatives where applicable
5. PROVIDE clear rationale for each recommendation

**Response format (strict JSON):**
\`\`\`json
{
  "summary": "Brief 2-3 sentence summary of optimization opportunities (max 200 chars)",
  "prioritizedActions": [
    {
      "action": "Specific action to take (max 80 chars)",
      "rationale": "Why this matters (max 150 chars)",
      "expectedOutcome": "Expected result (max 100 chars)",
      "effort": "low|medium|high"
    }
  ],
  "seasonalConsiderations": "Notes on seasonal ingredients (optional, max 150 chars)",
  "dietaryAlternatives": ["Array of dietary adaptation suggestions"]
}
\`\`\`

**Constraints:**
- Return exactly 3-5 prioritized actions
- Focus on high-impact, low-effort changes first
- Never compromise food safety
- Consider practical kitchen constraints`;

  const userPrompt = `Analyze this recipe optimization and provide actionable recommendations:

**Recipe:** ${optimization.recipeName}
**Current Cost:** $${optimization.currentCost.toFixed(2)}
**Optimized Cost:** $${optimization.optimizedCost.toFixed(2)}
**Potential Savings:** ${optimization.totalPotentialSavingsPercentage.toFixed(1)}%

**Availability Score:** ${optimization.availabilityScore.toFixed(0)}/100
**Quality Score:** ${optimization.qualityScore.toFixed(0)}/100
**Health Score:** ${optimization.nutritionalAnalysis.healthScore.toFixed(0)}/100

**Cost Optimization Opportunities:**
${JSON.stringify(optimization.costOptimizations.slice(0, 5), null, 2)}

**Nutritional Analysis:**
- Calories per serving: ${optimization.nutritionalAnalysis.perServing.calories}
- Protein: ${optimization.nutritionalAnalysis.perServing.protein}g
- Carbs: ${optimization.nutritionalAnalysis.perServing.carbohydrates}g
- Fat: ${optimization.nutritionalAnalysis.perServing.fat}g
- Fiber: ${optimization.nutritionalAnalysis.perServing.fiber}g

**Nutritional Concerns:**
${
  optimization.nutritionalAnalysis.concerns.length > 0
    ? optimization.nutritionalAnalysis.concerns.join(", ")
    : "None"
}

**Nutritional Highlights:**
${
  optimization.nutritionalAnalysis.nutrientHighlights.length > 0
    ? optimization.nutritionalAnalysis.nutrientHighlights.join(", ")
    : "None"
}

Provide 3-5 prioritized actions with rationale.`;

  try {
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: TEMPERATURE,
    });

    const aiResponse = JSON.parse(result.text.trim());
    return {
      summary:
        aiResponse.summary ||
        "Optimization opportunities identified based on cost and nutritional analysis.",
      prioritizedActions: (aiResponse.prioritizedActions || []).slice(0, 5),
      seasonalConsiderations: aiResponse.seasonalConsiderations,
      dietaryAlternatives: aiResponse.dietaryAlternatives || [],
    };
  } catch (error) {
    console.error("AI insight generation failed:", error);

    // Fallback to rule-based insights
    return {
      summary: `${optimization.costOptimizations.length} optimization opportunity${
        optimization.costOptimizations.length === 1 ? "" : "ies"
      } identified with potential savings of ${optimization.totalPotentialSavingsPercentage.toFixed(1)}%.`,
      prioritizedActions: optimization.costOptimizations
        .slice(0, 3)
        .map((opt) => ({
          action: opt.title,
          rationale: opt.description,
          expectedOutcome: `Save $${opt.potentialSavings.toFixed(2)}`,
          effort:
            opt.priority === "high"
              ? "low"
              : ("medium" as "low" | "medium" | "high"),
        })),
    };
  }
}

/**
 * GET - Analyze recipe and return optimization suggestions
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    // Generate optimization analysis
    const optimization = await optimizeRecipe(database, tenantId, recipeId);

    // Generate AI insights
    const aiInsights = await generateAIInsights(optimization, tenantId);

    return NextResponse.json({
      ...optimization,
      aiInsights,
    } satisfies EnhancedOptimization);
  } catch (error) {
    console.error("[recipes/optimize] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to generate recipe optimization",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Batch optimize multiple recipes
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { recipeIds, includeAIInsights = true } = body as {
      recipeIds?: string[];
      includeAIInsights?: boolean;
    };

    if (!(recipeIds && Array.isArray(recipeIds)) || recipeIds.length === 0) {
      return NextResponse.json(
        { message: "recipeIds array is required" },
        { status: 400 }
      );
    }

    if (recipeIds.length > 20) {
      return NextResponse.json(
        { message: "Maximum 20 recipes per batch" },
        { status: 400 }
      );
    }

    // Batch optimize all recipes
    const optimizations = await batchOptimizeRecipes(
      database,
      tenantId,
      recipeIds
    );

    // Generate AI insights for each if requested
    let enhancedOptimizations: EnhancedOptimization[] = optimizations;

    if (includeAIInsights) {
      enhancedOptimizations = await Promise.all(
        optimizations.map(async (opt) => ({
          ...opt,
          aiInsights: await generateAIInsights(opt, tenantId),
        }))
      );
    }

    return NextResponse.json({
      optimizations: enhancedOptimizations,
      summary: `Analyzed ${enhancedOptimizations.length} recipe${
        enhancedOptimizations.length === 1 ? "" : "s"
      }`,
      totalPotentialSavings: enhancedOptimizations.reduce(
        (sum, opt) => sum + opt.totalPotentialSavings,
        0
      ),
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("[recipes/optimize] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to generate recipe optimizations",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
