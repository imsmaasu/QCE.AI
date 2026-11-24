/**
 * Pure TypeScript validation rules and physical limits for civil engineering structural members.
 * Architecture Rule 1: Pure TypeScript. No React, no DOM, no randomness.
 * Architecture Rule 5: Internal units: lengths in decimal feet, bar diameter, spacing and cover in inches.
 */

export interface FieldLimit {
  hardMin: number;
  hardMax: number;
  softMin?: number;
  softMax?: number;
  unit: string;
  helperText?: string;
}

export function getFieldLimits(
  componentType: 'footing' | 'column' | 'beam' | 'rates' | string,
  fieldName: string,
  params: Record<string, unknown>,
): FieldLimit | null {
  switch (componentType) {
    case 'footing': {
      const B_in = (Number(params.B) || 4) * 12;
      const L_in = (Number(params.L) || 4) * 12;
      const minPlanDimIn = Math.min(B_in, L_in);

      if (fieldName === 'coverEachSideIn') {
        const hardMax = Math.max(1, Math.round((minPlanDimIn / 2 - 1.0) * 10) / 10);
        return {
          hardMin: 0.5,
          hardMax,
          softMin: 3.0,
          unit: 'in',
          helperText: `0.5 – ${hardMax} in (soft min 3.0" soil)`,
        };
      }

      if (fieldName === 'B' || fieldName === 'L') {
        return {
          hardMin: 1.0,
          hardMax: 50.0,
          unit: 'ft',
          helperText: '1.0 – 50.0 ft',
        };
      }

      if (fieldName === 'hookFactor') {
        return {
          hardMin: 4,
          hardMax: 30,
          unit: 'd',
          helperText: '4 – 30 dia',
        };
      }

      if (fieldName === 'mainSpacingIn' || fieldName === 'distSpacingIn') {
        return {
          hardMin: 1.0,
          hardMax: 24.0,
          unit: 'in',
          helperText: '1.0 – 24.0 in',
        };
      }

      break;
    }

    case 'column': {
      const colWidthIn = (Number(params.columnWidthFt) || 1) * 12;
      const colDepthIn = (Number(params.columnDepthFt) || 1.5) * 12;
      const minColDimIn = Math.min(colWidthIn, colDepthIn);

      if (fieldName === 'coverEachSideIn') {
        const hardMax = Math.max(1, Math.round((minColDimIn / 2 - 1.0) * 10) / 10);
        return {
          hardMin: 0.5,
          hardMax,
          softMin: 1.5,
          unit: 'in',
          helperText: `0.5 – ${hardMax} in (soft min 1.5")`,
        };
      }

      if (fieldName === 'topCoverIn') {
        const hardMax = Math.max(1, Math.round((colWidthIn / 2 - 1.0) * 10) / 10);
        return {
          hardMin: 0.5,
          hardMax,
          softMin: 1.5,
          unit: 'in',
          helperText: `0.5 – ${hardMax} in (soft min 1.5")`,
        };
      }

      if (fieldName === 'columnWidthFt' || fieldName === 'columnDepthFt') {
        return {
          hardMin: 0.5,
          hardMax: 10.0,
          unit: 'ft',
          helperText: '0.5 – 10.0 ft',
        };
      }

      if (
        fieldName === 'depthGLtoFootingFt' ||
        fieldName === 'plinthAboveGLFt' ||
        fieldName === 'columnHeightAboveFt'
      ) {
        return {
          hardMin: 0.5,
          hardMax: 50.0,
          unit: 'ft',
          helperText: '0.5 – 50.0 ft',
        };
      }

      if (fieldName === 'dowelCount') {
        return {
          hardMin: 4,
          hardMax: 100,
          unit: '',
          helperText: '4 – 100 bars',
        };
      }

      if (fieldName === 'tieSpacingIn') {
        return {
          hardMin: 1.0,
          hardMax: 24.0,
          unit: 'in',
          helperText: '1.0 – 24.0 in',
        };
      }

      if (fieldName === 'tieSetsPerLevel') {
        return {
          hardMin: 1,
          hardMax: 10,
          unit: '',
          helperText: '1 – 10 sets',
        };
      }

      break;
    }

    case 'beam': {
      const beamWidthIn = Number(params.beamWidthIn) || 8;
      const beamDepthIn = Number(params.beamDepthIn) || 24;
      const minSectionDimIn = Math.min(beamWidthIn, beamDepthIn);

      if (fieldName === 'coverEachSideIn') {
        const hardMax = Math.max(1, Math.round((minSectionDimIn / 2 - 1.0) * 10) / 10);
        return {
          hardMin: 0.5,
          hardMax,
          softMin: 1.5,
          unit: 'in',
          helperText: `0.5 – ${hardMax} in (soft min 1.5")`,
        };
      }

      if (fieldName === 'clearSpanFt') {
        return {
          hardMin: 1.0,
          hardMax: 100.0,
          unit: 'ft',
          helperText: '1.0 – 100.0 ft',
        };
      }

      if (fieldName === 'columnWidthFt') {
        return {
          hardMin: 0.5,
          hardMax: 10.0,
          unit: 'ft',
          helperText: '0.5 – 10.0 ft',
        };
      }

      if (fieldName === 'beamWidthIn') {
        return {
          hardMin: 4.0,
          hardMax: 60.0,
          unit: 'in',
          helperText: '4.0 – 60.0 in',
        };
      }

      if (fieldName === 'beamDepthIn') {
        return {
          hardMin: 6.0,
          hardMax: 120.0,
          unit: 'in',
          helperText: '6.0 – 120.0 in',
        };
      }

      if (fieldName === 'topBarCount' || fieldName === 'bottomBarCount') {
        return {
          hardMin: 2,
          hardMax: 20,
          unit: '',
          helperText: '2 – 20 bars',
        };
      }

      if (fieldName === 'extraBottomBarCount') {
        return {
          hardMin: 0,
          hardMax: 20,
          unit: '',
          helperText: '0 – 20 bars',
        };
      }

      if (fieldName === 'stirrupSpacingEndIn' || fieldName === 'stirrupSpacingMidIn') {
        return {
          hardMin: 1.0,
          hardMax: 24.0,
          unit: 'in',
          helperText: '1.0 – 24.0 in',
        };
      }

      break;
    }
  }

  return null;
}

export function clampFieldValue(
  componentType: string,
  fieldName: string,
  value: number,
  params: Record<string, unknown>,
): number {
  const limits = getFieldLimits(componentType, fieldName, params);
  if (!limits) return value;
  if (isNaN(value)) return limits.hardMin;
  return Math.min(limits.hardMax, Math.max(limits.hardMin, value));
}
