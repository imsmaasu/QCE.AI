import { describe, it, expect } from 'vitest';
import { calcFooting, calcColumn, calcBeam } from '../engine/bbs';
import {
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  CORRECTIONS_DEFAULTS,
} from '../engine/types';

describe('Parameter Dependency Tests', () => {
  describe('Footing Parameter Dependencies', () => {
    it('changing B updates R1 count and R2 straight, leaves others intact', () => {
      const base = calcFooting(FOOTING_DEFAULTS);
      const modified = calcFooting({ ...FOOTING_DEFAULTS, B: 6 });

      expect(modified[0].count).not.toBe(base[0].count); // R1 count changes
      expect(modified[1].straightFt).not.toBe(base[1].straightFt); // R2 straight changes

      // R1 straight and R2 count remain untouched
      expect(modified[0].straightFt).toBe(base[0].straightFt);
      expect(modified[1].count).toBe(base[1].count);
    });

    it('changing L updates R2 count and R1 straight', () => {
      const base = calcFooting(FOOTING_DEFAULTS);
      const modified = calcFooting({ ...FOOTING_DEFAULTS, L: 8 });

      expect(modified[1].count).not.toBe(base[1].count); // R2 count changes
      expect(modified[0].straightFt).not.toBe(base[0].straightFt); // R1 straight changes

      expect(modified[1].straightFt).toBe(base[1].straightFt);
      expect(modified[0].count).toBe(base[0].count);
    });

    it('changing coverEachSideIn updates both R1 and R2 straight length and count', () => {
      const base = calcFooting(FOOTING_DEFAULTS);
      const modified = calcFooting({ ...FOOTING_DEFAULTS, coverEachSideIn: 1.5 });

      expect(modified[0].straightFt).not.toBe(base[0].straightFt);
      expect(modified[1].straightFt).not.toBe(base[1].straightFt);
    });

    it('changing mainSpacingIn updates only R1 count', () => {
      const base = calcFooting(FOOTING_DEFAULTS);
      const modified = calcFooting({ ...FOOTING_DEFAULTS, mainSpacingIn: 8 });

      expect(modified[0].count).not.toBe(base[0].count);
      expect(modified[1].count).toBe(base[1].count);
    });
  });

  describe('Column Parameter Dependencies', () => {
    it('changing depthGLtoFootingFt updates only R3 straight', () => {
      const base = calcColumn(COLUMN_DEFAULTS, CORRECTIONS_DEFAULTS);
      const modified = calcColumn({ ...COLUMN_DEFAULTS, depthGLtoFootingFt: 7 }, CORRECTIONS_DEFAULTS);

      expect(modified[0].straightFt).not.toBe(base[0].straightFt); // R3
      expect(modified[1].straightFt).toBe(base[1].straightFt);     // R4 unchanged
      expect(modified[2].straightFt).toBe(base[2].straightFt);     // R5 unchanged
      expect(modified[3].straightFt).toBe(base[3].straightFt);     // R6 unchanged
    });

    it('changing tieWidthIn updates R4 and R6 straight, leaves R3 and R5 unchanged', () => {
      const base = calcColumn(COLUMN_DEFAULTS, CORRECTIONS_DEFAULTS);
      const modified = calcColumn({ ...COLUMN_DEFAULTS, tieWidthIn: 6 }, CORRECTIONS_DEFAULTS);

      expect(modified[0].straightFt).toBe(base[0].straightFt);     // R3 unchanged
      expect(modified[1].straightFt).not.toBe(base[1].straightFt); // R4 changed
      expect(modified[2].straightFt).toBe(base[2].straightFt);     // R5 unchanged
      expect(modified[3].straightFt).not.toBe(base[3].straightFt); // R6 changed
    });
  });

  describe('Beam Parameter Dependencies', () => {
    it('changing columnWidthFt updates R7 and R9 straight, leaves R8 and stirrups unchanged', () => {
      const base = calcBeam(BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
      const modified = calcBeam({ ...BEAM_DEFAULTS, columnWidthFt: 2.0 }, CORRECTIONS_DEFAULTS);

      expect(modified[0].straightFt).not.toBe(base[0].straightFt); // R7 changed
      expect(modified[1].straightFt).toBe(base[1].straightFt);     // R8 unchanged
      expect(modified[2].straightFt).not.toBe(base[2].straightFt); // R9 changed
      expect(modified[3].straightFt).toBe(base[3].straightFt);     // R10 straight unchanged
    });

    it('changing beamDepthIn updates only R10 and R11 straight', () => {
      const base = calcBeam(BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
      const modified = calcBeam({ ...BEAM_DEFAULTS, beamDepthIn: 30 }, CORRECTIONS_DEFAULTS);

      expect(modified[0].straightFt).toBe(base[0].straightFt);     // R7 unchanged
      expect(modified[1].straightFt).toBe(base[1].straightFt);     // R8 unchanged
      expect(modified[2].straightFt).toBe(base[2].straightFt);     // R9 unchanged
      expect(modified[3].straightFt).not.toBe(base[3].straightFt); // R10 changed
      expect(modified[4].straightFt).not.toBe(base[4].straightFt); // R11 changed
    });

    it('changing stirrupZoneDeductionFt updates R10 and R11 count', () => {
      const base = calcBeam(BEAM_DEFAULTS, CORRECTIONS_DEFAULTS);
      const modified = calcBeam({ ...BEAM_DEFAULTS, stirrupZoneDeductionFt: 2.5 }, CORRECTIONS_DEFAULTS);

      expect(modified[3].count).not.toBe(base[3].count); // R10 changed
      expect(modified[4].count).not.toBe(base[4].count); // R11 changed
    });
  });
});
