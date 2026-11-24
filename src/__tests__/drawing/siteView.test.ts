import { describe, it, expect } from 'vitest';
import { generateView2D } from '../../geometry';
import { useProjectStore } from '../../store/projectStore';

describe('Fix 2: Site Working Drawing View (case site in projection)', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const testCases = [
    { name: 'Footing', comp: f1 },
    { name: 'Column', comp: c1 },
    { name: 'Beam', comp: b1 },
  ];

  testCases.forEach(({ name, comp }) => {
    it(`verifies Site view for ${name}`, () => {
      const compRows = bbsResult.rows.filter((r) => r.componentId === comp.id);
      const v = generateView2D(comp, compRows, state.components, 'site');

      // 1. Returns a valid View2D
      expect(v).toBeDefined();
      expect(v.viewId).toBe('site');
      expect(v.bounds.width).toBe(420);
      expect(v.bounds.height).toBe(297);

      // 2. siteView flag is true
      expect(v.siteView).toBe(true);

      // 3. One bar mark tag leader per computed row minimum
      expect(v.leaders.length).toBeGreaterThanOrEqual(compRows.length);
      for (const row of compRows) {
        const tag = v.leaders.find((l) => l.id === `site-tag-${row.id}` || l.rowId === row.id);
        expect(tag).toBeDefined();
        expect(tag?.text).toContain(`#${row.barNo}`);
        expect(tag?.direction).toBe('right');
      }

      // 4. Outer border framing exists
      const outerBorder = v.lines.find((l) => l.markId === 'border-outer');
      expect(outerBorder).toBeDefined();
    });
  });
});
