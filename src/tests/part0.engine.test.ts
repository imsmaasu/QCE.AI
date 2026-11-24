import { describe, it, expect } from 'vitest';
import { calcBbs, computeProjectBbs } from '../engine/bbs';
import { getAuditNotes } from '../engine/audit';
import {
  FOOTING_DEFAULTS,
  FOOTING_LEGACY_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  CORRECTIONS_DEFAULTS,
  ProjectState,
} from '../engine/types';

const TOL_FT = 1e-6;
const TOL_LB = 1e-6;
const TOL_KG = 1e-4;

function approx(a: number, b: number, tol: number, label: string) {
  expect(Math.abs(a - b), `${label}: got ${a}, expected ${b}, diff ${Math.abs(a - b)}`).toBeLessThanOrEqual(tol);
}

describe('Milestone 2 - Part 0 Engine Requirements', () => {
  it('New default expectations (cover 0.75 in, round up ON)', () => {
    expect(CORRECTIONS_DEFAULTS.roundUpBarCounts).toBe(true);

    const res = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
    const byId = Object.fromEntries(res.rows.map((r) => [r.id, r]));

    // R11 expectations
    const r11 = byId['R11'];
    expect(r11.count).toBe(11);
    approx(r11.totalLenFt, 63.479167, TOL_FT, 'R11 total length');
    approx(r11.weightLb, 23.804688, TOL_LB, 'R11 lb');
    approx(r11.weightKg, 10.797615, TOL_KG, 'R11 kg');

    // Summary by size
    const s3 = res.bySize.find((s) => s.barNo === 3)!;
    const s4 = res.bySize.find((s) => s.barNo === 4)!;
    const s5 = res.bySize.find((s) => s.barNo === 5)!;

    approx(s3.weightKg, 57.570746, TOL_KG, 'size #3 total kg');
    approx(s4.weightKg, 88.097647, TOL_KG, 'size #4 total kg');
    approx(s5.weightKg, 49.985682, TOL_KG, 'size #5 total kg');

    // Grand total
    approx(res.grandTotalKg, 195.654075, TOL_KG, 'grand total kg');

    // Audit notes: info note "Rounded up from 10.33 to 11", no "non-integer count" note
    const notes = getAuditNotes(res);
    const roundNote = notes.find((n) => n.id === 'round-up-R11');
    expect(roundNote).toBeDefined();
    expect(roundNote?.severity).toBe('info');
    expect(roundNote?.text).toBe('Rounded up from 10.33 to 11');

    const nonIntNote = notes.find((n) => n.text.toLowerCase().includes('non-integer'));
    expect(nonIntNote).toBeUndefined();
  });

  it('Sir legacy test (round up OFF, cover 1.5 in) still gives 194.09249 kg', () => {
    const res = calcBbs(FOOTING_LEGACY_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, {
      roundUpBarCounts: false,
      c2StirrupHooksLikeTies: false,
    });

    approx(res.grandTotalKg, 194.09249, 0.001, 'legacy grand total kg');
    const r11 = res.rows.find((r) => r.id === 'R11')!;
    approx(r11.count, 10.333333, 1e-4, 'legacy R11 count');
  });

  it('Overridden counts must be whole numbers (validation)', () => {
    const project: ProjectState = {
      schemaVersion: 2,
      name: 'Whole Number Overrides Test',
      theme: 'light',
      settings: { corrections: { ...CORRECTIONS_DEFAULTS } },
      components: [
        {
          id: 'b1',
          type: 'beam',
          name: 'Beam B1',
          params: { ...BEAM_DEFAULTS },
          rowOverrides: {
            R11: { count: 12.7 }, // non-integer override attempted
          },
          customRows: [
            {
              id: 'c1',
              description: 'Custom bar',
              shape: 'straight',
              barNo: 4,
              spacingIn: null,
              count: 4.4, // non-integer custom count attempted
              straightFt: 10,
              hookFt: 0,
              remarks: '',
            },
          ],
          hiddenRows: [],
        },
      ],
    };

    const res = computeProjectBbs(project);
    const r11 = res.rows.find((r) => r.id === 'R11')!;
    expect(Number.isInteger(r11.count)).toBe(true);
    expect(r11.count).toBe(13); // 12.7 rounded to whole number 13

    const custom = res.rows.find((r) => r.id === 'c1')!;
    expect(Number.isInteger(custom.count)).toBe(true);
    expect(custom.count).toBe(4); // 4.4 rounded to whole number 4
  });
});
