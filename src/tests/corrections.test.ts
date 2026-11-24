import { describe, it, expect } from 'vitest';
import { calcBbs } from '../engine/bbs';
import { getAuditFlags } from '../engine/audit';
import {
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  CORRECTIONS_DEFAULTS,
} from '../engine/types';

describe('Corrections and Audit Tests', () => {
  it('default mode rounds up bar counts to whole numbers and adds rounded note', () => {
    const res = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
    const flags = getAuditFlags(res);

    // R11 has count 11 (rounded up from 10.333333)
    const r11 = res.rows.find((r) => r.id === 'R11')!;
    expect(r11.hasNonIntegerCount).toBe(false);
    expect(r11.count).toBe(11);

    // Info audit flag for rounded count is present
    const roundNote = flags.find((f) => f.id === 'round-up-R11');
    expect(roundNote).toBeDefined();
    expect(roundNote?.severity).toBe('info');
    expect(roundNote?.text).toBe('Rounded up from 10.33 to 11');
  });

  it('setting roundUpBarCounts: false preserves raw non-integer counts (Sir legacy)', () => {
    const res = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, {
      roundUpBarCounts: false,
      c2StirrupHooksLikeTies: false,
    });

    const r10 = res.rows.find((r) => r.id === 'R10')!;
    const r11 = res.rows.find((r) => r.id === 'R11')!;
    expect(r10.count).toBe(15);
    expect(Math.abs(r11.count - 10.333333)).toBeLessThan(1e-5);
    expect(r11.hasNonIntegerCount).toBe(true);

    const flags = getAuditFlags(res);
    expect(flags.find((f) => f.id === 'round-up-R11')).toBeUndefined();
  });

  it('C2 modifies stirrup hook lengths to use tie bend rules', () => {
    const resSir = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
    const resC2 = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, {
      roundUpBarCounts: true,
      c2StirrupHooksLikeTies: true,
    });

    const r10Sir = resSir.rows.find((r) => r.id === 'R10')!;
    const r10C2 = resC2.rows.find((r) => r.id === 'R10')!;

    expect(r10Sir.hookFt).toBe(0.9375);
    // Under C2, bend deduction is applied
    expect(r10C2.hookFt).toBeLessThan(r10Sir.hookFt);
  });

  it('Audit flags A3 through A8 are all present', () => {
    const res = calcBbs(FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
    const flags = getAuditFlags(res);
    const ids = ['A3', 'A4', 'A5', 'A6', 'A7', 'A8'];
    for (const id of ids) {
      expect(flags.find((f) => f.id === id)).toBeDefined();
    }
  });
});
