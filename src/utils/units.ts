// ft-in notation parser: accepts "4'-6\"", "4' 6\"", "4.5", "4 6", "54\""
// Returns decimal feet, or null if unparseable.
export function parseFtIn(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // pure decimal
  const dec = Number(s);
  if (!isNaN(dec)) return dec;

  // ft' in" patterns: 4'-6", 4'6", 4' 6", 4'6, 15'-6"
  const ftIn = s.match(/^(\d+(?:\.\d+)?)['\u2019]\s*[- ]?\s*(\d+(?:\.\d+)?)["\u201d]?$/);
  if (ftIn) return parseFloat(ftIn[1]) + parseFloat(ftIn[2]) / 12;

  // just feet with apostrophe: 4'
  const ftOnly = s.match(/^(\d+(?:\.\d+)?)['\u2019]$/);
  if (ftOnly) return parseFloat(ftOnly[1]);

  // just inches with quote: 6"
  const inOnly = s.match(/^(\d+(?:\.\d+)?)["\u201d]$/);
  if (inOnly) return parseFloat(inOnly[1]) / 12;

  // "4 6" → 4 ft 6 in
  const spaced = s.match(/^(\d+)\s+(\d+)$/);
  if (spaced) return parseInt(spaced[1]) + parseInt(spaced[2]) / 12;

  return null;
}

// Format decimal feet as ft' in"
export function formatFtIn(ft: number): string {
  const wholeFt = Math.floor(ft);
  const inches = Math.round((ft - wholeFt) * 12 * 100) / 100;
  if (inches === 0) return `${wholeFt}'`;
  if (wholeFt === 0) return `${inches}"`;
  return `${wholeFt}'-${inches}"`;
}

// Format number for tabular display (4 decimal places)
export function fmtNum(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

// Format bar dia as fraction string: 1/2, 3/8, 5/8
export function fmtDia(barNo: number): string {
  const fractions: Record<number, string> = {
    3: '3/8',
    4: '1/2',
    5: '5/8',
    6: '3/4',
    7: '7/8',
    8: '1',
  };
  return fractions[barNo] ?? `${barNo}/8`;
}

// Format bar shape: stirrups/ties as square "□", straight as "---", u as "u", L as "L"
export function fmtShape(shape?: string, barType?: string): string {
  const normShape = (shape || '').toLowerCase().trim();
  const normType = (barType || '').toLowerCase().trim();

  if (normType.includes('stirrup') || normType.includes('tie') || normShape === 'square' || normShape === 'box' || normShape === 'rect') {
    return '□';
  }
  if (normShape === 'straight' || normShape === '-' || normShape === '--' || normShape === '---') {
    return '---';
  }
  if (normShape === 'u') return 'u';
  if (normShape === 'l') return 'L';
  if (!normShape && (normType.includes('stirrup') || normType.includes('tie'))) {
    return '□';
  }
  if (!normShape && (normType.includes('extra') || normType.includes('straight'))) {
    return '---';
  }
  return normShape || '---';
}
