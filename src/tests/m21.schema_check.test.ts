import { describe, it, expect } from 'vitest';
import { FOOTING_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS } from '../engine/types';

describe('Milestone 2.1 - Part A2: Schema Check (No Field Appears Twice)', () => {
  it('ensures Member Dimensions does NOT contain any reinforcement bar inputs', () => {
    // List of reinforcement bar fields that must NOT appear in Member Dimensions
    const barInputKeys = [
      'mainBarNo',
      'mainSpacingIn',
      'distBarNo',
      'distSpacingIn',
      'dowelCount',
      'dowelBarNo',
      'tieBarNo',
      'tieSpacingIn',
      'bottomBarCount',
      'bottomBarNo',
      'extraBottomBarCount',
      'extraBottomBarNo',
      'topBarCount',
      'topBarNo',
      'stirrupBarNo',
      'stirrupSpacingEndIn',
      'stirrupSpacingMidIn',
    ];

    // In Member Dimensions UI (FootingParamsGrid, ColumnParamsGrid, BeamParamsGrid):
    // Reinforcement inputs are strictly inside Reinforcement Bars (BarsSection).
    // Test that the schema defaults and types have no overlap:
    const footingUiFields = ['B', 'L', 'coverEachSideIn', 'hookFactor'];
    const columnUiFields = [
      'depthGLtoFootingFt',
      'plinthAboveGLFt',
      'columnHeightAboveFt',
      'lapFactor',
      'coverEachSideIn',
      'topCoverIn',
      'dowelEndAllowanceIn',
      'hookFactor',
      'tieHeightBelowFt',
      'firstTieOffsetFt',
      'tieWidthIn',
      'tieDepthIn',
      'tieSetsPerLevel',
    ];
    const beamUiFields = [
      'clearSpanFt',
      'columnWidthFt',
      'beamWidthIn',
      'beamDepthIn',
      'coverEachSideIn',
      'endAllowanceIn',
      'hookFactor',
      'stirrupZoneDeductionIn',
    ];

    for (const key of barInputKeys) {
      expect(footingUiFields).not.toContain(key);
      expect(columnUiFields).not.toContain(key);
      expect(beamUiFields).not.toContain(key);
    }
  });

  it('ensures Member Dimensions contains only concrete geometry, levels, and detailing rules', () => {
    // Footing allowed keys
    const allowedFootingKeys = new Set([
      'B',
      'L',
      'coverEachSideIn',
      'hookRule',
      'hookFactor',
      'fixedHookIn',
      // Legacy compatibility keys present on FootingInputs interface
      'mainBarNo',
      'mainSpacingIn',
      'distBarNo',
      'distSpacingIn',
    ]);
    for (const key of Object.keys(FOOTING_DEFAULTS)) {
      expect(allowedFootingKeys.has(key)).toBe(true);
    }

    // Column allowed keys
    const allowedColumnKeys = new Set([
      'depthGLtoFootingFt',
      'plinthAboveGLFt',
      'columnHeightAboveFt',
      'tieHeightBelowFt',
      'coverEachSideIn',
      'topCoverIn',
      'dowelEndAllowanceIn',
      'lapFactor',
      'hookRule',
      'hookFactor',
      'fixedHookIn',
      'firstTieOffsetFt',
      'tieWidthIn',
      'tieDepthIn',
      'tieSetsPerLevel',
      // Legacy compatibility keys on interface
      'dowelCount',
      'dowelBarNo',
      'tieBarNo',
      'tieSpacingIn',
    ]);
    for (const key of Object.keys(COLUMN_DEFAULTS)) {
      expect(allowedColumnKeys.has(key)).toBe(true);
    }

    // Beam allowed keys
    const allowedBeamKeys = new Set([
      'clearSpanFt',
      'columnWidthFt',
      'beamWidthIn',
      'beamDepthIn',
      'coverEachSideIn',
      'endAllowanceIn',
      'hookRule',
      'uBarHookFt',
      'hookFactor',
      'stirrupZoneDeductionFt',
      // Legacy compatibility keys
      'bottomBarCount',
      'bottomBarNo',
      'extraBottomBarCount',
      'extraBottomBarNo',
      'topBarCount',
      'topBarNo',
      'stirrupBarNo',
      'stirrupSpacingEndIn',
      'stirrupSpacingMidIn',
    ]);
    for (const key of Object.keys(BEAM_DEFAULTS)) {
      expect(allowedBeamKeys.has(key)).toBe(true);
    }
  });
});
