import { describe, it, expect } from 'vitest';
import { calcBbs } from '../engine/bbs';
import {
  FOOTING_LEGACY_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
} from '../engine/types';

const TOL_FT = 1e-6;
const TOL_LB = 1e-6;
const TOL_KG = 1e-4;

function approx(a: number, b: number, tol: number, label: string) {
  expect(Math.abs(a - b), `${label}: got ${a}, expected ${b}, diff ${Math.abs(a - b)}`).toBeLessThanOrEqual(tol);
}

describe('BBS Golden Legacy Test (Footing cover each side = 1.5 in)', () => {
  const result = calcBbs(FOOTING_LEGACY_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, {
    roundUpBarCounts: false,
    c2StirrupHooksLikeTies: false,
  });
  const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));

  const golden = [
    { id: 'R1',  count: 13,        straight: 4.75,      hook: 1,      total: 5.75,      totalLen: 74.75,     lbft: 0.666667, lb: 49.833333, kg: 22.604001 },
    { id: 'R2',  count: 11,        straight: 3.75,      hook: 1,      total: 4.75,      totalLen: 52.25,     lbft: 0.666667, lb: 34.833333, kg: 15.800121 },
    { id: 'R3',  count: 8,         straight: 8.791667,  hook: 0.5,    total: 9.291667,  totalLen: 74.333333, lbft: 0.666667, lb: 49.555556, kg: 22.478004 },
    { id: 'R4',  count: 26,        straight: 2.583333,  hook: 0.1875, total: 2.770833,  totalLen: 72.041667, lbft: 0.375,    lb: 27.015625, kg: 12.254071 },
    { id: 'R5',  count: 8,         straight: 10.375,    hook: 0.5,    total: 10.875,    totalLen: 87,        lbft: 0.666667, lb: 58,        kg: 26.308336 },
    { id: 'R6',  count: 42,        straight: 2.583333,  hook: 0.1875, total: 2.770833,  totalLen: 116.375,   lbft: 0.375,    lb: 43.640625, kg: 19.795038 },
    { id: 'R7',  count: 2,         straight: 16.645833, hook: 2,      total: 18.645833, totalLen: 37.291667, lbft: 1.041667, lb: 38.845486, kg: 17.620002 },
    { id: 'R8',  count: 2,         straight: 15.5,      hook: 0,      total: 15.5,      totalLen: 31,        lbft: 1.041667, lb: 32.291667, kg: 14.647242 },
    { id: 'R9',  count: 2,         straight: 16.75,     hook: 2,      total: 18.75,     totalLen: 37.5,      lbft: 1.041667, lb: 39.0625,   kg: 17.718438 },
    { id: 'R10', count: 15,        straight: 4.833333,  hook: 0.9375, total: 5.770833,  totalLen: 86.5625,   lbft: 0.375,    lb: 32.460938, kg: 14.724022 },
    { id: 'R11', count: 10.333333, straight: 4.833333,  hook: 0.9375, total: 5.770833,  totalLen: 59.631944, lbft: 0.375,    lb: 22.361979, kg: 10.143215 },
  ];

  for (const g of golden) {
    it(`${g.id}: count`, () => approx(byId[g.id].count, g.count, TOL_FT, `${g.id} count`));
    it(`${g.id}: straight (ft)`, () => approx(byId[g.id].straightFt, g.straight, TOL_FT, `${g.id} straight`));
    it(`${g.id}: hook (ft)`, () => approx(byId[g.id].hookFt, g.hook, TOL_FT, `${g.id} hook`));
    it(`${g.id}: total per bar (ft)`, () => approx(byId[g.id].totalFt, g.total, TOL_FT, `${g.id} total`));
    it(`${g.id}: totalLen (ft)`, () => approx(byId[g.id].totalLenFt, g.totalLen, TOL_FT, `${g.id} totalLen`));
    it(`${g.id}: unitWeight (lb/ft)`, () => approx(byId[g.id].unitWeightLbPerFt, g.lbft, TOL_LB, `${g.id} lbft`));
    it(`${g.id}: weight (lb)`, () => approx(byId[g.id].weightLb, g.lb, TOL_LB, `${g.id} lb`));
    it(`${g.id}: weight (kg)`, () => approx(byId[g.id].weightKg, g.kg, TOL_KG, `${g.id} kg`));
  }

  it('Grand total matches 194.09249 kg', () => {
    approx(result.grandTotalKg, 194.09249, 0.001, 'grand total kg');
  });

  it('Size totals match legacy', () => {
    const s3 = result.bySize.find((s) => s.barNo === 3)!;
    const s4 = result.bySize.find((s) => s.barNo === 4)!;
    const s5 = result.bySize.find((s) => s.barNo === 5)!;
    approx(s3.weightKg, 56.916346, 0.001, '#3 kg');
    approx(s4.weightKg, 87.190462, 0.001, '#4 kg');
    approx(s5.weightKg, 49.985682, 0.001, '#5 kg');
  });
});
