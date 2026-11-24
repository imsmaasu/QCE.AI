import { describe, it, expect } from 'vitest';
import { getFieldLimits, clampFieldValue } from '../engine/validation';
import { computeComponentRows } from '../engine/bbs';
import { BEAM_DEFAULTS, CORRECTIONS_DEFAULTS, ComponentInstance } from '../engine/types';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.2 - Part 4: Cover Limits and Dimension Validation', () => {
  it('calculates beam cover hardMax from beam width and depth', () => {
    // 8" width, 24" depth -> min dim = 8" -> hardMax = 8/2 - 1 = 3.0 in
    const limits8 = getFieldLimits('beam', 'coverEachSideIn', { beamWidthIn: 8, beamDepthIn: 24 });
    expect(limits8).toBeDefined();
    expect(limits8?.hardMin).toBe(0.5);
    expect(limits8?.hardMax).toBe(3.0);
    expect(limits8?.softMin).toBe(1.5);

    // 12" width, 24" depth -> min dim = 12" -> hardMax = 12/2 - 1 = 5.0 in
    const limits12 = getFieldLimits('beam', 'coverEachSideIn', { beamWidthIn: 12, beamDepthIn: 24 });
    expect(limits12?.hardMax).toBe(5.0);
  });

  it('calculates column cover hardMax from column width and depth', () => {
    // 1 ft (12") x 1.5 ft (18") -> min dim = 12" -> hardMax = 12/2 - 1 = 5.0 in
    const limits = getFieldLimits('column', 'coverEachSideIn', { columnWidthFt: 1, columnDepthFt: 1.5 });
    expect(limits).toBeDefined();
    expect(limits?.hardMin).toBe(0.5);
    expect(limits?.hardMax).toBe(5.0);
  });

  it('calculates footing cover hardMax from footing plan dimensions', () => {
    // 4 ft (48") x 4 ft (48") -> min dim = 48" -> hardMax = 48/2 - 1 = 23.0 in
    const limits = getFieldLimits('footing', 'coverEachSideIn', { B: 4, L: 4 });
    expect(limits).toBeDefined();
    expect(limits?.hardMin).toBe(0.5);
    expect(limits?.hardMax).toBe(23.0);
    expect(limits?.softMin).toBe(3.0);
  });

  it('clampFieldValue correctly restricts numbers to valid range', () => {
    // Too small -> clamped to hardMin
    expect(clampFieldValue('beam', 'coverEachSideIn', 0.1, { beamWidthIn: 8, beamDepthIn: 24 })).toBe(0.5);
    // Too large -> clamped to hardMax
    expect(clampFieldValue('beam', 'coverEachSideIn', 5.0, { beamWidthIn: 8, beamDepthIn: 24 })).toBe(3.0);
    // Valid -> unchanged
    expect(clampFieldValue('beam', 'coverEachSideIn', 1.5, { beamWidthIn: 8, beamDepthIn: 24 })).toBe(1.5);
  });

  it('fuzz testing: 50 varied parameter sets produce valid finite positive numbers without NaN', () => {
    for (let i = 0; i < 50; i++) {
      const width = 6 + (i % 10) * 2; // 6 to 24 in
      const depth = 12 + (i % 8) * 3; // 12 to 33 in
      const span = 10 + (i % 15); // 10 to 24 ft
      const cover = 0.5 + ((i % 5) * 0.5); // 0.5 to 2.5 in

      const comp: ComponentInstance = {
        id: 'test-beam',
        type: 'beam',
        name: 'Test Beam',
        params: {
          ...BEAM_DEFAULTS,
          beamWidthIn: width,
          beamDepthIn: depth,
          clearSpanFt: span,
          coverEachSideIn: Math.min(cover, width / 2 - 1),
        },
      };

      const rows = computeComponentRows(comp, CORRECTIONS_DEFAULTS);

      for (const row of rows) {
        expect(Number.isFinite(row.totalLenFt)).toBe(true);
        expect(row.totalLenFt).toBeGreaterThan(0);
        expect(Number.isFinite(row.weightKg)).toBe(true);
        expect(row.weightKg).toBeGreaterThan(0);
        expect(Number.isFinite(row.count)).toBe(true);
        expect(row.count).toBeGreaterThan(0);
      }
    }
  });

  it('regression: golden defaults remain intact with roundUp ON', () => {
    useProjectStore.getState().loadSampleProject();
    const state = useProjectStore.getState();
    const result = state.bbsResult;

    const r11 = result.rows.find((r) => r.id === 'R11');
    expect(r11?.count).toBe(11);
    expect(r11?.weightKg).toBeCloseTo(10.797615, 5);

    const b1Total = result.rows
      .filter((r) => r.componentId === 'b1')
      .reduce((sum, r) => sum + r.weightKg, 0);
    expect(b1Total).toBeCloseTo(75.507319, 5);

    expect(result.grandTotalKg).toBeCloseTo(195.654075, 4);
  });
});
