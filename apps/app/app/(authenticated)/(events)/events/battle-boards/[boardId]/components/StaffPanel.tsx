import { GripVertical, Plus, Trash2, UserCircle } from "lucide-react";
import type {
  BattleBoardFull,
  BattleBoardStaff,
} from "@/lib/battle-boards/types";

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
      name: "",
      role: "",
      shift_start: "",
      shift_end: "",
      station: "",
      sort_order: board.staff.length,
    };
    onChange({ ...board, staff: [...board.staff, newStaff] });
  }

  function updateStaff(
    index: number,
    field: keyof BattleBoardStaff,
    value: string
  ) {
    const updated = [...board.staff];
    const existing = updated[index];
    if (!existing) {
      return;
    }
    updated[index] = { ...existing, [field]: value };
    onChange({ ...board, staff: updated });
  }

  function removeStaff(index: number) {
    const updated = board.staff.filter((_, i) => i !== index);
    onChange({
      ...board,
      staff: updated.map((s, i) => ({ ...s, sort_order: i })),
    });
  }

  const roleColors: Record<string, string> = {
    kitchen: "bg-orange-50 border-orange-200",
    "front of house": "bg-sky-50 border-sky-200",
    bar: "bg-rose-50 border-rose-200",
    lead: "bg-emerald-50 border-emerald-200",
    operations: "bg-amber-50 border-amber-200",
  };

  function getCardColor(station: string): string {
    const lower = station.toLowerCase();
    for (const [key, cls] of Object.entries(roleColors)) {
      if (lower.includes(key)) {
        return cls;
      }
    }
    return "bg-white border-slate-200";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">
            Staff Assignments
          </h2>
          <p className="mt-0.5 text-slate-500 text-xs">
            {board.staff.length} team member
            {board.staff.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50"
          onClick={addStaff}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {board.staff.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <UserCircle className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No staff assigned yet</p>
          <p className="mt-1 text-slate-400 text-xs">
            Add team members or import from a CSV file
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {board.staff.map((person, idx) => (
            <div
              className={`rounded-xl border p-4 transition-all hover:shadow-sm ${getCardColor(person.station)}`}
              key={person.id}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 cursor-grab text-slate-300">
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-5">
                  <div className="sm:col-span-2">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 font-medium text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) => updateStaff(idx, "name", e.target.value)}
                      placeholder="Name"
                      type="text"
                      value={person.name}
                    />
                  </div>
                  <div>
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) => updateStaff(idx, "role", e.target.value)}
                      placeholder="Role"
                      type="text"
                      value={person.role}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) =>
                        updateStaff(idx, "shift_start", e.target.value)
                      }
                      placeholder="In"
                      type="text"
                      value={person.shift_start}
                    />
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) =>
                        updateStaff(idx, "shift_end", e.target.value)
                      }
                      placeholder="Out"
                      type="text"
                      value={person.shift_end}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5 text-slate-700 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      onChange={(e) =>
                        updateStaff(idx, "station", e.target.value)
                      }
                      placeholder="Station"
                      type="text"
                      value={person.station}
                    />
                    <button
                      className="flex-shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:text-red-500"
                      onClick={() => removeStaff(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
