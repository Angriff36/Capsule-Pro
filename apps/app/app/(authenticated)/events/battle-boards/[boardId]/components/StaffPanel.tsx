import { Plus, GripVertical, Trash2, UserCircle } from 'lucide-react';
import type { BattleBoardFull, BattleBoardStaff } from '@/lib/battle-boards/types';

interface StaffPanelProps {
  board: BattleBoardFull;
  onChange: (board: BattleBoardFull) => void;
}

export function StaffPanel({ board, onChange }: StaffPanelProps) {
  function addStaff() {
    const newStaff: BattleBoardStaff = {
      id: crypto.randomUUID(),
      board_id: board.id,
      tenant_id: board.tenant_id,
      name: '',
      role: '',
      shift_start: '',
      shift_end: '',
      station: '',
      sort_order: board.staff.length,
    };
    onChange({ ...board, staff: [...board.staff, newStaff] });
  }

  function updateStaff(index: number, field: keyof BattleBoardStaff, value: string) {
    const updated = [...board.staff];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...board, staff: updated });
  }

  function removeStaff(index: number) {
    const updated = board.staff.filter((_, i) => i !== index);
    onChange({ ...board, staff: updated.map((s, i) => ({ ...s, sort_order: i })) });
  }

  const roleColors: Record<string, string> = {
    kitchen: 'bg-orange-50 border-orange-200',
    'front of house': 'bg-sky-50 border-sky-200',
    bar: 'bg-rose-50 border-rose-200',
    lead: 'bg-emerald-50 border-emerald-200',
    operations: 'bg-amber-50 border-amber-200',
  };

  function getCardColor(station: string): string {
    const lower = station.toLowerCase();
    for (const [key, cls] of Object.entries(roleColors)) {
      if (lower.includes(key)) return cls;
    }
    return 'bg-white border-slate-200';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Staff Assignments</h2>
          <p className="text-xs text-slate-500 mt-0.5">{board.staff.length} team member{board.staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={addStaff}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {board.staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <UserCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No staff assigned yet</p>
          <p className="text-xs text-slate-400 mt-1">Add team members or import from a CSV file</p>
        </div>
      ) : (
        <div className="space-y-2">
          {board.staff.map((person, idx) => (
            <div
              key={person.id}
              className={`rounded-xl border p-4 transition-all hover:shadow-sm ${getCardColor(person.station)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-300 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => updateStaff(idx, 'name', e.target.value)}
                      placeholder="Name"
                      className="w-full px-2.5 py-1.5 bg-white/80 border border-slate-200 rounded-md text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={person.role}
                      onChange={(e) => updateStaff(idx, 'role', e.target.value)}
                      placeholder="Role"
                      className="w-full px-2.5 py-1.5 bg-white/80 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={person.shift_start}
                      onChange={(e) => updateStaff(idx, 'shift_start', e.target.value)}
                      placeholder="In"
                      className="w-full px-2.5 py-1.5 bg-white/80 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                    />
                    <input
                      type="text"
                      value={person.shift_end}
                      onChange={(e) => updateStaff(idx, 'shift_end', e.target.value)}
                      placeholder="Out"
                      className="w-full px-2.5 py-1.5 bg-white/80 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={person.station}
                      onChange={(e) => updateStaff(idx, 'station', e.target.value)}
                      placeholder="Station"
                      className="w-full px-2.5 py-1.5 bg-white/80 border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-colors"
                    />
                    <button
                      onClick={() => removeStaff(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
