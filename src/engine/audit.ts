// Audit Notes – derived from components and computed BBS rows.
// Note A1 is removed because labels are dynamically generated.
// Notes A2–A8 and dynamic non-integer count notes are re-keyed to instances and rows.

import type { BbsResult } from './types';

export interface AuditNote {
  id: string;             // e.g. "A2", "A3", ..., "D-R11"
  rowId?: string;         // e.g. "R10", "R11"
  componentId?: string;   // instance ID if available
  field?: string;         // e.g. "count", "straightFt", "hookFt"
  cellRef?: string;       // e.g. "H21", "J20"
  severity: 'info' | 'warn';
  text: string;
  message?: string;
}

export function getAuditNotes(result: BbsResult): AuditNote[] {
  const notes: AuditNote[] = [];

  const addNote = (note: Omit<AuditNote, 'message'>) => {
    notes.push({ ...note, message: note.text });
  };

  // Find if any rows match R1..R11
  const rowMap = new Map<string, typeof result.rows[0]>();
  for (const row of result.rows) {
    if (!rowMap.has(row.id)) {
      rowMap.set(row.id, row);
    }
  }

  // A3: Bend allowance sign differs
  if (rowMap.has('R10') || rowMap.has('R11')) {
    const r10 = rowMap.get('R10');
    addNote({
      id: 'A3',
      rowId: 'R10',
      componentId: r10?.componentId,
      field: 'hookFt',
      cellRef: 'J20',
      severity: 'info',
      text: 'Bend allowance sign differs: ties deduct bends (R4, R6), stirrups add them (R10, R11). Stirrups come out ~0.75 ft longer each.',
    });
  }

  // A4: Stirrup zones
  if (rowMap.has('R10')) {
    const r10 = rowMap.get('R10');
    addNote({
      id: 'A4',
      rowId: 'R10',
      componentId: r10?.componentId,
      field: 'count',
      cellRef: 'H20',
      severity: 'warn',
      text: 'Stirrup zones labelled L/4 and L/2 in Excel descriptions, but formula uses (15.5 - 1.5)/2 for each zone. L/4 at both ends would be 7.75 ft.',
    });
  }

  // A5: Tie height below plinth vs dowel height
  if (rowMap.has('R4')) {
    const r4 = rowMap.get('R4');
    addNote({
      id: 'A5',
      rowId: 'R4',
      componentId: r4?.componentId,
      field: 'count',
      cellRef: 'H10',
      severity: 'warn',
      text: 'Tie height below plinth is 6 ft (R4) but dowel straight height uses 7 ft (R3).',
    });
  }

  // A6: Footing 5 ft dimension
  if (rowMap.has('R1')) {
    const r1 = rowMap.get('R1');
    addNote({
      id: 'A6',
      rowId: 'R1',
      componentId: r1?.componentId,
      field: 'straightFt',
      cellRef: 'I6',
      severity: 'info',
      text: 'Footing 5 ft dimension is not shown on the elevation drawing (the drawing\'s 5\'-0" is vertical depth).',
    });
  }

  // A7: Bottom beam bars subtract 2 bar dia, top do not
  if (rowMap.has('R7')) {
    const r7 = rowMap.get('R7');
    addNote({
      id: 'A7',
      rowId: 'R7',
      componentId: r7?.componentId,
      field: 'straightFt',
      cellRef: 'I17',
      severity: 'warn',
      text: 'Bottom beam bars subtract 2 bar diameters (R7), top bars do not (R9).',
    });
  }

  // A8: Column size is not an input
  if (rowMap.has('R4')) {
    const r4 = rowMap.get('R4');
    addNote({
      id: 'A8',
      rowId: 'R4',
      componentId: r4?.componentId,
      field: 'straightFt',
      cellRef: 'I10',
      severity: 'info',
      text: 'Column size is not an input; tie size 4.5 in × 11 in is hardcoded and does not match the 18 in column in the beam remark.',
    });
  }

  for (const row of result.rows) {
    if (row.roundedFromCount !== undefined && row.roundedFromCount !== row.count) {
      addNote({
        id: `round-up-${row.id}`,
        rowId: row.id,
        componentId: row.componentId,
        field: 'count',
        severity: 'info',
        text: `Rounded up from ${row.roundedFromCount.toFixed(2)} to ${row.count}`,
      });
    }
  }

  return notes;
}

export type AuditFlag = AuditNote;
export const getAuditFlags = getAuditNotes;
