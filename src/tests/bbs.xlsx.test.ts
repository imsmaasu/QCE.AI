// Loads cached values from the Excel file and verifies every row automatically.
// This test runs in Node (vitest environment: 'node').
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// We import XLSX dynamically to stay ESM-compatible in vitest
import * as XLSX from 'xlsx';

import { calcBbs } from '../engine/bbs';
import {
  FOOTING_LEGACY_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
} from '../engine/types';

const TOL = 1e-4;

// Map Excel rows to our engine rows
// Sheet row → { rowId, col_count: H, col_straight: I, col_hook: J, col_totalLen: L, col_lbft: M, col_lb: N, col_kg: O }
const EXCEL_ROW_MAP: Array<{ rowId: string; excelRow: number }> = [
  { rowId: 'R1', excelRow: 6 },
  { rowId: 'R2', excelRow: 7 },
  { rowId: 'R3', excelRow: 9 },
  { rowId: 'R4', excelRow: 10 },
  { rowId: 'R5', excelRow: 13 },
  { rowId: 'R6', excelRow: 14 },
  { rowId: 'R7', excelRow: 17 },
  { rowId: 'R8', excelRow: 18 },
  { rowId: 'R9', excelRow: 19 },
  { rowId: 'R10', excelRow: 20 },
  { rowId: 'R11', excelRow: 21 },
];

function cellVal(ws: XLSX.WorkSheet, col: string, row: number): number {
  const cell = ws[`${col}${row}`];
  if (!cell) return NaN;
  return typeof cell.v === 'number' ? cell.v : parseFloat(cell.w ?? '0');
}

describe('BBS vs Excel cached values', () => {
  const xlsxPath = join(process.cwd(), 'reference', 'BBS_Column_Footing.xlsx');
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { cellFormula: true, cellNF: true, raw: false });
  const ws = wb.Sheets['columnfooting-BBS'];

  const result = calcBbs(FOOTING_LEGACY_DEFAULTS, COLUMN_DEFAULTS, BEAM_DEFAULTS, {
    roundUpBarCounts: false,
    c2StirrupHooksLikeTies: false,
  });
  const byId = Object.fromEntries(result.rows.map(r => [r.id, r]));

  for (const { rowId, excelRow } of EXCEL_ROW_MAP) {
    const xlCount = cellVal(ws, 'H', excelRow);
    const xlStraight = cellVal(ws, 'I', excelRow);
    const xlHook = cellVal(ws, 'J', excelRow);
    const xlTotalLen = cellVal(ws, 'L', excelRow);
    const xlLbft = cellVal(ws, 'M', excelRow);
    const xlLb = cellVal(ws, 'N', excelRow);
    const xlKg = cellVal(ws, 'O', excelRow);

    const row = byId[rowId];

    it(`${rowId} count vs Excel H${excelRow}`, () =>
      expect(Math.abs(row.count - xlCount)).toBeLessThanOrEqual(TOL));
    it(`${rowId} straight vs Excel I${excelRow}`, () =>
      expect(Math.abs(row.straightFt - xlStraight)).toBeLessThanOrEqual(TOL));
    // R8 hook in Excel is "-" (string), skip
    if (rowId !== 'R8') {
      it(`${rowId} hook vs Excel J${excelRow}`, () =>
        expect(Math.abs(row.hookFt - xlHook)).toBeLessThanOrEqual(TOL));
    }
    it(`${rowId} totalLen vs Excel L${excelRow}`, () =>
      expect(Math.abs(row.totalLenFt - xlTotalLen)).toBeLessThanOrEqual(TOL));
    it(`${rowId} lbft vs Excel M${excelRow}`, () =>
      expect(Math.abs(row.unitWeightLbPerFt - xlLbft)).toBeLessThanOrEqual(TOL));
    it(`${rowId} lb vs Excel N${excelRow}`, () =>
      expect(Math.abs(row.weightLb - xlLb)).toBeLessThanOrEqual(TOL));
    it(`${rowId} kg vs Excel O${excelRow}`, () =>
      expect(Math.abs(row.weightKg - xlKg)).toBeLessThanOrEqual(TOL));
  }
});
