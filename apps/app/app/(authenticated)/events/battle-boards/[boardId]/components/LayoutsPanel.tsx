import { Plus, Trash2, Layout } from 'lucide-react';
import type { BattleBoardFull, BattleBoardLayout } from '@/lib/battle-boards/types';

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
      type: '',
      instructions: '',
      sort_order: board.layouts.length,
    };
    onChange({ ...board, layouts: [...board.layouts, layout] });
  }

  function updateLayout(index: number, field: keyof BattleBoardLayout, value: string) {
    const updated = [...board.layouts];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...board, layouts: updated });
  }

  function removeLayout(index: number) {
    const updated = board.layouts.filter((_, i) => i !== index);
    onChange({ ...board, layouts: updated.map((l, i) => ({ ...l, sort_order: i })) });
  }

  const typeOptions = ['Buffet', 'Bar', 'Stage', 'Seating', 'Kitchen', 'Service', 'Parking', 'Other'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Layout & Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">{board.layouts.length} section{board.layouts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={addLayout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      </div>

      {board.layouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Layout className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No layout sections yet</p>
          <p className="text-xs text-slate-400 mt-1">Add setup instructions for different areas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {board.layouts.map((layout, idx) => (
            <div
              key={layout.id}
              className="bg-white rounded-xl border border-slate-200 p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <select
                  value={layout.type}
                  onChange={(e) => updateLayout(idx, 'type', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                >
                  <option value="">Select type...</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeLayout(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={layout.instructions}
                onChange={(e) => updateLayout(idx, 'instructions', e.target.value)}
                placeholder="Setup instructions, equipment list, positioning notes..."
                rows={4}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
