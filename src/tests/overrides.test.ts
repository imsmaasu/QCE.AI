import { describe, it, expect } from 'vitest';
import { computeComponentRows } from '../engine/bbs';
import {
  ComponentInstance,
  FOOTING_DEFAULTS,
  CORRECTIONS_DEFAULTS,
} from '../engine/types';

describe('Row Overrides, Custom Rows, and Row Deletion Tests', () => {
  const baseFootingComp: ComponentInstance = {
    id: 'f1',
    type: 'footing',
    name: 'Footing F1',
    params: { ...FOOTING_DEFAULTS },
    rowOverrides: {},
    customRows: [],
    hiddenRows: [],
  };

  it('an overridden count value survives parameter changes', () => {
    // Override R1 count to 20
    const comp: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { count: 20 },
      },
    };

    const rows1 = computeComponentRows(comp, CORRECTIONS_DEFAULTS);
    expect(rows1[0].count).toBe(20);
    expect(rows1[0].isOverridden).toBe(true);

    // Now change B parameter (which normally computes count)
    const compWithNewB: ComponentInstance = {
      ...comp,
      params: { ...comp.params, B: 8 } as typeof FOOTING_DEFAULTS,
    };
    const rows2 = computeComponentRows(compWithNewB, CORRECTIONS_DEFAULTS);
    // Count should still remain 20!
    expect(rows2[0].count).toBe(20);
    // But straight should update according to parameter
    expect(rows2[1].straightFt).toBe(8 - 2 * 0.75 / 12);
  });

  it('clearing/resetting the override restores the computed value', () => {
    const compWithOverride: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { count: 99 },
      },
    };
    expect(computeComponentRows(compWithOverride, CORRECTIONS_DEFAULTS)[0].count).toBe(99);

    // Reset override
    const compReset: ComponentInstance = {
      ...compWithOverride,
      rowOverrides: {},
    };
    expect(computeComponentRows(compReset, CORRECTIONS_DEFAULTS)[0].count).toBe(13);
  });

  it('adding custom rows includes them in the output and totals', () => {
    const compWithCustom: ComponentInstance = {
      ...baseFootingComp,
      customRows: [
        {
          id: 'custom-1',
          description: 'Corner reinforcement',
          shape: 'L',
          barNo: 4,
          spacingIn: null,
          count: 4,
          straightFt: 3,
          hookFt: 1,
          remarks: 'Extra corner tie',
        },
      ],
    };

    const rows = computeComponentRows(compWithCustom, CORRECTIONS_DEFAULTS);
    expect(rows.length).toBe(3); // R1, R2, and custom-1
    const custom = rows.find((r) => r.id === 'custom-1')!;
    expect(custom).toBeDefined();
    expect(custom.isCustom).toBe(true);
    expect(custom.totalFt).toBe(4);
    expect(custom.totalLenFt).toBe(16);
  });

  it('deleting (hiding) a row excludes it from output', () => {
    const compWithHidden: ComponentInstance = {
      ...baseFootingComp,
      hiddenRows: ['R2'],
    };

    const rows = computeComponentRows(compWithHidden, CORRECTIONS_DEFAULTS);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('R1');
  });

  it('duplicating a component creates an independent instance', () => {
    const original: ComponentInstance = {
      ...baseFootingComp,
      id: 'f1',
      name: 'Footing F1',
      rowOverrides: { R1: { count: 18 } },
    };

    const copy: ComponentInstance = {
      ...original,
      id: 'f2',
      name: 'Footing F2',
      rowOverrides: { ...original.rowOverrides },
    };

    // Modify copy
    copy.rowOverrides = { R1: { count: 25 } };

    const origRows = computeComponentRows(original, CORRECTIONS_DEFAULTS);
    const copyRows = computeComponentRows(copy, CORRECTIONS_DEFAULTS);

    expect(origRows[0].count).toBe(18);
    expect(copyRows[0].count).toBe(25);
  });

  it('overriding spacing reactively updates bar count immediately', () => {
    // Footing B = 4 ft, cover deduction = 0.125 ft. Net span = 3.875 ft.
    // Default spacing = 4 in (0.3333 ft) -> count = ROUNDUP(3.875/0.3333 + 1) = 13.
    // When spacing is increased to 6 in (0.5 ft): count = ROUNDUP(3.875/0.5 + 1) = ROUNDUP(7.75 + 1) = 9.
    const compWithSpacingOverride: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { spacingIn: 6 },
      },
    };

    const rows = computeComponentRows(compWithSpacingOverride, CORRECTIONS_DEFAULTS);
    expect(rows[0].spacingIn).toBe(6);
    expect(rows[0].count).toBe(9);

    // When spacing is increased to 12 in (1 ft): count = ROUNDUP(3.875/1 + 1) = ROUNDUP(4.875) = 5.
    const compWith12InSpacing: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { spacingIn: 12 },
      },
    };
    const rows12 = computeComponentRows(compWith12InSpacing, CORRECTIONS_DEFAULTS);
    expect(rows12[0].count).toBe(5);
  });

  it('overriding hookOption computes hook length from bar diameter', () => {
    // #4 bar (d = 0.5 in). 12d hook = 12 * 0.5 / 12 = 0.5 ft.
    const compWith12dHook: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { hookOption: '12d' },
      },
    };
    const rows = computeComponentRows(compWith12dHook, CORRECTIONS_DEFAULTS);
    expect(rows[0].hookFt).toBe(0.5);

    // Switch bar to #8 bar (d = 1.0 in). 12d hook = 12 * 1.0 / 12 = 1.0 ft.
    const compWith8Bar12dHook: ComponentInstance = {
      ...baseFootingComp,
      rowOverrides: {
        R1: { barNo: 8, hookOption: '12d' },
      },
    };
    const rows8 = computeComponentRows(compWith8Bar12dHook, CORRECTIONS_DEFAULTS);
    expect(rows8[0].hookFt).toBe(1.0);
  });
});
