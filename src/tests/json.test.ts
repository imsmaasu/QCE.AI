import { describe, it, expect } from 'vitest';
import { ProjectState, FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS } from '../engine/types';
import { computeProjectBbs } from '../engine/bbs';

describe('Project JSON Serialization & Round Trip', () => {
  const sampleProject: ProjectState = {
    schemaVersion: 2,
    name: 'Hospital Building BBS',
    settings: {
      corrections: {
        roundUpBarCounts: true,
        c2StirrupHooksLikeTies: false,
      },
    },
    theme: 'dark',
    components: [
      {
        id: 'f1',
        type: 'footing',
        name: 'Footing F1',
        params: { ...FOOTING_DEFAULTS, B: 6 },
        rowOverrides: {
          R1: { count: 18, straightFt: 5.2 },
        },
        customRows: [
          {
            id: 'c-1',
            description: 'Custom Bar',
            shape: 'u',
            barNo: 5,
            spacingIn: 8,
            count: 6,
            straightFt: 4,
            hookFt: 1,
            remarks: 'Special dowel',
          },
        ],
        hiddenRows: ['R2'],
      },
      {
        id: 'c1',
        type: 'column',
        name: 'Column C1',
        params: { ...COLUMN_DEFAULTS },
        rowOverrides: {},
        customRows: [],
        hiddenRows: [],
      },
      {
        id: 'b1',
        type: 'beam',
        name: 'Beam B1',
        params: { ...BEAM_DEFAULTS },
        rowOverrides: {},
        customRows: [],
        hiddenRows: [],
      },
      {
        id: 'rates-1',
        type: 'rates',
        name: 'Cost Rates',
        params: {
          steelRateRs: 280,
          laborRateRs: 35,
          wastagePercent: 3,
        },
        rowOverrides: {},
        customRows: [],
        hiddenRows: [],
      },
    ],
  };

  it('serializes to JSON and deserializes back faithfully', () => {
    const jsonStr = JSON.stringify(sampleProject, null, 2);
    const restored: ProjectState = JSON.parse(jsonStr);

    expect(restored.schemaVersion).toBe(2);
    expect(restored.name).toBe('Hospital Building BBS');
    expect(restored.theme).toBe('dark');
    expect(restored.settings.corrections.roundUpBarCounts).toBe(true);
    expect(restored.components.length).toBe(4);

    const f1 = restored.components.find((c) => c.id === 'f1')!;
    expect(f1).toBeDefined();
    expect(f1.rowOverrides?.['R1'].count).toBe(18);
    expect(f1.rowOverrides?.['R1'].straightFt).toBe(5.2);
    expect(f1.customRows?.length).toBe(1);
    expect(f1.customRows?.[0].description).toBe('Custom Bar');
    expect(f1.hiddenRows).toContain('R2');

    // BBS computed from restored matches original
    const originalBbs = computeProjectBbs(sampleProject);
    const restoredBbs = computeProjectBbs(restored);
    expect(restoredBbs.grandTotalKg).toBeCloseTo(originalBbs.grandTotalKg, 5);
  });
});
