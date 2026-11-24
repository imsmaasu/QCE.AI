import { describe, it, expect } from 'vitest';
import { generateView2D } from '../geometry';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.2 - Part 5: Site Working Drawing View (A3 Construction Sheet)', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  it('generates Site view with A3 standard sheet bounds (420 x 297 mm)', () => {
    for (const comp of [f1, c1, b1]) {
      const rows = bbsResult.rows.filter((r) => r.componentId === comp.id);
      const v = generateView2D(comp, rows, state.components, 'site');

      expect(v.viewId).toBe('site');
      expect(v.bounds.width).toBe(420);
      expect(v.bounds.height).toBe(297);
      expect(v.lines.length).toBeGreaterThan(0);
    }
  });

  it('verifies Site view has outer border framing and siteView flag', () => {
    const v = generateView2D(b1, b1Rows, state.components, 'site');

    // Outer border exists
    const outerBorder = v.lines.find((l) => l.markId === 'border-outer');
    expect(outerBorder).toBeDefined();

    // siteView flag is true
    expect(v.siteView).toBe(true);
  });

  it('verifies BBS Bar Mark Tags are generated for each computed row', () => {
    const v = generateView2D(b1, b1Rows, state.components, 'site');

    // For Beam: rows R7, R8, R9, R10, R11 should each have a site tag
    for (const row of b1Rows) {
      const tag = v.leaders.find((l) => l.id === `site-tag-${row.id}`);
      expect(tag).toBeDefined();
      expect(tag?.rowId).toBe(row.id);
      expect(tag?.text).toContain(`#${row.barNo}`);
    }
  });

  it('verifies clean views remain clean (no site title block, standard CAD format)', () => {
    const cleanElev = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
    expect(cleanElev.viewId).toBe('beam-elevation');
    // Clean view does not have site title block border
    const tbBorder = cleanElev.lines.find((l) => l.markId === 'tb-border');
    expect(tbBorder).toBeUndefined();
    // Clean view has its own title
    expect(cleanElev.title.toUpperCase()).toContain('BEAM');
  });
});
