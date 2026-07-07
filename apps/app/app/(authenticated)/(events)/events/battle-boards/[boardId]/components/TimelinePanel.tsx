import { BookOpen, Clock, Plus, Star, Trash2 } from "lucide-react";
import {
  TASK_TEMPLATE_GROUPS,
  TASK_TEMPLATES,
} from "@/lib/battle-boards/task-templates";
import type {
  BattleBoardFull,
  BattleBoardTimeline,
} from "@/lib/battle-boards/types";

interface TimelinePanelProps {
  board: BattleBoardFull;
  onChange: (board: BattleBoardFull) => void;
}

export function TimelinePanel({ board, onChange }: TimelinePanelProps) {
  function addEntry() {
    const entry: BattleBoardTimeline = {
      id: crypto.randomUUID(),
      board_id: board.id,
      tenant_id: board.tenant_id,
      time: "",
      item: "",
      team: "",
      location: "",
      style: "",
      notes: "",
      highlighted: false,
      sort_order: board.timeline.length,
    };
    onChange({ ...board, timeline: [...board.timeline, entry] });
  }

  function updateEntry(
    index: number,
    field: keyof BattleBoardTimeline,
    value: string | boolean
  ) {
    const updated = [...board.timeline];
    const existing = updated[index];
    if (!existing) {
      return;
    }
    updated[index] = { ...existing, [field]: value };
    onChange({ ...board, timeline: updated });
  }

  function removeEntry(index: number) {
    const updated = board.timeline.filter((_, i) => i !== index);
    onChange({
      ...board,
      timeline: updated.map((t, i) => ({ ...t, sort_order: i })),
    });
  }

  function toggleHighlight(index: number) {
    const entry = board.timeline[index];
    if (!entry) {
      return;
    }
    updateEntry(index, "highlighted", !entry.highlighted);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">
            Event Timeline
          </h2>
          <p className="mt-0.5 text-slate-500 text-xs">
            {board.timeline.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50">
              <BookOpen className="h-3.5 w-3.5" />
              Templates
            </summary>
            <div className="absolute top-full right-0 z-10 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {TASK_TEMPLATE_GROUPS.map((group) => (
                <div key={group}>
                  <p className="border-slate-100 border-b bg-slate-50 px-3 py-1.5 font-semibold text-slate-500 text-xs">
                    {group}
                  </p>
                  {TASK_TEMPLATES.filter((t) => t.group === group).map((t) => (
                    <button
                      className="w-full border-slate-100 border-b px-3 py-2 text-left text-slate-700 text-sm last:border-0 hover:bg-slate-50"
                      key={t.label}
                      onClick={() => {
                        const entry: BattleBoardTimeline = {
                          id: crypto.randomUUID(),
                          board_id: board.id,
                          tenant_id: board.tenant_id,
                          time: "",
                          item: t.label,
                          team: t.defaultTeam,
                          location: t.defaultLocation,
                          style: t.defaultStyle,
                          notes: t.notes,
                          highlighted: false,
                          sort_order: board.timeline.length,
                        };
                        onChange({
                          ...board,
                          timeline: [...board.timeline, entry],
                        });
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50"
            onClick={addEntry}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {board.timeline.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Clock className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No timeline entries yet</p>
          <p className="mt-1 text-slate-400 text-xs">
            Add key moments or import from a PDF
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-4 bottom-4 left-[52px] hidden w-px bg-slate-200 sm:block" />
          <div className="space-y-2">
            {board.timeline.map((entry, idx) => (
              <div
                className={`rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${
                  entry.highlighted
                    ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200"
                    : "border-slate-200"
                }`}
                key={entry.id}
              >
                <div className="flex items-start gap-3">
                  <div className="w-[72px] flex-shrink-0">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-mono text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) => updateEntry(idx, "time", e.target.value)}
                      placeholder="Time"
                      type="text"
                      value={entry.time}
                    />
                  </div>
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <input
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        onChange={(e) =>
                          updateEntry(idx, "item", e.target.value)
                        }
                        placeholder="What happens..."
                        type="text"
                        value={entry.item}
                      />
                    </div>
                    <div>
                      <input
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        onChange={(e) =>
                          updateEntry(idx, "team", e.target.value)
                        }
                        placeholder="Team"
                        type="text"
                        value={entry.team}
                      />
                    </div>
                    <div>
                      <input
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        onChange={(e) =>
                          updateEntry(idx, "location", e.target.value)
                        }
                        placeholder="Location"
                        type="text"
                        value={entry.location}
                      />
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      className={`rounded p-1.5 transition-colors ${
                        entry.highlighted
                          ? "bg-amber-100 text-amber-500"
                          : "text-slate-300 hover:text-amber-400"
                      }`}
                      onClick={() => toggleHighlight(idx)}
                      title="Highlight key moment"
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        fill={entry.highlighted ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-400 transition-colors hover:text-red-500"
                      onClick={() => removeEntry(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {(entry.notes || entry.style) && (
                  <div className="mt-2 ml-[84px] flex gap-2">
                    <input
                      className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 text-xs transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) =>
                        updateEntry(idx, "notes", e.target.value)
                      }
                      placeholder="Notes..."
                      type="text"
                      value={entry.notes}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
