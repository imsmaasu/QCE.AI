import { describe, it, expect } from 'vitest';
import {
  getRowSpanFt,
  calcCountFromSpacing,
  calcSpacingFromCount,
} from '../engine/bbs';
import {
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
} from '../engine/types';

describe('Milestone 2.1 - Test 2: Spacing & Count Linked Property Tests (N=2..30)', () => {
  const spacedRows = [
    { rowId: 'R1', compType: 'footing' as const, params: FOOTING_DEFAULTS, tieSets: 1 },
    { rowId: 'R2', compType: 'footing' as const, params: FOOTING_DEFAULTS, tieSets: 1 },
    { rowId: 'R4', compType: 'column' as const, params: COLUMN_DEFAULTS, tieSets: 2 },
    { rowId: 'R6', compType: 'column' as const, params: COLUMN_DEFAULTS, tieSets: 2 },
    { rowId: 'R10', compType: 'beam' as const, params: BEAM_DEFAULTS, tieSets: 1 },
    { rowId: 'R11', compType: 'beam' as const, params: BEAM_DEFAULTS, tieSets: 1 },
  ];

  for (const { rowId, compType, params, tieSets } of spacedRows) {
    it(`row ${rowId} (${compType}) round-trips correctly for counts N=2..30`, () => {
      const spanFt = getRowSpanFt(rowId, compType, params);
      expect(spanFt).not.toBeNull();
      expect(spanFt!).toBeGreaterThan(0);

      const span = spanFt!;

      // Sweep target count from 2 to 30
      for (let targetCount = 2 * tieSets; targetCount <= 30; targetCount += tieSets) {
        // Back-solve spacing
        const { spacingIn, adjustedCount } = calcSpacingFromCount(span, targetCount, tieSets);
        expect(adjustedCount).toBe(targetCount);
        expect(spacingIn).toBeGreaterThan(0);

        // Forward solve count using the back-solved spacing
        const forward = calcCountFromSpacing(span, spacingIn, tieSets, true);
        expect(forward.count).toBe(targetCount);
      }
    });
  }
});
