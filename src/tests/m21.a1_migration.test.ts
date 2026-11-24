import { describe, it, expect } from 'vitest';
import { useProjectStore, migrateToV3, SCHEMA_VERSION } from '../store/projectStore';
import { computeProjectBbs } from '../engine/bbs';

describe('Milestone 2.1 - Test 1: A1 Numbers & Migration', () => {
  it('fresh sample project produces exact A1 specification numbers', () => {
    useProjectStore.getState().loadSampleProject();
    const state = useProjectStore.getState();

    // Verify roundUpBarCounts is true by default
    expect(state.settings.corrections.roundUpBarCounts).toBe(true);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);

    const r11 = state.bbsResult.rows.find((r) => r.id === 'R11')!;
    expect(r11.count).toBe(11);
    expect(Math.abs(r11.weightKg - 10.797615)).toBeLessThan(1e-5);
    expect(Math.abs(r11.weightLb - 23.804688)).toBeLessThan(1e-5);
    expect(Math.abs(r11.totalLenFt - 63.479167)).toBeLessThan(1e-4);

    // Beam B1 total
    const b1Rows = state.bbsResult.rows.filter((r) => r.componentId === 'b1');
    const b1TotalKg = b1Rows.reduce((sum, r) => sum + r.weightKg, 0);
    expect(Math.abs(b1TotalKg - 75.507319)).toBeLessThan(1e-4);

    // Project Grand Total
    expect(Math.abs(state.bbsResult.grandTotalKg - 195.654075)).toBeLessThan(1e-4);
  });

  it('migrates schemaVersion 2 project JSON to schemaVersion 3 with roundUpBarCounts = true and populated bars', () => {
    const v2Json = {
      schemaVersion: 2,
      name: 'Legacy V2 Project',
      settings: {
        corrections: {
          roundUpBarCounts: false, // Old state had it false
          c2StirrupHooksLikeTies: false,
        },
      },
      theme: 'dark',
      components: [
        {
          id: 'f1',
          type: 'footing',
          name: 'Footing F1',
          params: {
            B: 4,
            L: 5,
            coverEachSideIn: 0.75,
            mainBarNo: 4,
            mainSpacingIn: 4,
            distBarNo: 4,
            distSpacingIn: 6,
            hookRule: 'multiple_of_dia',
            hookFactor: 12,
            fixedHookIn: 6,
          },
          rowOverrides: {},
          customRows: [],
          hiddenRows: [],
        },
      ],
    };

    const migrated = migrateToV3(v2Json);

    // Must bump to schemaVersion 3 and force roundUpBarCounts = true
    expect(migrated.settings.corrections.roundUpBarCounts).toBe(true);
    expect(migrated.components[0].bars).toBeDefined();
    expect(migrated.components[0].bars!.length).toBe(2);
    expect(migrated.components[0].bars![0].id).toBe('R1');
    expect(migrated.components[0].bars![1].id).toBe('R2');

    // BBS computed from migrated project
    const bbs = computeProjectBbs({
      schemaVersion: 3,
      name: migrated.name,
      settings: migrated.settings,
      theme: 'dark',
      components: migrated.components,
    });

    expect(bbs.rows.length).toBe(2);
    expect(bbs.rows[0].count).toBe(13);
    expect(bbs.rows[1].count).toBe(11);
  });
});
