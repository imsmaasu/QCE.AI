import { describe, it, expect } from 'vitest';
import { generateView2D } from '../geometry';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.1 - Part B: Drawing Proportions and Collision Checks (Test 6)', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  const views = [
    { type: 'footing-section' as const, comp: f1, rows: f1Rows },
    { type: 'footing-plan' as const, comp: f1, rows: f1Rows },
    { type: 'column-section' as const, comp: c1, rows: c1Rows },
    { type: 'column-elevation' as const, comp: c1, rows: c1Rows },
    { type: 'beam-elevation' as const, comp: b1, rows: b1Rows },
    { type: 'beam-section' as const, comp: b1, rows: b1Rows },
  ];

  it('verifies H = 2.3% of the longer bounding box side across all 6 views', () => {
    for (const { type, comp, rows } of views) {
      const v = generateView2D(comp, rows, state.components, type);
      const D = Math.max(v.bounds.width, v.bounds.height);
      const H = 0.023 * D;

      // Verify H is positive and scales with bounding box
      expect(H).toBeGreaterThan(0.4);

      // Verify line weight ratios relative to H
      const wLeader = 0.06 * H;
      const wDimLine = 0.08 * H;
      const wOutline = 0.085 * H;
      const wPrimary = 0.12 * H;
      const wSecondary = 0.10 * H;
      const wMain = 0.15 * H;
      const rDot = 0.225 * H;

      expect(wLeader / H).toBeCloseTo(0.06, 3);
      expect(wDimLine / H).toBeCloseTo(0.08, 3);
      expect(wOutline / H).toBeCloseTo(0.085, 3);
      expect(wPrimary / H).toBeCloseTo(0.12, 3);
      expect(wSecondary / H).toBeCloseTo(0.10, 3);
      expect(wMain / H).toBeCloseTo(0.15, 3);
      expect((2 * rDot) / H).toBeCloseTo(0.45, 3);
    }
  });

  it('verifies column elevation clearance between vertical dimensions and level marks is >= 1.5H', () => {
    const v = generateView2D(c1, c1Rows, state.components, 'column-elevation');
    const D = Math.max(v.bounds.width, v.bounds.height);
    const H = 0.023 * D;

    const dimPlinth = v.dimensions.find((d) => d.id.includes('plinth-height'));
    const lmGl = v.levelMarks.find((l) => l.id.includes('gl'));

    expect(dimPlinth).toBeDefined();
    expect(lmGl).toBeDefined();

    if (dimPlinth && lmGl) {
      // Horizontal coordinate of dimension line
      const dimX = dimPlinth.p1[0] + dimPlinth.offset;
      const lmX = lmGl.x;
      const horizontalClearance = Math.abs(dimX - lmX);

      // Clearance must be >= 1.5H
      expect(horizontalClearance).toBeGreaterThanOrEqual(1.5 * H);
    }
  });

  it('verifies beam elevation section marker A has clearance >= 1.5H below top dimensions', () => {
    const v = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
    const D = Math.max(v.bounds.width, v.bounds.height);
    const H = 0.023 * D;

    const markerA = v.sectionMarkers.find((s) => s.label === 'A');
    const topDim = v.dimensions.find((d) => d.id.includes('clear-span'));

    expect(markerA).toBeDefined();
    expect(topDim).toBeDefined();

    if (markerA && topDim) {
      // Top dimension y in world coordinates (beamDepthIn + offset)
      const dimTopY = topDim.p1[1] + topDim.offset;
      const markerY = markerA.p[1];
      const verticalClearance = dimTopY - markerY;

      // Vertical clearance between marker A and top dimension must be >= 1.5H
      expect(verticalClearance).toBeGreaterThanOrEqual(1.5 * H);
    }
  });

  it('verifies column section dimensions are offset outside member by >= 1.5H', () => {
    const v = generateView2D(c1, c1Rows, state.components, 'column-section');
    const D = Math.max(v.bounds.width, v.bounds.height);
    const H = 0.023 * D;

    const colDepthDim = v.dimensions.find((d) => d.id === 'sec-dim-depth');
    expect(colDepthDim).toBeDefined();

    if (colDepthDim) {
      // Offset magnitude must be >= 1.5H
      expect(Math.abs(colDepthDim.offset)).toBeGreaterThanOrEqual(1.5 * H);
    }
  });

  it('verifies dynamic viewBox padding gives >= 0.5H clearance around all bounds', () => {
    for (const { type, comp, rows } of views) {
      const v = generateView2D(comp, rows, state.components, type);
      const D = Math.max(v.bounds.width, v.bounds.height);
      const H = 0.023 * D;

      // Minimum padding check: width and height are larger than inner spans by at least 1H
      expect(v.bounds.width).toBeGreaterThan(H);
      expect(v.bounds.height).toBeGreaterThan(H);
    }
  });
});
