'use client';

import './battle-board.css';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Users, Clock, MapPin, FileText, AlertCircle, Check } from 'lucide-react';
import type { BattleBoardFull } from '@/lib/battle-boards/types';
import { saveBoardFull } from '../actions';
import { StaffPanel } from './components/StaffPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { LayoutsPanel } from './components/LayoutsPanel';
import { DocumentUpload } from './components/DocumentUpload';
import { MetaPanel } from './components/MetaPanel';

interface BattleBoardEditorClientProps {
  boardId: string;
  initialBoard: BattleBoardFull;
}

type Tab = 'overview' | 'staff' | 'timeline' | 'layouts';

export function BattleBoardEditorClient({ boardId, initialBoard }: BattleBoardEditorClientProps) {
  const router = useRouter();
  const [board, setBoard] = useState<BattleBoardFull>(initialBoard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showUpload, setShowUpload] = useState(false);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      await saveBoardFull(boardId, board);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [boardId, board]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" />, count: board.staff.length },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" />, count: board.timeline.length },
    { id: 'layouts', label: 'Layouts', icon: <MapPin className="w-4 h-4" />, count: board.layouts.length },
  ];

  return (
    <div className="bb-root min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-none">
                  {board.event_name || 'Untitled Event'}
                </h1>
                {board.event_number && (
                  <p className="text-xs text-slate-500">#{board.event_number}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'overview' && <MetaPanel board={board} onChange={setBoard} />}
        {activeTab === 'staff' && <StaffPanel board={board} onChange={setBoard} />}
        {activeTab === 'timeline' && <TimelinePanel board={board} onChange={setBoard} />}
        {activeTab === 'layouts' && <LayoutsPanel board={board} onChange={setBoard} />}
      </main>

      {showUpload && (
        <DocumentUpload
          board={board}
          onImport={(updated) => { setBoard(updated); setShowUpload(false); }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
