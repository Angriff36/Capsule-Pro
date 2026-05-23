import { describe, it, expect } from 'vitest';
import { classifyWithRules } from './classifier.js';
import type { CandidateBlock } from '../types/domain-types.js';

function makeCandidate(overrides: Partial<CandidateBlock> & { id: string; mergedContent: string }): CandidateBlock {
  return {
    blocks: [],
    segmentationType: 'body_text',
    suppressed: false,
    ...overrides,
  };
}

describe('Rule-based classifier', () => {
  it('classifies heading-type blocks as menu_item', () => {
    const candidate = makeCandidate({
      id: 'h1',
      mergedContent: 'Pan-Seared Salmon',
      segmentationType: 'menu_item_header',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('menu_item');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('classifies dietary flags as modifier', () => {
    const candidate = makeCandidate({
      id: 'm1',
      mergedContent: 'GF / DF option available',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('modifier');
    expect(result.belongsToPreviousItem).toBe(true);
  });

  it('classifies supply text as ingredient_list', () => {
    const candidate = makeCandidate({
      id: 'inv1',
      mergedContent: 'Need: 20 lbs salmon fillets, 15 lbs short ribs',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('ingredient_list');
  });

  it('classifies prep instructions', () => {
    const candidate = makeCandidate({
      id: 'inst1',
      mergedContent: 'Prep salmon marinade day-before',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('instruction');
  });

  it('classifies note/reminder text', () => {
    const candidate = makeCandidate({
      id: 'n1',
      mergedContent: 'Chef note: all plates must go out by 7pm',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('note');
  });

  it('returns low confidence for ambiguous short text', () => {
    const candidate = makeCandidate({
      id: 'amb1',
      mergedContent: 'xyz',
    });

    const result = classifyWithRules(candidate);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('classifies staffing lines as note', () => {
    const candidate = makeCandidate({
      id: 'staff1',
      mergedContent: 'Station 1: Grill — Mike R. (PM shift)',
    });

    const result = classifyWithRules(candidate);
    expect(result.classification).toBe('note');
  });
});
