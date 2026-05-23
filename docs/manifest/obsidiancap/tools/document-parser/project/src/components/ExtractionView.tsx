import { FileText } from 'lucide-react';
import type { LayoutBlock } from '../data/mock-pipeline';

interface Props {
  blocks: LayoutBlock[];
  visible: boolean;
}

function fontSizeToClass(fs?: number): string {
  if (!fs) return 'text-sm';
  if (fs >= 20) return 'text-lg';
  if (fs >= 14) return 'text-base';
  if (fs >= 10) return 'text-sm';
  return 'text-xs';
}

function alignmentToClass(a?: string): string {
  if (a === 'center') return 'text-center';
  if (a === 'right') return 'text-right';
  return 'text-left';
}

export function ExtractionView({ blocks, visible }: Props) {
  const page1 = blocks.filter((b) => b.page === 1);
  const page2 = blocks.filter((b) => b.page === 2);

  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Stage 1: Extracted Layout Blocks</h3>
        <span className="text-xs text-slate-400">{blocks.length} blocks across 2 pages</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <PagePreview pageNum={1} blocks={page1} />
        <PagePreview pageNum={2} blocks={page2} />
      </div>
    </div>
  );
}

function PagePreview({ pageNum, blocks }: { pageNum: number; blocks: LayoutBlock[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Page {pageNum}</span>
        <span className="text-[10px] text-slate-400">{blocks.length} blocks</span>
      </div>
      <div className="p-4 space-y-1.5 min-h-[200px] bg-white">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`px-2 py-1 rounded transition-colors group hover:bg-slate-50 ${alignmentToClass(block.alignment)}`}
          >
            <span
              className={`${fontSizeToClass(block.fontSize)} ${
                block.fontWeight === 'bold' ? 'font-semibold text-slate-900' : 'text-slate-600'
              }`}
            >
              {block.content}
            </span>
            <span className="ml-2 text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
              {block.type} / {block.fontSize}pt
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
