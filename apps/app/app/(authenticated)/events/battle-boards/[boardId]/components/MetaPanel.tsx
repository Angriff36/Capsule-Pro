import { Calendar, Car, Info, MapPin, Users, Utensils } from "lucide-react";
import type { BattleBoardFull } from "@/lib/battle-boards/types";

interface MetaPanelProps {
  board: BattleBoardFull;
  onChange: (board: BattleBoardFull) => void;
}

export function MetaPanel({ board, onChange }: MetaPanelProps) {
  function update(field: keyof BattleBoardFull, value: string | number) {
    onChange({ ...board, [field]: value });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-slate-900 text-sm uppercase tracking-wide">
          Event Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Event Name
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              onChange={(e) => update("event_name", e.target.value)}
              placeholder="Client or event name..."
              type="text"
              value={board.event_name}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Event Number
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              onChange={(e) => update("event_number", e.target.value)}
              placeholder="Invoice / reference #"
              type="text"
              value={board.event_number}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Event Date
            </label>
            <div className="relative">
              <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) => update("event_date", e.target.value)}
                type="date"
                value={board.event_date || ""}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Headcount
            </label>
            <div className="relative">
              <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                min="0"
                onChange={(e) =>
                  update("headcount", Number.parseInt(e.target.value) || 0)
                }
                placeholder="Number of guests"
                type="number"
                value={board.headcount || ""}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Service Style
            </label>
            <div className="relative">
              <Utensils className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) => update("service_style", e.target.value)}
                placeholder="Buffet, plated, stations..."
                type="text"
                value={board.service_style}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 text-sm transition-colors focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              onChange={(e) => update("status", e.target.value)}
              value={board.status}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-slate-900 text-sm uppercase tracking-wide">
          Venue
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Venue Name
            </label>
            <div className="relative">
              <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) => update("venue_name", e.target.value)}
                placeholder="Venue name"
                type="text"
                value={board.venue_name}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Address
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              onChange={(e) => update("venue_address", e.target.value)}
              placeholder="Street address"
              type="text"
              value={board.venue_address}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-slate-900 text-sm uppercase tracking-wide">
          Staff Info
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Parking Instructions
            </label>
            <div className="relative">
              <Car className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <textarea
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) => update("staff_parking", e.target.value)}
                placeholder="Where should staff park?"
                rows={2}
                value={board.staff_parking}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700 text-sm">
              Restroom Locations
            </label>
            <div className="relative">
              <Info className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
              <textarea
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-9 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                onChange={(e) => update("staff_restrooms", e.target.value)}
                placeholder="Staff restroom locations"
                rows={2}
                value={board.staff_restrooms}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-semibold text-slate-900 text-sm uppercase tracking-wide">
          Notes
        </h2>
        <textarea
          className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 text-sm transition-colors placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          onChange={(e) => update("notes", e.target.value)}
          placeholder="General event notes, special requirements, allergies..."
          rows={4}
          value={board.notes}
        />
      </section>
    </div>
  );
}
