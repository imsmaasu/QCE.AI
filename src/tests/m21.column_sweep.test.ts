import { describe, it, expect } from 'vitest';
import {
  getRowSpanFt,
  calcCountFromSpacing,
  roundUp,
} from '../engine/bbs';
import { COLUMN_DEFAULTS, ColumnInputs } from '../engine/types';

describe('Milestone 2.1 - Test 3: Column Height Sweep Test', () => {
  it('tie count strictly matches 2 x ceil((h - 0.5 - 0.125)/0.5 + 1) for h=10.0..12.0 ft in 0.1 ft steps', () => {
    const spacingIn = 6; // 0.5 ft
    const tieSets = 2;

    for (let h10 = 100; h10 <= 120; h10 += 1) {
      const h = h10 / 10;
      const params: ColumnInputs = {
        ...COLUMN_DEFAULTS,
        columnHeightAboveFt: h,
        firstTieOffsetFt: 0.5,
        topCoverIn: 1.5, // 0.125 ft
      };

      const spanFt = getRowSpanFt('R6', 'column', params)!;
      const expectedSpan = h - 0.5 - 0.125;
      expect(Math.abs(spanFt - expectedSpan)).toBeLessThan(1e-9);

      // Specification formula: 2 * ceil((h - 0.5 - 0.125)/0.5 + 1)
      const expectedLevels = roundUp(expectedSpan / 0.5 + 1);
      const expectedCount = tieSets * expectedLevels;

      // Engine calculation
      const res = calcCountFromSpacing(spanFt, spacingIn, tieSets, true);
      expect(res.count).toBe(expectedCount);
    }
  });
});
