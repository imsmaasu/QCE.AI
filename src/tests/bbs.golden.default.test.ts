import { describe, it, expect } from 'vitest';
import { calcBbs } from '../engine/bbs';
import {
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  CORRECTIONS_DEFAULTS,
} from '../engine/types';

const TOL_FT = 1e-6;
const TOL_LB = 1e-6;
const TOL_KG = 1e-4;

function approx(a: number, b: number, tol: number, label: string) {
  expect(Math.abs(a - b), `${label}: got ${a}, expected ${b}, diff ${Math.abs(a - b)}`).toBeLessThanOrEqual(tol);
}

describe('BBS Golden Default Test (Footing cover each side = 0.75 in)', () => {
  const result = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
  const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));

  it('R1 (Main bars): count 13, straight 4.875, hook 1, total 5.875, total length 76.375, lb 50.916667, kg 23.095393', () => {
    const r1 = byId['R1'];
    approx(r1.count, 13, TOL_FT, 'R1 count');
    approx(r1.straightFt, 4.875, TOL_FT, 'R1 straight');
    approx(r1.hookFt, 1.0, TOL_FT, 'R1 hook');
    approx(r1.totalFt, 5.875, TOL_FT, 'R1 total');
    approx(r1.totalLenFt, 76.375, TOL_FT, 'R1 totalLen');
    approx(r1.weightLb, 50.916667, TOL_LB, 'R1 lb');
    approx(r1.weightKg, 23.095393, TOL_KG, 'R1 kg');
  });

  it('R2 (Dist bars): count 11, straight 3.875, hook 1, total 4.875, total length 53.625, lb 35.75, kg 16.215914', () => {
    const r2 = byId['R2'];
    approx(r2.count, 11, TOL_FT, 'R2 count');
    approx(r2.straightFt, 3.875, TOL_FT, 'R2 straight');
    approx(r2.hookFt, 1.0, TOL_FT, 'R2 hook');
    approx(r2.totalFt, 4.875, TOL_FT, 'R2 total');
    approx(r2.totalLenFt, 53.625, TOL_FT, 'R2 totalLen');
    approx(r2.weightLb, 35.75, TOL_LB, 'R2 lb');
    approx(r2.weightKg, 16.215914, TOL_KG, 'R2 kg');
  });

  it('Size #4 total equals 88.097647 kg', () => {
    const s4 = result.bySize.find((s) => s.barNo === 4)!;
    approx(s4.weightKg, 88.097647, TOL_KG, '#4 total kg');
  });

  it('Size #3 total equals 57.570746 kg', () => {
    const s3 = result.bySize.find((s) => s.barNo === 3)!;
    approx(s3.weightKg, 57.570746, TOL_KG, '#3 total kg');
  });

  it('Size #5 total equals 49.985682 kg', () => {
    const s5 = result.bySize.find((s) => s.barNo === 5)!;
    approx(s5.weightKg, 49.985682, TOL_KG, '#5 total kg');
  });

  it('Grand total equals 195.654075 kg', () => {
    approx(result.grandTotalKg, 195.654075, TOL_KG, 'grand total kg');
  });

  it('R11 matches new rounded expectations: count 11, total length 63.479167 ft, lb 23.804688, kg 10.797615', () => {
    const r11 = byId['R11'];
    approx(r11.count, 11, TOL_FT, 'R11 count');
    approx(r11.totalLenFt, 63.479167, TOL_FT, 'R11 totalLen');
    approx(r11.weightLb, 23.804688, TOL_LB, 'R11 lb');
    approx(r11.weightKg, 10.797615, TOL_KG, 'R11 kg');
  });

  it('R3 through R10 remain exact match to specification', () => {
    approx(byId['R3'].weightKg, 22.478004, TOL_KG, 'R3 kg');
    approx(byId['R4'].weightKg, 12.254071, TOL_KG, 'R4 kg');
    approx(byId['R5'].weightKg, 26.308336, TOL_KG, 'R5 kg');
    approx(byId['R6'].weightKg, 19.795038, TOL_KG, 'R6 kg');
    approx(byId['R7'].weightKg, 17.620002, TOL_KG, 'R7 kg');
    approx(byId['R8'].weightKg, 14.647242, TOL_KG, 'R8 kg');
    approx(byId['R9'].weightKg, 17.718438, TOL_KG, 'R9 kg');
    approx(byId['R10'].weightKg, 14.724022, TOL_KG, 'R10 kg');
  });
});
