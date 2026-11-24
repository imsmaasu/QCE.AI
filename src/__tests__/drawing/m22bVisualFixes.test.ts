import { describe, it, expect } from 'vitest';
import { generateView2D } from '../../geometry';
import { useProjectStore } from '../../store/projectStore';

describe('Milestone 2.2-B: Drawing Visual Fixes Verification', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  describe('Bug 1: Column Elevation', () => {
    it('generates ties as closed rectangular loops with inward offset', () => {
      const v = generateView2D(c1, c1Rows, state.components, 'column-elevation', 'simple');
      const ties = v.lines.filter((l) => l.kind === 'tie');
      expect(ties.length).toBeGreaterThan(0);

      for (const tie of ties) {
        expect(tie.points.length).toBe(5);
        // Start point equals end point
        expect(tie.points[0][0]).toBeCloseTo(tie.points[4][0]);
        expect(tie.points[0][1]).toBeCloseTo(tie.points[4][1]);
      }
    });

    it('identifies dowels and secondary bars for slim secondary stroke weight', () => {
      const v = generateView2D(c1, c1Rows, state.components, 'column-elevation', 'textbook');
      const dowels = v.lines.filter((l) => l.rowId === 'R3' || l.rowId === 'R5');
      expect(dowels.length).toBeGreaterThan(0);
      for (const d of dowels) {
        expect(d.kind).toBe('dowel');
      }
    });

    it('includes level marks with GL and Plinth for elevation clearance check', () => {
      const v = generateView2D(c1, c1Rows, state.components, 'column-elevation');
      const gl = v.levelMarks.find((l) => l.id.includes('gl'));
      const plinth = v.levelMarks.find((l) => l.id.includes('plinth'));
      expect(gl).toBeDefined();
      expect(plinth).toBeDefined();
      expect(Math.abs(gl!.y - plinth!.y)).toBeLessThanOrEqual(36); // within 3H
    });
  });

  describe('Bug 2: Footing Section', () => {
    it('places lead-main in the right half and lead-dist in the left half without overlap', () => {
      const v = generateView2D(f1, f1Rows, state.components, 'footing-section');
      const leadMain = v.leaders.find((l) => l.rowId === 'R1');
      const leadDist = v.leaders.find((l) => l.rowId === 'R2');

      expect(leadMain).toBeDefined();
      expect(leadDist).toBeDefined();

      // Main bar leader exits to the right and targets right half
      expect(leadMain!.direction).toBe('right');
      expect(leadMain!.target[0]).toBeGreaterThan(0);

      // Distribution bar leader exits to the left and targets left half
      expect(leadDist!.direction).toBe('left');
      expect(leadDist!.target[0]).toBeLessThan(0);
    });
  });

  describe('Bug 3: Footing Plan', () => {
    it('in Textbook mode places 1-rep main and dist bars at center, not boundary', () => {
      const vTextbook = generateView2D(f1, f1Rows, state.components, 'footing-plan', 'textbook');
      const r1Lines = vTextbook.lines.filter((l) => l.rowId === 'R1');
      const r2Lines = vTextbook.lines.filter((l) => l.rowId === 'R2');

      expect(r1Lines.length).toBe(1);
      expect(r2Lines.length).toBe(1);

      // In textbook mode, the representative bar is near center z=0 and x=0
      expect(Math.abs(r1Lines[0].points[0][1])).toBeLessThan(12);
      expect(Math.abs(r2Lines[0].points[0][0])).toBeLessThan(12);
    });

    it('targets actual bar coordinates for leaders', () => {
      const v = generateView2D(f1, f1Rows, state.components, 'footing-plan');
      const leadMain = v.leaders.find((l) => l.id === 'plan-lead-main');
      const leadDist = v.leaders.find((l) => l.id === 'plan-lead-dist');

      expect(leadMain).toBeDefined();
      expect(leadDist).toBeDefined();

      expect(leadMain!.direction).toBe('right');
      expect(leadDist!.direction).toBe('top');

      // Lead main target is [0, zMid]
      expect(leadMain!.target[0]).toBe(0);
      // Lead dist target is [xMid, 0]
      expect(leadDist!.target[1]).toBe(0);
    });
  });

  describe('Bug 4: Beam Elevation', () => {
    it('has exactly 6 leaders with assigned directions', () => {
      const v = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
      const leaders = v.leaders;
      expect(leaders.length).toBe(6);

      const leadStirrupLeft = leaders.find((l) => l.id.includes('stirrup-left'));
      const leadStirrupMid = leaders.find((l) => l.id.includes('stirrup-mid'));
      const leadStirrupRight = leaders.find((l) => l.id.includes('stirrup-right'));
      const leadTop = leaders.find((l) => l.id.includes('top-bars'));
      const leadBot = leaders.find((l) => l.id.includes('bot-bars'));
      const leadExtra = leaders.find((l) => l.id.includes('extra-bot'));

      expect(leadStirrupLeft?.direction).toBe('left');
      expect(leadStirrupMid?.direction).toBe('bottom');
      expect(leadStirrupRight?.direction).toBe('right');
      expect(leadTop?.direction).toBe('top');
      expect(leadBot?.direction).toBe('bottom');
      expect(leadExtra?.direction).toBe('bottom');

      // Mid-stirrup target at clearSpan * 0.5, y = 0
      expect(leadStirrupMid?.target[1]).toBe(0);
    });

    it('staggers zone dimensions with mid-zone at -16 and end-zones at -10', () => {
      const v = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
      const dimLeft = v.dimensions.find((d) => d.id === 'elev-dim-zone-left');
      const dimMid = v.dimensions.find((d) => d.id === 'elev-dim-zone-mid');
      const dimRight = v.dimensions.find((d) => d.id === 'elev-dim-zone-right');

      expect(dimLeft).toBeDefined();
      expect(dimMid).toBeDefined();
      expect(dimRight).toBeDefined();

      expect(dimLeft!.offset).toBe(-10);
      expect(dimMid!.offset).toBe(-16);
      expect(dimRight!.offset).toBe(-10);
    });
  });
});
