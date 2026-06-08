"use client";

import { apiFetch } from "@/app/lib/api";
import { listCrmScoringRules } from "@/app/lib/manifest-client.generated";
import {
  type ScoringDistribution,
  type ScoringRule,
  ScoringRulesClient,
} from "./components/scoring-rules-client";

async function fetchRules(): Promise<ScoringRule[]> {
  const result = await listCrmScoringRules();
  // Map generated camelCase fields to snake_case expected by the UI
  return result.data.map((r) => ({
    id: r.id,
    rule_name: r.ruleName ?? "",
    field: r.field ?? "",
    condition: r.condition ?? "",
    value: r.value ?? "",
    points: r.points ?? 0,
    is_active: r.isActive ?? false,
    priority: r.priority ?? 0,
    created_at: r.createdAt ? new Date(r.createdAt) : new Date(),
    updated_at: r.updatedAt ? new Date(r.updatedAt) : new Date(),
  }));
}

async function fetchDistribution(): Promise<ScoringDistribution> {
  // NOTE: No generated function for /api/crm/scoring/distribution — custom aggregate endpoint.
  const res = await apiFetch("/api/crm/scoring/distribution");
  if (!res.ok) return { hot: 0, warm: 0, cold: 0 };
  const json = await res.json();
  return json.data ?? { hot: 0, warm: 0, cold: 0 };
}

export default function ScoringPage() {
  return (
    <ScoringRulesClient
      fetchDistribution={fetchDistribution}
      fetchRules={fetchRules}
    />
  );
}
