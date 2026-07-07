"use client";

import "./battle-board.css";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  MapPin,
  Save,
  Upload,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { BattleBoardFull } from "@/lib/battle-boards/types";
import { BoardOnboardingOverlay } from "../../components/board-onboarding-overlay";
import { saveBoardFull } from "../actions";
import { DocumentUpload } from "./components/DocumentUpload";
import { LayoutsPanel } from "./components/LayoutsPanel";
import { MetaPanel } from "./components/MetaPanel";
import { StaffPanel } from "./components/StaffPanel";
import { TimelinePanel } from "./components/TimelinePanel";

interface BattleBoardEditorClientProps {
  boardId: string;
  initialBoard: BattleBoardFull;
}

type Tab = "overview" | "staff" | "timeline" | "layouts";

export function BattleBoardEditorClient({
  boardId,
  initialBoard,
}: BattleBoardEditorClientProps) {
  const router = useRouter();
  const [board, setBoard] = useState<BattleBoardFull>(initialBoard);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUpload, setShowUpload] = useState(false);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      await saveBoardFull(boardId, board);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [boardId, board]);

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "staff",
      label: "Staff",
      icon: <Users className="h-4 w-4" />,
      count: board.staff.length,
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: <Clock className="h-4 w-4" />,
      count: board.timeline.length,
    },
    {
      id: "layouts",
      label: "Layouts",
      icon: <MapPin className="h-4 w-4" />,
      count: board.layouts.length,
    },
  ];

  return (
    <div className="bb-root flex min-h-screen flex-col bg-slate-50">
      <BoardOnboardingOverlay surface="battle-board" />
      <header className="sticky top-0 z-20 border-slate-200 border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="-ml-2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="max-w-[200px] truncate font-semibold text-base text-slate-900 sm:max-w-none">
                  {board.event_name || "Untitled Event"}
                </h1>
                {board.event_number && (
                  <p className="text-slate-500 text-xs">
                    #{board.event_number}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 text-sm transition-colors hover:bg-slate-50"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                disabled={saving}
                onClick={save}
              >
                {saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "overview" && (
          <MetaPanel board={board} onChange={setBoard} />
        )}
        {activeTab === "staff" && (
          <StaffPanel board={board} onChange={setBoard} />
        )}
        {activeTab === "timeline" && (
          <TimelinePanel board={board} onChange={setBoard} />
        )}
        {activeTab === "layouts" && (
          <LayoutsPanel board={board} onChange={setBoard} />
        )}
      </main>

      {showUpload && (
        <DocumentUpload
          board={board}
          onClose={() => setShowUpload(false)}
          onImport={(updated) => {
            setBoard(updated);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
