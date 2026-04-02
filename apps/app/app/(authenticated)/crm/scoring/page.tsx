"use client";

import { ScoringRulesClient, type ScoringDistribution } from "./components/scoring-rules-client";

async function fetchRules() {
  const res = await fetch("/api/crm/scoring");
  if (!res.ok) throw new Error("Failed to fetch rules");
  const json = await res.json();
  return json.data ?? [];
}

async function fetchDistribution(): Promise<ScoringDistribution> {
  const res = await fetch("/api/crm/scoring/distribution");
  if (!res.ok) return { hot: 0, warm: 0, cold: 0 };
  const json = await res.json();
  return json.data ?? { hot: 0, warm: 0, cold: 0 };
}

export default function ScoringPage() {
  return (
    <ScoringRulesClient
      fetchRules={fetchRules}
      fetchDistribution={fetchDistribution}
    />
  );
}
