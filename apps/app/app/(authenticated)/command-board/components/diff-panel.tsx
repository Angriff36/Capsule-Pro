'use client';

import { useEffect, useState } from 'react';

type DiffData = {
  log: string;
  diff: string;
  fetchedAt: string;
};

export function DiffPanel() {
  const [data, setData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDiff() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/command-board/diff');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as DiffData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch diff');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDiff();
    const interval = setInterval(() => void fetchDiff(), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 font-mono text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">Repo Diff</span>
        <button
          onClick={() => void fetchDiff()}
          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
          disabled={loading}
        >
          {loading ? 'refreshing…' : 'refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-destructive text-xs">{error}</div>
      )}

      {data && (
        <>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Recent commits</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted px-3 py-2 text-xs leading-relaxed">
              {data.log || '(no commits)'}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Uncommitted changes</div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted px-3 py-2 text-xs leading-relaxed">
              {data.diff || '(working tree clean)'}
            </pre>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            fetched {new Date(data.fetchedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}
