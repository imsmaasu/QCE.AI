import { describe, it, expect } from 'vitest';
import {
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  ComponentInstance,
} from '../engine/types';
import { computeComponentRows } from '../engine/bbs';
import {
  buildFootingScene,
  buildBeamScene,
  buildComponentScene,
  generateView2D,
} from '../geometry';

describe('Geometry Layer Tests', () => {
  const corr = { roundUpBarCounts: true, c2StirrupHooksLikeTies: false };

  const sampleFooting: ComponentInstance = {
    id: 'f1',
    type: 'footing',
    name: 'Footing F1',
    params: { ...FOOTING_DEFAULTS },
    rowOverrides: {},
    customRows: [],
    hiddenRows: [],
    drawingDetails: {
      thicknessIn: 12,
      leanThicknessIn: 4,
      leanProjectionIn: 4,
      leanMixLabel: '1:4:8',
      linkedColumnId: 'c1',
    },
  };

  const sampleColumn: ComponentInstance = {
    id: 'c1',
    type: 'column',
    name: 'Column C1',
    params: { ...COLUMN_DEFAULTS },
    rowOverrides: {},
    customRows: [],
    hiddenRows: [],
    drawingDetails: {
      colWidthIn: 12,
      colDepthIn: 18,
    },
  };

  const sampleBeam: ComponentInstance = {
    id: 'b1',
    type: 'beam',
    name: 'Beam B1',
    params: { ...BEAM_DEFAULTS },
    rowOverrides: {},
    customRows: [],
    hiddenRows: [],
  };

  const allComps = [sampleFooting, sampleColumn, sampleBeam];

  const fRows = computeComponentRows(sampleFooting, corr);
  const cRows = computeComponentRows(sampleColumn, corr);
  const bRows = computeComponentRows(sampleBeam, corr);

  // Test 1: Deterministic output
  it('Test 1: Deterministic output for same inputs', () => {
    const scene1 = buildComponentScene(sampleFooting, fRows, allComps);
    const scene2 = buildComponentScene(sampleFooting, fRows, allComps);
    expect(JSON.stringify(scene1)).toBe(JSON.stringify(scene2));

    const view1 = generateView2D(sampleFooting, fRows, allComps, 'footing-section');
    const view2 = generateView2D(sampleFooting, fRows, allComps, 'footing-section');
    expect(JSON.stringify(view1)).toBe(JSON.stringify(view2));

    const beamView1 = generateView2D(sampleBeam, bRows, allComps, 'beam-elevation');
    const beamView2 = generateView2D(sampleBeam, bRows, allComps, 'beam-elevation');
    expect(JSON.stringify(beamView1)).toBe(JSON.stringify(beamView2));
  });

  // Test 2: Marks drawn per view matching plan specification
  it('Test 2: Marks drawn per view', () => {
    // 1. Footing Section: R1 (line), R2 (circles), R3 (dowels if linked), R4 (ties if linked)
    const fSec = generateView2D(sampleFooting, fRows, allComps, 'footing-section');
    const fSecLines = new Set(fSec.lines.map((l) => l.rowId));
    const fSecCircles = new Set(fSec.circles.map((c) => c.rowId));
    expect(fSecLines.has('R1')).toBe(true);
    expect(fSecCircles.has('R2')).toBe(true);
    expect(fSecLines.has('R3')).toBe(true);
    expect(fSecLines.has('R4')).toBe(true);

    // 2. Footing Plan: R1 (lines), R2 (lines), R3 (dowels if linked)
    const fPlan = generateView2D(sampleFooting, fRows, allComps, 'footing-plan');
    const fPlanLines = new Set(fPlan.lines.map((l) => l.rowId));
    const fPlanCircles = new Set(fPlan.circles.map((c) => c.rowId));
    expect(fPlanLines.has('R1')).toBe(true);
    expect(fPlanLines.has('R2')).toBe(true);
    expect(fPlanCircles.has('R3')).toBe(true);

    // 3. Column Section: R3/R5 (circles), R4/R6 (tie loop)
    const cSec = generateView2D(sampleColumn, cRows, allComps, 'column-section');
    const cSecLines = new Set(cSec.lines.map((l) => l.rowId));
    const cSecCircles = new Set(cSec.circles.map((c) => c.rowId));
    expect(cSecCircles.has('R3')).toBe(true);
    expect(cSecLines.has('R4') || cSecLines.has('R6')).toBe(true);

    // 4. Column Elevation: R3, R5, R4, R6
    const cElev = generateView2D(sampleColumn, cRows, allComps, 'column-elevation');
    const cElevLines = new Set(cElev.lines.map((l) => l.rowId));
    expect(cElevLines.has('R3')).toBe(true);
    expect(cElevLines.has('R4')).toBe(true);
    expect(cElevLines.has('R5')).toBe(true);
    expect(cElevLines.has('R6')).toBe(true);

    // 5. Beam Elevation: R7 (bottom), R8 (extra), R9 (top), R10 (stirrups end), R11 (stirrups mid)
    const bElev = generateView2D(sampleBeam, bRows, allComps, 'beam-elevation');
    const bElevLines = new Set(bElev.lines.map((l) => l.rowId));
    expect(bElevLines.has('R7')).toBe(true);
    expect(bElevLines.has('R8')).toBe(true);
    expect(bElevLines.has('R9')).toBe(true);
    expect(bElevLines.has('R10')).toBe(true);
    expect(bElevLines.has('R11')).toBe(true);

    // 6. Beam Section A-A: R7 (bottom), R8 (extra), R9 (top), R11 (stirrup loop)
    const bSec = generateView2D(sampleBeam, bRows, allComps, 'beam-section');
    const bSecLines = new Set(bSec.lines.map((l) => l.rowId));
    const bSecCircles = new Set(bSec.circles.map((c) => c.rowId));
    expect(bSecCircles.has('R7')).toBe(true);
    expect(bSecCircles.has('R8')).toBe(true);
    expect(bSecCircles.has('R9')).toBe(true);
    expect(bSecLines.has('R11')).toBe(true);
  });

  // Test 3: Cover clearance
  it('Test 3: Cover clearance (every bar point lies inside concrete offset by cover)', () => {
    // Check Beam main bars vs beam solid
    const beamScene = buildBeamScene(sampleBeam, bRows);
    const beamSolid = beamScene.solids.find((s) => s.id === 'beam-span')!;
    const bp = sampleBeam.params as import('../engine/types').BeamInputs;
    const cover = bp.coverEachSideIn; // 0.75 in
    const tol = 0.01;

    // Check bottom continuous bars (R7)
    const r7 = beamScene.bars.filter((b) => b.rowId === 'R7');
    expect(r7.length).toBeGreaterThan(0);
    for (const bar of r7) {
      // The horizontal span segment points inside beam span:
      // y must be >= min.y + cover - tol
      // z must be between min.z + cover - tol and max.z - cover + tol
      for (const pt of bar.points) {
        if (pt[0] >= 0 && pt[0] <= bp.clearSpanFt * 12) {
          expect(pt[1]).toBeGreaterThanOrEqual(beamSolid.min[1] + cover - tol);
          expect(pt[1]).toBeLessThanOrEqual(beamSolid.max[1] - cover + tol);
          expect(pt[2]).toBeGreaterThanOrEqual(beamSolid.min[2] + cover - tol);
          expect(pt[2]).toBeLessThanOrEqual(beamSolid.max[2] - cover + tol);
        }
      }
    }

    // Check Footing main bars (R1)
    const footingScene = buildFootingScene(sampleFooting, fRows, allComps);
    const footingSolid = footingScene.solids.find((s) => s.id === 'footing-solid')!;
    const fp = sampleFooting.params as import('../engine/types').FootingInputs;
    const fCover = fp.coverEachSideIn; // 0.75 in
    const r1 = footingScene.bars.filter((b) => b.rowId === 'R1');
    for (const bar of r1) {
      for (const pt of bar.points) {
        expect(pt[0]).toBeGreaterThanOrEqual(footingSolid.min[0] + fCover - tol);
        expect(pt[0]).toBeLessThanOrEqual(footingSolid.max[0] - fCover + tol);
        expect(pt[1]).toBeGreaterThanOrEqual(footingSolid.min[1] + fCover - tol);
        expect(pt[1]).toBeLessThanOrEqual(footingSolid.max[1] - fCover + tol);
        expect(pt[2]).toBeGreaterThanOrEqual(footingSolid.min[2] + fCover - tol);
        expect(pt[2]).toBeLessThanOrEqual(footingSolid.max[2] - fCover + tol);
      }
    }
  });

  // Test 4: Callout & dimension consistency
  it('Test 4: Callout and dimension consistency', () => {
    // Beam: span 15.5 ft -> 15'-6"
    const bElev = generateView2D(sampleBeam, bRows, allComps, 'beam-elevation');
    const spanDim = bElev.dimensions.find((d) => d.id === 'elev-dim-clear-span');
    expect(spanDim?.text).toBe("15'-6\"");

    // Hook dim -> 12" (TYP.)
    const hookDim = bElev.dimensions.find((d) => d.id === 'elev-dim-left-hook');
    expect(hookDim?.text).toBe('12"');
    expect(hookDim?.subText).toBe('(TYP.)');

    // Footing: width 4.0 ft -> 4'-0"
    const fSec = generateView2D(sampleFooting, fRows, allComps, 'footing-section');
    const bDim = fSec.dimensions.find((d) => d.id === 'dim-B');
    expect(bDim?.text).toBe("4'-0\"");

    // Thickness -> 12"
    const thickDim = fSec.dimensions.find((d) => d.id === 'dim-thickness');
    expect(thickDim?.text).toBe('12"');

    // Leaders: Main bar 1/2"Ø@4"C/C
    const mainLeader = fSec.leaders.find((l) => l.rowId === 'R1');
    expect(mainLeader?.text).toBe('1/2"Ø@4"C/C');
  });

  // Test 5: Column linking
  it('Test 5: Linked column vs unlinked inputs', () => {
    // Linked footing
    const linkedScene = buildFootingScene(sampleFooting, fRows, allComps);
    const linkedDowels = linkedScene.bars.filter((b) => b.rowId === 'R3');
    expect(linkedDowels.length).toBe(8); // 8 dowels from C1
    const glDim = linkedScene.dimensions.find((d) => d.id === 'dim-depth-gl');
    expect(glDim?.text).toBe("5'-0\""); // from C1 5 ft

    // Unlinked footing
    const unlinkedFooting: ComponentInstance = {
      ...sampleFooting,
      drawingDetails: {
        ...sampleFooting.drawingDetails,
        linkedColumnId: null,
      },
    };
    const unlinkedScene = buildFootingScene(unlinkedFooting, fRows, allComps);
    const unlinkedDowels = unlinkedScene.bars.filter((b) => b.rowId === 'R3');
    expect(unlinkedDowels.length).toBe(0); // No column dowels when unlinked
    expect(unlinkedScene.solids.find((s) => s.id === 'column-shaft')).toBeUndefined();
  });
});
