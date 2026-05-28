import { Plus, Trash2, Star, Clock, BookOpen } from 'lucide-react';
import type { BattleBoardFull, BattleBoardTimeline } from '@/lib/battle-boards/types';
import { TASK_TEMPLATES, TASK_TEMPLATE_GROUPS } from '@/lib/battle-boards/task-templates';

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
      time: '',
      item: '',
      team: '',
      location: '',
      style: '',
      notes: '',
      highlighted: false,
      sort_order: board.timeline.length,
    };
    onChange({ ...board, timeline: [...board.timeline, entry] });
  }

  function updateEntry(index: number, field: keyof BattleBoardTimeline, value: string | boolean) {
    const updated = [...board.timeline];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...board, timeline: updated });
  }

  function removeEntry(index: number) {
    const updated = board.timeline.filter((_, i) => i !== index);
    onChange({ ...board, timeline: updated.map((t, i) => ({ ...t, sort_order: i })) });
  }

  function toggleHighlight(index: number) {
    updateEntry(index, 'highlighted', !board.timeline[index].highlighted);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Event Timeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">{board.timeline.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer list-none">
              <BookOpen className="w-3.5 h-3.5" />
              Templates
            </summary>
            <div className="absolute right-0 top-full mt-1 z-10 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {TASK_TEMPLATE_GROUPS.map((group) => (
                <div key={group}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">{group}</p>
                  {TASK_TEMPLATES.filter((t) => t.group === group).map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        const entry: BattleBoardTimeline = {
                          id: crypto.randomUUID(),
                          board_id: board.id,
                          tenant_id: board.tenant_id,
                          time: '',
                          item: t.label,
                          team: t.defaultTeam,
                          location: t.defaultLocation,
                          style: t.defaultStyle,
                          notes: t.notes,
                          highlighted: false,
                          sort_order: board.timeline.length,
                        };
                        onChange({ ...board, timeline: [...board.timeline, entry] });
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          <button
            onClick={addEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {board.timeline.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No timeline entries yet</p>
          <p className="text-xs text-slate-400 mt-1">Add key moments or import from a PDF</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[52px] top-4 bottom-4 w-px bg-slate-200 hidden sm:block" />
          <div className="space-y-2">
            {board.timeline.map((entry, idx) => (
              <div
                key={entry.id}
                className={`bg-white rounded-xl border p-4 transition-all hover:shadow-sm ${
                  entry.highlighted ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-[72px]">
                    <input
                      type="text"
                      value={entry.time}
                      onChange={(e) => updateEntry(idx, 'time', e.target.value)}
                      placeholder="Time"
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 text-center transition-colors"
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={entry.item}
                        onChange={(e) => updateEntry(idx, 'item', e.target.value)}
                        placeholder="What happens..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={entry.team}
                        onChange={(e) => updateEntry(idx, 'team', e.target.value)}
                        placeholder="Team"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={entry.location}
                        onChange={(e) => updateEntry(idx, 'location', e.target.value)}
                        placeholder="Location"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleHighlight(idx)}
                      className={`p-1.5 rounded transition-colors ${
                        entry.highlighted
                          ? 'text-amber-500 bg-amber-100'
                          : 'text-slate-300 hover:text-amber-400'
                      }`}
                      title="Highlight key moment"
                    >
                      <Star className="w-3.5 h-3.5" fill={entry.highlighted ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => removeEntry(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {(entry.notes || entry.style) && (
                  <div className="mt-2 ml-[84px] flex gap-2">
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) => updateEntry(idx, 'notes', e.target.value)}
                      placeholder="Notes..."
                      className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
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
