import { Calendar, MapPin, Users, Utensils, Car, Info } from 'lucide-react';
import type { BattleBoardFull } from '@/lib/battle-boards/types';

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
      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Event Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
            <input
              type="text"
              value={board.event_name}
              onChange={(e) => update('event_name', e.target.value)}
              placeholder="Client or event name..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Number</label>
            <input
              type="text"
              value={board.event_number}
              onChange={(e) => update('event_number', e.target.value)}
              placeholder="Invoice / reference #"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={board.event_date || ''}
                onChange={(e) => update('event_date', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Headcount</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min="0"
                value={board.headcount || ''}
                onChange={(e) => update('headcount', parseInt(e.target.value) || 0)}
                placeholder="Number of guests"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Style</label>
            <div className="relative">
              <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={board.service_style}
                onChange={(e) => update('service_style', e.target.value)}
                placeholder="Buffet, plated, stations..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={board.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Venue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Venue Name</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={board.venue_name}
                onChange={(e) => update('venue_name', e.target.value)}
                placeholder="Venue name"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={board.venue_address}
              onChange={(e) => update('venue_address', e.target.value)}
              placeholder="Street address"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
            />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Staff Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parking Instructions</label>
            <div className="relative">
              <Car className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={board.staff_parking}
                onChange={(e) => update('staff_parking', e.target.value)}
                placeholder="Where should staff park?"
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors resize-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Restroom Locations</label>
            <div className="relative">
              <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={board.staff_restrooms}
                onChange={(e) => update('staff_restrooms', e.target.value)}
                placeholder="Staff restroom locations"
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors resize-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Notes</h2>
        <textarea
          value={board.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="General event notes, special requirements, allergies..."
          rows={4}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors resize-none"
        />
      </section>
    </div>
  );
}
