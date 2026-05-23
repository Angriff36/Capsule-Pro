import { FileText, Cpu } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              Document Parser
              <span className="text-xs font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                v1.0
              </span>
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Layout-Aware Pipeline — Docling + Rules + AI
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
