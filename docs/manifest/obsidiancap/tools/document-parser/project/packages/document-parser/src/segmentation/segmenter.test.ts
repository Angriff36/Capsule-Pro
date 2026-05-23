import { describe, it, expect } from 'vitest';
import { segment } from './segmenter.js';
import type { LayoutBlock, PipelineConfig } from '../types/domain-types.js';
import { DEFAULT_CONFIG } from '../types/domain-types.js';

const config: PipelineConfig = { ...DEFAULT_CONFIG };

function makeBlock(overrides: Partial<LayoutBlock> & { id: string; content: string }): LayoutBlock {
  return {
    type: 'text',
    page: 1,
    ...overrides,
  };
}

describe('Segmenter', () => {
  describe('orphan number suppression', () => {
    it('suppresses standalone numbers not in food context', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'b1', content: 'Pan-Seared Salmon', type: 'heading', fontWeight: 'bold', fontSize: 16 }),
        makeBlock({ id: 'orphan', content: '2' }),
        makeBlock({ id: 'b2', content: 'Braised Short Ribs', type: 'heading', fontWeight: 'bold', fontSize: 16, lineSpacingBefore: 24 }),
      ];

      const result = segment(blocks, config);
      const orphan = result.candidates.find((c) => c.id === 'orphan');

      expect(orphan).toBeDefined();
      expect(orphan!.suppressed).toBe(true);
      expect(orphan!.suppressionReason).toContain('orphan number');
    });

    it('does NOT suppress numbers adjacent to food quantities', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'num', content: '20' }),
        makeBlock({ id: 'food', content: 'lbs Atlantic salmon fillets' }),
      ];

      const result = segment(blocks, config);
      const numBlock = result.candidates.find((c) => c.id === 'num');

      expect(numBlock).toBeDefined();
      expect(numBlock!.suppressed).toBe(false);
    });

    it('suppresses single digit with no food neighbor', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'heading', content: 'Menu', type: 'heading', fontWeight: 'bold', fontSize: 20 }),
        makeBlock({ id: 'solo3', content: '3' }),
        makeBlock({ id: 'note', content: 'All items served with bread' }),
      ];

      const result = segment(blocks, config);
      const solo = result.candidates.find((c) => c.id === 'solo3');

      expect(solo).toBeDefined();
      expect(solo!.suppressed).toBe(true);
    });
  });

  describe('page number suppression', () => {
    it('suppresses "Page 1 of 3"', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'page', content: 'Page 1 of 3' }),
      ];

      const result = segment(blocks, config);
      expect(result.candidates[0].suppressed).toBe(true);
      expect(result.candidates[0].suppressionReason).toContain('page number');
    });

    it('suppresses "page 2 / 5"', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'page', content: 'page 2 / 5' }),
      ];

      const result = segment(blocks, config);
      expect(result.candidates[0].suppressed).toBe(true);
    });
  });

  describe('artifact suppression', () => {
    it('suppresses decorative lines', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'dashes', content: '---' }),
        makeBlock({ id: 'stars', content: '***' }),
        makeBlock({ id: 'dots', content: '...' }),
        makeBlock({ id: 'underscores', content: '___' }),
      ];

      const result = segment(blocks, config);
      for (const candidate of result.candidates) {
        expect(candidate.suppressed).toBe(true);
        expect(candidate.suppressionReason).toContain('artifact');
      }
    });

    it('suppresses section counters', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'sec', content: 'Section 3' }),
      ];

      const result = segment(blocks, config);
      expect(result.candidates[0].suppressed).toBe(true);
      expect(result.candidates[0].suppressionReason).toContain('section counter');
    });
  });

  describe('empty/short content suppression', () => {
    it('suppresses empty content', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'empty', content: '' }),
      ];

      const result = segment(blocks, config);
      expect(result.candidates[0].suppressed).toBe(true);
    });

    it('suppresses content below minimum length', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'short', content: 'x' }),
      ];

      const result = segment(blocks, config);
      expect(result.candidates[0].suppressed).toBe(true);
    });
  });

  describe('entity grouping', () => {
    it('groups heading with following body text', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'h1', content: 'Grilled Chicken', type: 'heading', fontWeight: 'bold', fontSize: 16 }),
        makeBlock({ id: 't1', content: 'Served with roasted vegetables', lineSpacingBefore: 4 }),
        makeBlock({ id: 't2', content: 'GF / DF available', lineSpacingBefore: 2 }),
      ];

      const result = segment(blocks, config);
      const active = result.candidates.filter((c) => !c.suppressed);

      expect(active.length).toBe(1);
      expect(active[0].blocks.length).toBe(3);
      expect(active[0].segmentationType).toBe('menu_item_header');
    });

    it('splits on significant vertical spacing', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'h1', content: 'Salmon', type: 'heading', fontWeight: 'bold', fontSize: 16 }),
        makeBlock({ id: 'd1', content: 'With lemon', lineSpacingBefore: 4 }),
        makeBlock({ id: 'h2', content: 'Steak', type: 'heading', fontWeight: 'bold', fontSize: 16, lineSpacingBefore: 24 }),
        makeBlock({ id: 'd2', content: 'With fries', lineSpacingBefore: 4 }),
      ];

      const result = segment(blocks, config);
      const active = result.candidates.filter((c) => !c.suppressed);

      expect(active.length).toBe(2);
      expect(active[0].mergedContent).toContain('Salmon');
      expect(active[1].mergedContent).toContain('Steak');
    });
  });

  describe('diagnostics', () => {
    it('reports suppression count in diagnostics', () => {
      const blocks: LayoutBlock[] = [
        makeBlock({ id: 'real', content: 'Chicken Parmesan', type: 'heading', fontWeight: 'bold', fontSize: 16 }),
        makeBlock({ id: 'orphan', content: '5' }),
        makeBlock({ id: 'page', content: 'Page 1 of 1' }),
      ];

      const result = segment(blocks, config);
      const summaryDiag = result.diagnostics.find((d) => d.message.includes('Segmentation complete'));

      expect(summaryDiag).toBeDefined();
      expect(summaryDiag!.message).toContain('2 suppressed');
    });
  });
});
