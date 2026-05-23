import { describe, it, expect } from 'vitest';
import { parseDocument } from './index.js';
import { resolve } from 'node:path';

describe('Full pipeline (mock extraction)', () => {
  it('parses a mock PDF and produces entities', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.5, enableAI: false }
    );

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.summary.totalBlocksExtracted).toBeGreaterThan(0);
    expect(result.summary.blocksSuppressed).toBeGreaterThan(0);
  });

  it('suppresses orphan numbers from mock data', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.5, enableAI: false }
    );

    const suppressionDiags = result.diagnostics.filter(
      (d) => d.stage === 'segmentation' && d.message.includes('orphan number')
    );
    expect(suppressionDiags.length).toBeGreaterThan(0);
  });

  it('produces menu items from mock data', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.3, enableAI: false }
    );

    const menuItems = result.entities.filter((e) => e.kind === 'menu_item');
    expect(menuItems.length).toBeGreaterThan(0);

    const salmon = menuItems.find(
      (m) => m.kind === 'menu_item' && m.name.includes('Salmon')
    );
    expect(salmon).toBeDefined();
  });

  it('extracts staffing assignments from mock data', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.3, enableAI: false }
    );

    const staffing = result.entities.filter((e) => e.kind === 'staffing_assignment');
    expect(staffing.length).toBeGreaterThan(0);
  });

  it('extracts inventory needs from mock data', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.3, enableAI: false }
    );

    const inventory = result.entities.filter((e) => e.kind === 'inventory_need');
    expect(inventory.length).toBeGreaterThan(0);
  });

  it('reports page number suppression', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.3, enableAI: false }
    );

    const pageNumberDiags = result.diagnostics.filter(
      (d) => d.message.includes('page number')
    );
    expect(pageNumberDiags.length).toBeGreaterThan(0);
  });

  it('never produces an entity from a suppressed block', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.3, enableAI: false }
    );

    const suppressedBlockIds = result.diagnostics
      .filter((d) => d.details?.reason)
      .map((d) => d.details?.blockId)
      .filter(Boolean);

    for (const entity of result.entities) {
      for (const blockId of entity.sourceBlockIds) {
        expect(suppressedBlockIds).not.toContain(blockId);
      }
    }
  });

  it('provides a valid summary', async () => {
    const result = await parseDocument(
      resolve('/tmp/test-menu.pdf'),
      'pdf',
      { confidenceThreshold: 0.5, enableAI: false }
    );

    expect(result.summary.totalBlocksExtracted).toBeGreaterThan(0);
    expect(result.summary.blocksSuppressed).toBeGreaterThanOrEqual(0);
    expect(result.summary.entitiesProduced).toBe(result.entities.length);
    expect(result.summary.unresolvedCount).toBe(result.unresolved.length);
    expect(result.summary.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(result.summary.averageConfidence).toBeLessThanOrEqual(1);
  });
});
