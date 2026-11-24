// Technical drafting text formatters following Sir SRK's exact drawing style.

export function fmtDimInches(inches: number): string {
  const rounded = Math.round(inches * 100) / 100;
  if (rounded === 0) return '0"';

  // For 12" exactly on beam or column depth/thickness, Sir uses 12"
  if (rounded === 12) return '12"';

  if (rounded < 12) {
    const frac = fmtFrac(rounded);
    return `${frac}"`;
  }

  const feet = Math.floor(rounded / 12);
  const remIn = Math.round((rounded % 12) * 100) / 100;
  if (remIn === 0) {
    return `${feet}'-0"`;
  }
  return `${feet}'-${fmtFrac(remIn)}"`;
}

export function fmtFrac(val: number): string {
  const whole = Math.floor(val);
  const rem = val - whole;
  if (Math.abs(rem - 0.5) < 0.01) return whole > 0 ? `${whole} 1/2` : '1/2';
  if (Math.abs(rem - 0.25) < 0.01) return whole > 0 ? `${whole} 1/4` : '1/4';
  if (Math.abs(rem - 0.75) < 0.01) return whole > 0 ? `${whole} 3/4` : '3/4';
  if (Math.abs(rem - 0.125) < 0.01) return whole > 0 ? `${whole} 1/8` : '1/8';
  if (Math.abs(rem - 0.375) < 0.01) return whole > 0 ? `${whole} 3/8` : '3/8';
  if (Math.abs(rem - 0.625) < 0.01) return whole > 0 ? `${whole} 5/8` : '5/8';
  if (Math.abs(rem - 0.875) < 0.01) return whole > 0 ? `${whole} 7/8` : '7/8';
  return whole === val ? String(whole) : val.toFixed(1);
}

export function fmtBarDia(barNo: number): string {
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

// Callouts matching Sir SRK's format
export function fmtCalloutWithSpacing(barNo: number, spacingIn: number): string {
  return `${fmtBarDia(barNo)}"Ø@${spacingIn}"C/C`;
}

export function fmtCalloutWithCount(count: number, barNo: number): string {
  return `${count}-${fmtBarDia(barNo)}"Ø`;
}

export function fmtLevelText(elevationFt: number): string {
  if (elevationFt === 0) return "EL.±0'-0\"";
  if (elevationFt > 0) return `EL.+${fmtDimInches(elevationFt * 12)}`;
  return `EL.-${fmtDimInches(Math.abs(elevationFt) * 12)}`;
}
