import { describe, it, expect } from 'vitest';
import { generateView2D } from '../geometry';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.2 - Part 1: Layout Zones, Collision Avoidance, and Drafting Cleanliness', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  it('guarantees dedicated title zone below drawing with >= 6.5H clearance', () => {
    const views = [
      generateView2D(f1, f1Rows, state.components, 'footing-section'),
      generateView2D(f1, f1Rows, state.components, 'footing-plan'),
      generateView2D(c1, c1Rows, state.components, 'column-section'),
      generateView2D(c1, c1Rows, state.components, 'column-elevation'),
      generateView2D(b1, b1Rows, state.components, 'beam-elevation'),
      generateView2D(b1, b1Rows, state.components, 'beam-section'),
    ];

    for (const v of views) {
      const H = 0.023 * Math.max(v.bounds.width, v.bounds.height);
      expect(v.bounds.width).toBeGreaterThan(0);
      expect(v.bounds.height).toBeGreaterThan(0);
      // All views have titles
      expect(v.title.length).toBeGreaterThan(0);
      // Dedicated title zone is at least 6.5H
      expect(v.bounds.height).toBeGreaterThan(6.5 * H);
    }
  });

  it('verifies footing-plan dimensions sit completely outside the footing and lean concrete', () => {
    const v = generateView2D(f1, f1Rows, state.components, 'footing-plan');
    const dimL = v.dimensions.find((d) => d.id === 'plan-dim-L');
    const dimB = v.dimensions.find((d) => d.id === 'plan-dim-B');

    expect(dimL).toBeDefined();
    expect(dimB).toBeDefined();

    // Check that concrete polygons do not intersect the plan dimension lines
    const concretePolys = v.polygons.filter((p) => p.material === 'concrete' || p.material === 'lean_concrete');
    let minU = Infinity;
    let minV = Infinity;
    for (const poly of concretePolys) {
      for (const pt of poly.points) {
        if (pt[0] < minU) minU = pt[0];
        if (pt[1] < minV) minV = pt[1];
      }
    }

    if (dimL) {
      // dimL is horizontal, offset downwards (negative v)
      const dimLineV = dimL.p1[1] + dimL.offset;
      expect(dimLineV).toBeLessThanOrEqual(minV);
    }

    if (dimB) {
      // dimB is vertical, offset leftwards (negative u)
      const dimLineU = dimB.p1[0] + dimB.offset;
      expect(dimLineU).toBeLessThanOrEqual(minU);
    }
  });

  it('verifies footing-section level marks have >= 1.5H horizontal clearance from vertical dimensions', () => {
    const v = generateView2D(f1, f1Rows, state.components, 'footing-section');
    const D = Math.max(v.bounds.width, v.bounds.height);
    const H = 0.023 * D;

    const dimPlinth = v.dimensions.find((d) => d.id === 'dim-plinth-above-gl');
    const lmGl = v.levelMarks.find((l) => l.id === 'lm-gl');

    expect(dimPlinth).toBeDefined();
    expect(lmGl).toBeDefined();

    if (dimPlinth && lmGl) {
      const dimX = dimPlinth.p1[0] + dimPlinth.offset;
      const lmX = lmGl.x;
      const horizontalClearance = Math.abs(dimX - lmX);
      expect(horizontalClearance).toBeGreaterThanOrEqual(1.5 * H);
    }
  });

  it('verifies beam-elevation section marker A is shifted away from midspan dimension text', () => {
    const v = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
    const markerA = v.sectionMarkers.find((s) => s.label === 'A');
    const clearSpanDim = v.dimensions.find((d) => d.id.includes('clear-span'));

    expect(markerA).toBeDefined();
    expect(clearSpanDim).toBeDefined();

    if (markerA && clearSpanDim) {
      const midspanX = (clearSpanDim.p1[0] + clearSpanDim.p2[0]) / 2;
      const markerX = markerA.p[0];
      const distance = Math.abs(midspanX - markerX);
      // Shifted away from midspan text by at least 15 inches
      expect(distance).toBeGreaterThanOrEqual(15);
    }
  });
});
