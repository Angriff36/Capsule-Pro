import { Layout, Plus, Trash2 } from "lucide-react";
import type {
  BattleBoardFull,
  BattleBoardLayout,
} from "@/lib/battle-boards/types";

interface LayoutsPanelProps {
  board: BattleBoardFull;
  onChange: (board: BattleBoardFull) => void;
}

export function LayoutsPanel({ board, onChange }: LayoutsPanelProps) {
  function addLayout() {
    const layout: BattleBoardLayout = {
      id: crypto.randomUUID(),
      board_id: board.id,
      tenant_id: board.tenant_id,
      type: "",
      instructions: "",
      sort_order: board.layouts.length,
    };
    onChange({ ...board, layouts: [...board.layouts, layout] });
  }

  function updateLayout(
    index: number,
    field: keyof BattleBoardLayout,
    value: string
  ) {
    const updated = [...board.layouts];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...board, layouts: updated });
  }

  function removeLayout(index: number) {
    const updated = board.layouts.filter((_, i) => i !== index);
    onChange({
      ...board,
      layouts: updated.map((l, i) => ({ ...l, sort_order: i })),
    });
  }

  const typeOptions = [
    "Buffet",
    "Bar",
    "Stage",
    "Seating",
    "Kitchen",
    "Service",
    "Parking",
    "Other",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">
            Layout & Setup
          </h2>
          <p className="mt-0.5 text-slate-500 text-xs">
            {board.layouts.length} section
            {board.layouts.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50"
          onClick={addLayout}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Section
        </button>
      </div>

      {board.layouts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Layout className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No layout sections yet</p>
          <p className="mt-1 text-slate-400 text-xs">
            Add setup instructions for different areas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {board.layouts.map((layout, idx) => (
            <div
              className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm"
              key={layout.id}
            >
              <div className="mb-3 flex items-center justify-between">
                <select
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-900 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  onChange={(e) => updateLayout(idx, "type", e.target.value)}
                  value={layout.type}
                >
                  <option value="">Select type...</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded p-1.5 text-slate-400 transition-colors hover:text-red-500"
                  onClick={() => removeLayout(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) =>
                  updateLayout(idx, "instructions", e.target.value)
                }
                placeholder="Setup instructions, equipment list, positioning notes..."
                rows={4}
                value={layout.instructions}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
