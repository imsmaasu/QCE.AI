import { describe, it, expect } from 'vitest';
import { VERSIONS } from '../data/versions';

describe('Version History Data', () => {
  it('has exactly 8 versions', () => {
    expect(VERSIONS).toHaveLength(8);
  });

  it('has exactly 1 present version', () => {
    const present = VERSIONS.filter((v) => v.status === 'present');
    expect(present).toHaveLength(1);
  });

  it('present version is v0.4', () => {
    const present = VERSIONS.find((v) => v.status === 'present');
    expect(present?.version).toBe('v0.4');
    expect(present?.label).toBe('Polish');
  });

  it('has 3 past versions (v0.1, v0.2, v0.3)', () => {
    const past = VERSIONS.filter((v) => v.status === 'past');
    expect(past).toHaveLength(3);
    expect(past.map((v) => v.version)).toEqual(['v0.1', 'v0.2', 'v0.3']);
  });

  it('has 4 future versions (v0.5–v1.0)', () => {
    const future = VERSIONS.filter((v) => v.status === 'future');
    expect(future).toHaveLength(4);
    expect(future[0].version).toBe('v0.5');
    expect(future[3].version).toBe('v1.0');
  });

  it('every version has non-empty version, label, date, summary and features', () => {
    for (const v of VERSIONS) {
      expect(v.version.length).toBeGreaterThan(0);
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.date.length).toBeGreaterThan(0);
      expect(v.summary.length).toBeGreaterThan(0);
      expect(v.features.length).toBeGreaterThan(0);
    }
  });

  it('present version (v0.4) mentions key delivered features', () => {
    const v04 = VERSIONS.find((v) => v.version === 'v0.4')!;
    const featureText = v04.features.join(' ');
    expect(featureText).toContain('Textbook');
    expect(featureText).toContain('Site Working Drawing');
    expect(featureText).toContain('Labels ON/OFF');
    expect(featureText).toContain('Version History');
  });

  it('v0.1 references Sir Shahrukh\'s Excel formulas', () => {
    const v01 = VERSIONS.find((v) => v.version === 'v0.1')!;
    const featureText = v01.features.join(' ');
    expect(featureText).toContain('Shahrukh');
    expect(featureText).toContain('Excel');
  });
});
