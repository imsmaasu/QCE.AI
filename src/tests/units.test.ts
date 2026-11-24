import { describe, it, expect } from 'vitest';
import { parseFtIn, formatFtIn, fmtDia, fmtNum } from '../utils/units';

describe('Unit utilities and ft-in parser', () => {
  it('parses pure decimal numbers', () => {
    expect(parseFtIn('4.5')).toBe(4.5);
    expect(parseFtIn('15.5')).toBe(15.5);
    expect(parseFtIn('0')).toBe(0);
  });

  it('parses ft-in notation with hyphen: 4\'-6"', () => {
    expect(parseFtIn("4'-6\"")).toBe(4.5);
    expect(parseFtIn("15'-6\"")).toBe(15.5);
    expect(parseFtIn("5'-0\"")).toBe(5.0);
    expect(parseFtIn("2'-3\"")).toBe(2.25);
  });

  it('parses ft-in notation with space: 4\' 6"', () => {
    expect(parseFtIn("4' 6\"")).toBe(4.5);
    expect(parseFtIn("15' 6\"")).toBe(15.5);
  });

  it('parses feet only with quote: 4\'', () => {
    expect(parseFtIn("4'")).toBe(4);
    expect(parseFtIn("10.5'")).toBe(10.5);
  });

  it('parses inches only with quote: 6"', () => {
    expect(parseFtIn('6"')).toBe(0.5);
    expect(parseFtIn('12"')).toBe(1.0);
    expect(parseFtIn('54"')).toBe(4.5);
  });

  it('parses two numbers with space: "4 6"', () => {
    expect(parseFtIn('4 6')).toBe(4.5);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseFtIn('')).toBeNull();
    expect(parseFtIn('abc')).toBeNull();
  });

  it('formats decimal feet back to ft-in string', () => {
    expect(formatFtIn(4.5)).toBe("4'-6\"");
    expect(formatFtIn(4)).toBe("4'");
    expect(formatFtIn(0.5)).toBe('6"');
  });

  it('formats bar diameter fractions correctly', () => {
    expect(fmtDia(3)).toBe('3/8');
    expect(fmtDia(4)).toBe('1/2');
    expect(fmtDia(5)).toBe('5/8');
    expect(fmtDia(6)).toBe('3/4');
    expect(fmtDia(7)).toBe('7/8');
    expect(fmtDia(8)).toBe('1');
  });

  it('formats numbers with tabular decimals', () => {
    expect(fmtNum(4.5, 2)).toBe('4.50');
    expect(fmtNum(4.56789, 4)).toBe('4.5679');
  });
});
