// Pure TypeScript engine – no React, no DOM, no randomness.
// Internal units: lengths in decimal feet, bar diameter in inches,
// spacing and cover in inches, weight in lb. kg = lb * 0.453592.

import type {
  FootingInputs,
  ColumnInputs,
  BeamInputs,
  Corrections,
  BbsRow,
  BbsResult,
  SizeSummary,
  WorkStep,
  ComponentInstance,
  ProjectState,
  ComponentType,
} from './types';
import { fmtDia } from '../utils/units';

// ── helpers ──────────────────────────────────────────────────────────────────

export function roundUp(x: number): number {
  return Math.ceil(x);
}

export function diaIn(barNo: number): number {
  return barNo / 8;
}

export function unitWeight(barNo: number): number {
  // lb/ft = barNo^2 / 24
  return (barNo * barNo) / 24;
}

export function step(label: string, formulaText: string, substitutedText: string, value: number): WorkStep {
  return { label, formulaText, substitutedText, value };
}

// ─── Linked Spacing and Count Engine (Part A3) ─────────────────────────────────

export function getRowSpanFt(
  rowId: string,
  compType: ComponentType,
  params: FootingInputs | ColumnInputs | BeamInputs | Record<string, unknown>,
): number | null {
  if (compType === 'footing') {
    const p = params as FootingInputs;
    const coverFt = (2 * (p.coverEachSideIn ?? 0.75)) / 12;
    if (rowId === 'R1') return Math.max(0, (p.B ?? 4) - coverFt);
    if (rowId === 'R2') return Math.max(0, (p.L ?? 5) - coverFt);
  } else if (compType === 'column') {
    const p = params as ColumnInputs;
    if (rowId === 'R4') return Math.max(0, p.tieHeightBelowFt ?? 6);
    if (rowId === 'R6') {
      const topCoverFt = (p.topCoverIn ?? 1.5) / 12;
      return Math.max(0, (p.columnHeightAboveFt ?? 10.5) - (p.firstTieOffsetFt ?? 0.5) - topCoverFt);
    }
  } else if (compType === 'beam') {
    const p = params as BeamInputs;
    if (rowId === 'R10' || rowId === 'R11') {
      return Math.max(0, ((p.clearSpanFt ?? 15.5) - (p.stirrupZoneDeductionFt ?? 1.5)) / 2);
    }
  }
  return null;
}

export function calcCountFromSpacing(
  spanFt: number,
  spacingIn: number,
  tieSetsPerLevel: number = 1,
  roundUpCounts: boolean = true,
): { count: number; rawCount: number } {
  if (spacingIn <= 0) return { count: 1, rawCount: 1 };
  const spacingFt = spacingIn / 12;
  const rawLevels = spanFt / spacingFt + 1;
  const levels = roundUpCounts ? Math.ceil(rawLevels - 1e-9) : rawLevels;
  const count = levels * tieSetsPerLevel;
  const rawCount = rawLevels * tieSetsPerLevel;
  return { count, rawCount };
}

export function calcSpacingFromCount(
  spanFt: number,
  count: number,
  tieSetsPerLevel: number = 1,
): { spacingIn: number; adjustedCount: number; levels: number } {
  let adjustedCount = Math.max(2 * tieSetsPerLevel, Math.round(count));
  const remainder = adjustedCount % tieSetsPerLevel;
  if (remainder !== 0) {
    adjustedCount += tieSetsPerLevel - remainder;
  }
  const levels = Math.max(2, Math.round(adjustedCount / tieSetsPerLevel));
  const spacingFt = spanFt / (levels - 1);
  const spacingIn = spacingFt * 12;
  return { spacingIn, adjustedCount, levels };
}

export function calcHookFt(hookOption: string, barNo: number, fallbackHookFt = 0): number {
  const dIn = barNo / 8;
  switch (hookOption) {
    case 'none':
      return 0;
    case '9d':
      return (9 * dIn) / 12;
    case '12d':
      return (12 * dIn) / 12;
    case '16d':
      return (16 * dIn) / 12;
    case '18d':
      return (18 * dIn) / 12;
    case '24d':
      return (24 * dIn) / 12;
    case '30d':
      return (30 * dIn) / 12;
    case 'fixed_6':
      return 6 / 12;
    case 'fixed_12':
      return 12 / 12;
    case 'fixed_24':
      return 24 / 12;
    case 'custom':
      return fallbackHookFt;
    default:
      return fallbackHookFt;
  }
}

export function makeRow(
  id: string,
  section: string,
  description: string,
  shape: string,
  barNo: number,
  spacingIn: number | null,
  count: number,
  straightFt: number,
  hookFt: number,
  remarks: string,
  working: WorkStep[],
  barType?: string,
  hookOption?: string,
  roundedFromCount?: number,
): BbsRow {
  const totalFt = straightFt + hookFt;
  const totalLenFt = totalFt * count;
  const uw = unitWeight(barNo);
  const weightLb = uw * totalLenFt;
  const weightKg = weightLb * 0.453592;
  return {
    id,
    section,
    description,
    barType,
    shape,
    barNo,
    diaIn: diaIn(barNo),
    spacingIn,
    count,
    straightFt,
    hookFt,
    hookOption,
    totalFt,
    totalLenFt,
    unitWeightLbPerFt: uw,
    weightLb,
    weightKg,
    remarks,
    working,
    hasNonIntegerCount: !Number.isInteger(count),
    roundedFromCount,
  };
}

// ─── Footing ─────────────────────────────────────────────────────────────────

export function calcFooting(inp: FootingInputs): BbsRow[] {
  const {
    B, L, coverEachSideIn, mainBarNo, mainSpacingIn, distBarNo, distSpacingIn,
    hookRule, hookFactor, fixedHookIn,
  } = inp;

  const totalDeductionIn = 2 * coverEachSideIn;
  const totalDeductionFt = totalDeductionIn / 12;

  // R1 – Main bars
  const r1_d = diaIn(mainBarNo);
  const r1_spacingFt = mainSpacingIn / 12;
  const r1_count = roundUp((B - totalDeductionFt) / r1_spacingFt + 1);
  const r1_straight = L - totalDeductionFt;
  const r1_hook = hookRule === 'fixed_length'
    ? 2 * (fixedHookIn / 12)
    : 2 * hookFactor * r1_d / 12;

  const r1_total = r1_straight + r1_hook;
  const r1_totLen = r1_total * r1_count;
  const r1_uw = unitWeight(mainBarNo);
  const r1_lb = r1_uw * r1_totLen;
  const r1_kg = r1_lb * 0.453592;

  const r1_working: WorkStep[] = [
    step('Bar diameter', 'd = barNo/8', `d = ${mainBarNo}/8`, r1_d),
    step('Cover deduction (ft)', '2 × coverEachSide / 12', `2 × ${coverEachSideIn} / 12`, totalDeductionFt),
    step('Spacing (ft)', 'spacingFt = spacingIn/12', `${mainSpacingIn}/12`, r1_spacingFt),
    step('Count', 'ROUNDUP((B - 2×cover/12) / spacingFt + 1)',
      `ROUNDUP((${B} - ${totalDeductionFt}) / ${r1_spacingFt} + 1)`, r1_count),
    step('Straight (ft)', 'L - 2×cover/12', `${L} - ${totalDeductionFt}`, r1_straight),
    step(
      'Hook (ft)',
      hookRule === 'fixed_length' ? '2 × fixedHookIn/12' : '2×hookFactor×d/12',
      hookRule === 'fixed_length' ? `2 × ${fixedHookIn}/12` : `2×${hookFactor}×${r1_d}/12`,
      r1_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r1_straight} + ${r1_hook}`, r1_total),
    step('Total length (ft)', 'total × count', `${r1_total.toFixed(6)} × ${r1_count}`, r1_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${mainBarNo}² / 24`, r1_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r1_uw.toFixed(6)} × ${r1_totLen.toFixed(6)}`, r1_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r1_lb.toFixed(6)} × 0.453592`, r1_kg),
  ];

  // R2 – Distribution bars
  const r2_d = diaIn(distBarNo);
  const r2_spacingFt = distSpacingIn / 12;
  const r2_count = roundUp((L - totalDeductionFt) / r2_spacingFt + 1);
  const r2_straight = B - totalDeductionFt;
  const r2_hook = hookRule === 'fixed_length'
    ? 2 * (fixedHookIn / 12)
    : 2 * hookFactor * r2_d / 12;

  const r2_total = r2_straight + r2_hook;
  const r2_totLen = r2_total * r2_count;
  const r2_uw = unitWeight(distBarNo);
  const r2_lb = r2_uw * r2_totLen;
  const r2_kg = r2_lb * 0.453592;

  const r2_working: WorkStep[] = [
    step('Bar diameter', 'd = barNo/8', `d = ${distBarNo}/8`, r2_d),
    step('Cover deduction (ft)', '2 × coverEachSide / 12', `2 × ${coverEachSideIn} / 12`, totalDeductionFt),
    step('Spacing (ft)', 'spacingFt = spacingIn/12', `${distSpacingIn}/12`, r2_spacingFt),
    step('Count', 'ROUNDUP((L - 2×cover/12) / spacingFt + 1)',
      `ROUNDUP((${L} - ${totalDeductionFt}) / ${r2_spacingFt} + 1)`, r2_count),
    step('Straight (ft)', 'B - 2×cover/12', `${B} - ${totalDeductionFt}`, r2_straight),
    step(
      'Hook (ft)',
      hookRule === 'fixed_length' ? '2 × fixedHookIn/12' : '2×hookFactor×d/12',
      hookRule === 'fixed_length' ? `2 × ${fixedHookIn}/12` : `2×${hookFactor}×${r2_d}/12`,
      r2_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r2_straight} + ${r2_hook}`, r2_total),
    step('Total length (ft)', 'total × count', `${r2_total.toFixed(6)} × ${r2_count}`, r2_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${distBarNo}² / 24`, r2_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r2_uw.toFixed(6)} × ${r2_totLen.toFixed(6)}`, r2_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r2_lb.toFixed(6)} × 0.453592`, r2_kg),
  ];

  return [
    makeRow(
      'R1',
      'Reinforcement in Footing',
      `Main Bars (${fmtDia(mainBarNo)}" dia @ ${mainSpacingIn}" c/c) along ${L}' span`,
      'u',
      mainBarNo,
      mainSpacingIn,
      r1_count,
      r1_straight,
      r1_hook,
      `hook length = ${hookFactor}xdia; cover ${coverEachSideIn}" each side`,
      r1_working,
      'main',
      '24d',
    ),
    makeRow(
      'R2',
      'Reinforcement in Footing',
      `Distribution Bars (${fmtDia(distBarNo)}" dia @ ${distSpacingIn}" c/c) along ${B}' span`,
      'u',
      distBarNo,
      distSpacingIn,
      r2_count,
      r2_straight,
      r2_hook,
      `hook length = ${hookFactor}xdia`,
      r2_working,
      'dist',
      '24d',
    ),
  ];
}

// ─── Column ──────────────────────────────────────────────────────────────────

export function calcColumn(inp: ColumnInputs, corr: Corrections): BbsRow[] {
  const {
    dowelCount, dowelBarNo, depthGLtoFootingFt, plinthAboveGLFt,
    lapFactor, topCoverIn, dowelEndAllowanceIn, hookRule, hookFactor, fixedHookIn,
    tieBarNo, tieSpacingIn, tieWidthIn, tieDepthIn, tieSetsPerLevel,
    tieHeightBelowFt, columnHeightAboveFt, firstTieOffsetFt, coverEachSideIn,
  } = inp;

  const d4 = diaIn(dowelBarNo); // #4 → 0.5 in
  const d3 = diaIn(tieBarNo);   // #3 → 0.375 in

  // R3 – Dowel bars below plinth
  const r3_straight = depthGLtoFootingFt + plinthAboveGLFt + (lapFactor * d4 / 12) - topCoverIn / 12 - dowelEndAllowanceIn / 12;
  const r3_hook = hookRule === 'fixed_length'
    ? fixedHookIn / 12
    : hookFactor * d4 / 12;

  const r3_total = r3_straight + r3_hook;
  const r3_totLen = r3_total * dowelCount;
  const r3_uw = unitWeight(dowelBarNo);
  const r3_lb = r3_uw * r3_totLen;
  const r3_kg = r3_lb * 0.453592;

  const r3_working: WorkStep[] = [
    step('d (dowel bar, in)', 'd = barNo/8', `${dowelBarNo}/8`, d4),
    step(
      'Straight (ft)',
      'depthGL + plinthAboveGL + lapFactor×d/12 - topCover/12 - endAllowance/12',
      `${depthGLtoFootingFt} + ${plinthAboveGLFt} + (${lapFactor}×${d4}/12) - ${topCoverIn}/12 - ${dowelEndAllowanceIn}/12`,
      r3_straight,
    ),
    step(
      'Hook (ft)',
      hookRule === 'fixed_length' ? 'fixedHookIn/12' : 'hookFactor×d/12',
      hookRule === 'fixed_length' ? `${fixedHookIn}/12` : `${hookFactor}×${d4}/12`,
      r3_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r3_straight} + ${r3_hook}`, r3_total),
    step('Total length (ft)', 'total × count', `${r3_total.toFixed(6)} × ${dowelCount}`, r3_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${dowelBarNo}² / 24`, r3_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r3_uw.toFixed(6)} × ${r3_totLen.toFixed(6)}`, r3_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r3_lb.toFixed(6)} × 0.453592`, r3_kg),
  ];

  // R4 – Ties up to plinth
  const r4_spacingFt = tieSpacingIn / 12;
  const r4_count_raw = (tieHeightBelowFt / r4_spacingFt + 1) * tieSetsPerLevel;
  const r4_count = corr.roundUpBarCounts ? roundUp(r4_count_raw) : r4_count_raw;
  const r4_roundedFrom = (corr.roundUpBarCounts && !Number.isInteger(r4_count_raw)) ? r4_count_raw : undefined;
  const r4_straight = 2 * tieWidthIn / 12 + 2 * tieDepthIn / 12;
  const r4_hook_sir = (2 * 9 * d3 - 3 * 2 * d3 - 6 * d3) / 12;
  const r4_hook_c2 = (2 * 9 * d3 - 3 * 2 * d3 - 3 * 2 * d3) / 12;
  const r4_hook = corr.c2StirrupHooksLikeTies ? r4_hook_c2 : r4_hook_sir;

  const r4_total = r4_straight + r4_hook;
  const r4_totLen = r4_total * r4_count;
  const r4_uw = unitWeight(tieBarNo);
  const r4_lb = r4_uw * r4_totLen;
  const r4_kg = r4_lb * 0.453592;

  const r4_working: WorkStep[] = [
    step('d (tie bar, in)', 'd = barNo/8', `${tieBarNo}/8`, d3),
    step('Spacing (ft)', 'spacingIn/12', `${tieSpacingIn}/12`, r4_spacingFt),
    step(
      'Count (raw)',
      '(tieHeightBelowFt / spacingFt + 1) × tieSetsPerLevel',
      `(${tieHeightBelowFt} / ${r4_spacingFt} + 1) × ${tieSetsPerLevel}`,
      r4_count_raw,
    ),
    step('Count (applied)', corr.roundUpBarCounts ? 'ROUNDUP (default)' : 'No roundup (Sir legacy mode)', '', r4_count),
    step('Straight (ft)', '2×tieWidth/12 + 2×tieDepth/12', `2×${tieWidthIn}/12 + 2×${tieDepthIn}/12`, r4_straight),
    step('Hook (ft, Sir SRK)', '(2×9×d - 3×2×d - 6×d) / 12', `(2×9×${d3} - 3×2×${d3} - 6×${d3}) / 12`, r4_hook_sir),
    step('Hook (ft, applied)', corr.c2StirrupHooksLikeTies ? 'C2: (2×9×d - 3×2×d - 3×2×d)/12' : 'Sir SRK mode', '', r4_hook),
    step('Total per bar (ft)', 'straight + hook', `${r4_straight} + ${r4_hook}`, r4_total),
    step('Total length (ft)', 'total × count', `${r4_total.toFixed(6)} × ${r4_count}`, r4_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${tieBarNo}² / 24`, r4_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r4_uw.toFixed(6)} × ${r4_totLen.toFixed(6)}`, r4_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r4_lb.toFixed(6)} × 0.453592`, r4_kg),
  ];

  // R5 – Dowel bars above plinth
  const r5_straight = columnHeightAboveFt - topCoverIn / 12;
  const r5_hook = hookRule === 'fixed_length'
    ? fixedHookIn / 12
    : hookFactor * d4 / 12;

  const r5_total = r5_straight + r5_hook;
  const r5_totLen = r5_total * dowelCount;
  const r5_uw = unitWeight(dowelBarNo);
  const r5_lb = r5_uw * r5_totLen;
  const r5_kg = r5_lb * 0.453592;

  const r5_working: WorkStep[] = [
    step('d (dowel bar, in)', 'd = barNo/8', `${dowelBarNo}/8`, d4),
    step('Straight (ft)', 'columnHeightAbove - topCover/12', `${columnHeightAboveFt} - ${topCoverIn}/12`, r5_straight),
    step(
      'Hook (ft)',
      hookRule === 'fixed_length' ? 'fixedHookIn/12' : 'hookFactor×d/12',
      hookRule === 'fixed_length' ? `${fixedHookIn}/12` : `${hookFactor}×${d4}/12`,
      r5_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r5_straight} + ${r5_hook}`, r5_total),
    step('Total length (ft)', 'total × count', `${r5_total.toFixed(6)} × ${dowelCount}`, r5_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${dowelBarNo}² / 24`, r5_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r5_uw.toFixed(6)} × ${r5_totLen.toFixed(6)}`, r5_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r5_lb.toFixed(6)} × 0.453592`, r5_kg),
  ];

  // R6 – Ties above plinth
  const r6_count_raw = roundUp((columnHeightAboveFt - firstTieOffsetFt - topCoverIn / 12) / r4_spacingFt + 1) * tieSetsPerLevel;
  const r6_count = r6_count_raw;
  const r6_hook = r4_hook;

  const r6_total = r4_straight + r6_hook;
  const r6_totLen = r6_total * r6_count;
  const r6_uw = unitWeight(tieBarNo);
  const r6_lb = r6_uw * r6_totLen;
  const r6_kg = r6_lb * 0.453592;

  const r6_working: WorkStep[] = [
    step('d (tie bar, in)', 'd = barNo/8', `${tieBarNo}/8`, d3),
    step(
      'Count',
      'ROUNDUP((colHeight - firstOffset - topCover/12) / spacingFt + 1) × tieSetsPerLevel',
      `ROUNDUP((${columnHeightAboveFt} - ${firstTieOffsetFt} - ${topCoverIn}/12) / ${r4_spacingFt} + 1) × ${tieSetsPerLevel}`,
      r6_count,
    ),
    step('Straight (ft)', '2×tieWidth/12 + 2×tieDepth/12', `2×${tieWidthIn}/12 + 2×${tieDepthIn}/12`, r4_straight),
    step('Hook (ft, applied)', corr.c2StirrupHooksLikeTies ? 'C2 bend rule' : 'Sir SRK mode bend rule', '', r6_hook),
    step('Total per bar (ft)', 'straight + hook', `${r4_straight} + ${r6_hook}`, r6_total),
    step('Total length (ft)', 'total × count', `${r6_total.toFixed(6)} × ${r6_count}`, r6_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${tieBarNo}² / 24`, r6_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r6_uw.toFixed(6)} × ${r6_totLen.toFixed(6)}`, r6_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r6_lb.toFixed(6)} × 0.453592`, r6_kg),
  ];

  return [
    makeRow(
      'R3',
      'Reinforcement in Column below plinth',
      'Dowel Bars',
      'L',
      dowelBarNo,
      null,
      dowelCount,
      r3_straight,
      r3_hook,
      `overlap=48dia; hook length=12dia`,
      r3_working,
      'dowel',
      '12d',
    ),
    makeRow(
      'R4',
      'Reinforcement in Column below plinth',
      'Ties upto plinth',
      '',
      tieBarNo,
      tieSpacingIn,
      r4_count,
      r4_straight,
      r4_hook,
      `assume ${coverEachSideIn}" cover each side; 90 deg bend = 2xdia\r\n135 deg bend = 3xdia; Hook = 9x dia `,
      r4_working,
      'ties',
      'custom',
      r4_roundedFrom,
    ),
    makeRow(
      'R5',
      'Reinforcement in Column above plinth',
      'Dowel Bars',
      'L',
      dowelBarNo,
      null,
      dowelCount,
      r5_straight,
      r5_hook,
      `hook length=12dia`,
      r5_working,
      'dowel',
      '12d',
    ),
    makeRow(
      'R6',
      'Reinforcement in Column above plinth',
      'Ties above plinth',
      '',
      tieBarNo,
      tieSpacingIn,
      r6_count,
      r4_straight,
      r6_hook,
      `assume ${coverEachSideIn}" cover each side; 90 deg bend = 2xdia\r\n135 deg bend = 3xdia; Hook = 9x dia `,
      r6_working,
      'ties',
      'custom',
    ),
  ];
}

// ─── Beam ─────────────────────────────────────────────────────────────────────

export function calcBeam(inp: BeamInputs, corr: Corrections): BbsRow[] {
  const {
    clearSpanFt, columnWidthFt, beamWidthIn, beamDepthIn,
    coverEachSideIn, endAllowanceIn, hookRule, uBarHookFt, hookFactor,
    bottomBarNo, bottomBarCount,
    extraBottomBarNo, extraBottomBarCount,
    topBarNo, topBarCount,
    stirrupBarNo, stirrupSpacingEndIn, stirrupSpacingMidIn,
    stirrupZoneDeductionFt,
  } = inp;

  const d5 = diaIn(bottomBarNo);   // 5/8
  const d3 = diaIn(stirrupBarNo);  // 3/8
  const totalCoverDeductionIn = 2 * coverEachSideIn; // 2 x 0.75 = 1.5 in

  // R7 – Bottom longitudinal (u)
  const r7_straight = clearSpanFt + columnWidthFt - endAllowanceIn / 12 - 2 * (d5 / 12);
  const r7_hook = hookRule === 'multiple_of_dia'
    ? 2 * (hookFactor * d5 / 12)
    : 2 * uBarHookFt;

  const r7_total = r7_straight + r7_hook;
  const r7_totLen = r7_total * bottomBarCount;
  const r7_uw = unitWeight(bottomBarNo);
  const r7_lb = r7_uw * r7_totLen;
  const r7_kg = r7_lb * 0.453592;

  const r7_working: WorkStep[] = [
    step('d (bottom bar, in)', 'd = barNo/8', `${bottomBarNo}/8`, d5),
    step(
      'Straight (ft)',
      'clearSpan + colWidth - endAllowance/12 - 2×(d/12)',
      `${clearSpanFt} + ${columnWidthFt} - ${endAllowanceIn}/12 - 2×(${d5}/12)`,
      r7_straight,
    ),
    step(
      'Hook (ft)',
      hookRule === 'multiple_of_dia' ? '2 × hookFactor × d/12' : '2 × uBarHookFt',
      hookRule === 'multiple_of_dia' ? `2 × ${hookFactor} × ${d5}/12` : `2 × ${uBarHookFt}`,
      r7_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r7_straight} + ${r7_hook}`, r7_total),
    step('Total length (ft)', 'total × count', `${r7_total.toFixed(6)} × ${bottomBarCount}`, r7_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${bottomBarNo}² / 24`, r7_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r7_uw.toFixed(6)} × ${r7_totLen.toFixed(6)}`, r7_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r7_lb.toFixed(6)} × 0.453592`, r7_kg),
  ];

  // R8 – Extra bottom (straight)
  const r8_straight = clearSpanFt;
  const r8_hook = 0;
  const r8_total = r8_straight;
  const r8_totLen = r8_total * extraBottomBarCount;
  const r8_uw = unitWeight(extraBottomBarNo);
  const r8_lb = r8_uw * r8_totLen;
  const r8_kg = r8_lb * 0.453592;

  const r8_working: WorkStep[] = [
    step('Straight (ft)', 'clearSpan', `${clearSpanFt}`, r8_straight),
    step('Hook (ft)', '0 (straight bar)', '-', r8_hook),
    step('Total per bar (ft)', 'straight', `${r8_straight}`, r8_total),
    step('Total length (ft)', 'total × count', `${r8_straight} × ${extraBottomBarCount}`, r8_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${extraBottomBarNo}² / 24`, r8_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r8_uw.toFixed(6)} × ${r8_totLen.toFixed(6)}`, r8_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r8_lb.toFixed(6)} × 0.453592`, r8_kg),
  ];

  // R9 – Top longitudinal (u)
  const topDia = diaIn(topBarNo);
  const r9_straight = clearSpanFt + columnWidthFt - endAllowanceIn / 12;
  const r9_hook = hookRule === 'multiple_of_dia'
    ? 2 * (hookFactor * topDia / 12)
    : 2 * uBarHookFt;

  const r9_total = r9_straight + r9_hook;
  const r9_totLen = r9_total * topBarCount;
  const r9_uw = unitWeight(topBarNo);
  const r9_lb = r9_uw * r9_totLen;
  const r9_kg = r9_lb * 0.453592;

  const r9_working: WorkStep[] = [
    step('d (top bar, in)', 'd = barNo/8', `${topBarNo}/8`, topDia),
    step(
      'Straight (ft)',
      'clearSpan + colWidth - endAllowance/12',
      `${clearSpanFt} + ${columnWidthFt} - ${endAllowanceIn}/12`,
      r9_straight,
    ),
    step(
      'Hook (ft)',
      hookRule === 'multiple_of_dia' ? '2 × hookFactor × d/12' : '2 × uBarHookFt',
      hookRule === 'multiple_of_dia' ? `2 × ${hookFactor} × ${topDia}/12` : `2 × ${uBarHookFt}`,
      r9_hook,
    ),
    step('Total per bar (ft)', 'straight + hook', `${r9_straight} + ${r9_hook}`, r9_total),
    step('Total length (ft)', 'total × count', `${r9_total.toFixed(6)} × ${topBarCount}`, r9_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${topBarNo}² / 24`, r9_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r9_uw.toFixed(6)} × ${r9_totLen.toFixed(6)}`, r9_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r9_lb.toFixed(6)} × 0.453592`, r9_kg),
  ];

  // R10 – Stirrups @ end spacing
  const r10_spacingFt = stirrupSpacingEndIn / 12;
  const r10_zone = (clearSpanFt - stirrupZoneDeductionFt) / 2;
  const r10_count_raw = r10_zone / r10_spacingFt + 1;
  const r10_count = corr.roundUpBarCounts ? roundUp(r10_count_raw) : r10_count_raw;
  const r10_roundedFrom = (corr.roundUpBarCounts && !Number.isInteger(r10_count_raw)) ? r10_count_raw : undefined;
  const r10_straight = (2 * (beamDepthIn - totalCoverDeductionIn) + 2 * (beamWidthIn - totalCoverDeductionIn)) / 12;
  const r10_hook_sir = (6 * d3 + 6 * d3 + 2 * 9 * d3) / 12;
  const r10_hook_c2 = (2 * 9 * d3 - 3 * 2 * d3 - 3 * 2 * d3) / 12;
  const r10_hook = corr.c2StirrupHooksLikeTies ? r10_hook_c2 : r10_hook_sir;

  const r10_total = r10_straight + r10_hook;
  const r10_totLen = r10_total * r10_count;
  const r10_uw = unitWeight(stirrupBarNo);
  const r10_lb = r10_uw * r10_totLen;
  const r10_kg = r10_lb * 0.453592;

  const r10_working: WorkStep[] = [
    step('d (stirrup, in)', 'd = barNo/8', `${stirrupBarNo}/8`, d3),
    step('Cover deduction each side (in)', 'coverEachSideIn', `${coverEachSideIn}`, coverEachSideIn),
    step('Total cover deduction (in)', '2 × coverEachSideIn', `2 × ${coverEachSideIn}`, totalCoverDeductionIn),
    step('Zone length (ft)', '(clearSpan - stirrupZoneDeduction) / 2', `(${clearSpanFt} - ${stirrupZoneDeductionFt}) / 2`, r10_zone),
    step('Spacing (ft)', 'spacingIn/12', `${stirrupSpacingEndIn}/12`, r10_spacingFt),
    step('Count (raw)', 'zone / spacingFt + 1', `${r10_zone} / ${r10_spacingFt} + 1`, r10_count_raw),
    step('Count (applied)', corr.roundUpBarCounts ? 'ROUNDUP (default)' : 'No roundup (Sir legacy mode)', '', r10_count),
    step(
      'Straight (ft)',
      '(2×(beamDepth - 2×cover) + 2×(beamWidth - 2×cover)) / 12',
      `(2×(${beamDepthIn} - ${totalCoverDeductionIn}) + 2×(${beamWidthIn} - ${totalCoverDeductionIn})) / 12`,
      r10_straight,
    ),
    step('Hook (ft, Sir SRK)', '(6×d + 6×d + 2×9×d) / 12', `(6×${d3} + 6×${d3} + 2×9×${d3}) / 12`, r10_hook_sir),
    step('Hook (ft, applied)', corr.c2StirrupHooksLikeTies ? 'C2: (2×9×d - 3×2×d - 3×2×d)/12' : 'Sir SRK mode', '', r10_hook),
    step('Total per bar (ft)', 'straight + hook', `${r10_straight} + ${r10_hook}`, r10_total),
    step('Total length (ft)', 'total × count', `${r10_total.toFixed(6)} × ${r10_count}`, r10_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${stirrupBarNo}² / 24`, r10_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r10_uw.toFixed(6)} × ${r10_totLen.toFixed(6)}`, r10_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r10_lb.toFixed(6)} × 0.453592`, r10_kg),
  ];

  // R11 – Stirrups @ mid spacing
  const r11_spacingFt = stirrupSpacingMidIn / 12;
  const r11_count_raw = r10_zone / r11_spacingFt + 1;
  const r11_count = corr.roundUpBarCounts ? roundUp(r11_count_raw) : r11_count_raw;
  const r11_roundedFrom = (corr.roundUpBarCounts && !Number.isInteger(r11_count_raw)) ? r11_count_raw : undefined;
  const r11_hook = r10_hook;

  const r11_total = r10_straight + r11_hook;
  const r11_totLen = r11_total * r11_count;
  const r11_uw = unitWeight(stirrupBarNo);
  const r11_lb = r11_uw * r11_totLen;
  const r11_kg = r11_lb * 0.453592;

  const r11_working: WorkStep[] = [
    step('d (stirrup, in)', 'd = barNo/8', `${stirrupBarNo}/8`, d3),
    step('Zone length (ft)', '(clearSpan - stirrupZoneDeduction) / 2', `(${clearSpanFt} - ${stirrupZoneDeductionFt}) / 2`, r10_zone),
    step('Spacing (ft)', 'spacingIn/12', `${stirrupSpacingMidIn}/12`, r11_spacingFt),
    step('Count (raw)', 'zone / spacingFt + 1', `${r10_zone} / ${r11_spacingFt} + 1`, r11_count_raw),
    step('Count (applied)', corr.roundUpBarCounts ? 'ROUNDUP (default)' : 'No roundup (Sir legacy mode)', '', r11_count),
    step('Straight (ft)', 'same as R10', `(2×(${beamDepthIn} - ${totalCoverDeductionIn}) + 2×(${beamWidthIn} - ${totalCoverDeductionIn})) / 12`, r10_straight),
    step('Hook (ft, applied)', corr.c2StirrupHooksLikeTies ? 'C2 applied' : 'Sir SRK mode', '', r11_hook),
    step('Total per bar (ft)', 'straight + hook', `${r10_straight} + ${r11_hook}`, r11_total),
    step('Total length (ft)', 'total × count', `${r11_total.toFixed(6)} × ${r11_count}`, r11_totLen),
    step('Unit weight (lb/ft)', 'barNo² / 24', `${stirrupBarNo}² / 24`, r11_uw),
    step('Weight (lb)', 'unitWeight × totalLen', `${r11_uw.toFixed(6)} × ${r11_totLen.toFixed(6)}`, r11_lb),
    step('Weight (kg)', 'lb × 0.453592', `${r11_lb.toFixed(6)} × 0.453592`, r11_kg),
  ];

  return [
    makeRow(
      'R7',
      'Reinforcement in Beam',
      'Bottom Longitudinal Bars',
      'u',
      bottomBarNo,
      null,
      bottomBarCount,
      r7_straight,
      r7_hook,
      `column dimension = 18"`,
      r7_working,
      'bottom',
      'fixed_24',
    ),
    makeRow(
      'R8',
      'Reinforcement in Beam',
      'Extra Bottom Bars',
      'straight',
      extraBottomBarNo,
      null,
      extraBottomBarCount,
      r8_straight,
      r8_hook,
      `clear length 15' 6"`,
      r8_working,
      'bottom_extra',
      'none',
    ),
    makeRow(
      'R9',
      'Reinforcement in Beam',
      'Top Longitudinal bars',
      'u',
      topBarNo,
      null,
      topBarCount,
      r9_straight,
      r9_hook,
      `column dimension = 18"`,
      r9_working,
      'top',
      'fixed_24',
    ),
    makeRow(
      'R10',
      'Reinforcement in Beam',
      `Stirrups @ L/4 and ${stirrupSpacingEndIn}"c/c`,
      '',
      stirrupBarNo,
      stirrupSpacingEndIn,
      r10_count,
      r10_straight,
      r10_hook,
      `assume 0.75" cover; 90 deg bend = 2xdia`,
      r10_working,
      'stirrup',
      'custom',
      r10_roundedFrom,
    ),
    makeRow(
      'R11',
      'Reinforcement in Beam',
      `Stirrups @ L/2 and ${stirrupSpacingMidIn}"c/c`,
      '',
      stirrupBarNo,
      stirrupSpacingMidIn,
      r11_count,
      r10_straight,
      r11_hook,
      `135 deg bend = 3xdia; Hook = 9x dia `,
      r11_working,
      'stirrup',
      'custom',
      r11_roundedFrom,
    ),
  ];
}

// ─── Multi-Instance & Overrides Processing ─────────────────────────────────────

export function computeComponentRows(
  comp: ComponentInstance,
  corrections: Corrections,
): BbsRow[] {
  if (comp.type === 'rates') return [];

  // Version 3: Primary single source of truth is comp.bars
  if (comp.bars && comp.bars.length > 0) {
    const visibleBars = comp.bars.filter((b) => !b.hidden);
    const resultRows: BbsRow[] = [];

    for (const b of visibleBars) {
      const barNo = b.barNo;
      const d = diaIn(barNo);
      const uw = unitWeight(barNo);

      // 1. Straight length (ft)
      let straightFt = b.overrides?.straightFt;
      if (straightFt === undefined) {
        if (comp.type === 'footing') {
          const fp = comp.params as FootingInputs;
          const totalCoverFt = (2 * (fp.coverEachSideIn ?? 0.75)) / 12;
          if (b.id === 'R1') {
            straightFt = fp.L - totalCoverFt;
          } else if (b.id === 'R2') {
            straightFt = fp.B - totalCoverFt;
          } else {
            straightFt = 10;
          }
        } else if (comp.type === 'column') {
          const cp = comp.params as ColumnInputs;
          if (b.id === 'R3') {
            const lapLengthFt = (cp.lapFactor * d) / 12;
            straightFt = cp.depthGLtoFootingFt + cp.plinthAboveGLFt + lapLengthFt - (cp.topCoverIn / 12) - (cp.dowelEndAllowanceIn / 12);
          } else if (b.id === 'R4' || b.id === 'R6') {
            straightFt = (2 * cp.tieWidthIn + 2 * cp.tieDepthIn) / 12;
          } else if (b.id === 'R5') {
            straightFt = cp.columnHeightAboveFt - (cp.topCoverIn / 12);
          } else {
            straightFt = 10;
          }
        } else if (comp.type === 'beam') {
          const bp = comp.params as BeamInputs;
          const totalCoverIn = 2 * (bp.coverEachSideIn ?? 0.75);
          if (b.id === 'R7') {
            straightFt = bp.clearSpanFt + bp.columnWidthFt - (bp.endAllowanceIn / 12) - 2 * (d / 12);
          } else if (b.id === 'R9') {
            straightFt = bp.clearSpanFt + bp.columnWidthFt - (bp.endAllowanceIn / 12);
          } else if (b.id === 'R8') {
            straightFt = bp.clearSpanFt;
          } else if (b.id === 'R10' || b.id === 'R11') {
            straightFt = (2 * (bp.beamDepthIn - totalCoverIn) + 2 * (bp.beamWidthIn - totalCoverIn)) / 12;
          } else {
            straightFt = 10;
          }
        } else {
          straightFt = 10;
        }
      }

      // 2. Hook length (ft)
      let hookFt = b.overrides?.hookFt;
      if (hookFt === undefined) {
        if (comp.type === 'footing') {
          const fp = comp.params as FootingInputs;
          if (b.hookOption === 'none') {
            hookFt = 0;
          } else {
            hookFt = 2 * ((fp.hookFactor ?? 12) * d / 12);
          }
        } else if (comp.type === 'column') {
          const cp = comp.params as ColumnInputs;
          if (b.id === 'R3' || b.id === 'R5') {
            hookFt = (cp.hookFactor ?? 12) * d / 12;
          } else if (b.id === 'R4' || b.id === 'R6') {
            const hookSir = (2 * 9 * d - 3 * 2 * d - 6 * d) / 12;
            const hookC2 = (2 * 9 * d - 3 * 2 * d - 3 * 2 * d) / 12;
            hookFt = corrections.c2StirrupHooksLikeTies ? hookC2 : hookSir;
          } else {
            hookFt = calcHookFt(b.hookOption || 'none', barNo, 0);
          }
        } else if (comp.type === 'beam') {
          const bp = comp.params as BeamInputs;
          if (b.id === 'R7' || b.id === 'R9') {
            hookFt = 2 * (bp.uBarHookFt ?? 1);
          } else if (b.id === 'R8') {
            hookFt = 0;
          } else if (b.id === 'R10' || b.id === 'R11') {
            const hookSir = (6 * d + 6 * d + 2 * 9 * d) / 12;
            const hookC2 = (2 * 9 * d - 3 * 2 * d - 3 * 2 * d) / 12;
            hookFt = corrections.c2StirrupHooksLikeTies ? hookC2 : hookSir;
          } else {
            hookFt = calcHookFt(b.hookOption || 'none', barNo, 0);
          }
        } else {
          hookFt = calcHookFt(b.hookOption || 'none', barNo, 0);
        }
      }

      // 3. Spacing & Count
      let count = b.count;
      let roundedFrom: number | undefined;
      const spanFt = getRowSpanFt(b.id, comp.type, comp.params);
      const tieSets = (comp.type === 'column' && (b.id === 'R4' || b.id === 'R6'))
        ? ((comp.params as ColumnInputs).tieSetsPerLevel ?? 1)
        : 1;

      if (b.spacingIn !== null && b.spacingIn > 0 && spanFt !== null) {
        const res = calcCountFromSpacing(spanFt, b.spacingIn, tieSets, corrections.roundUpBarCounts);
        count = res.count;
        if (corrections.roundUpBarCounts && !Number.isInteger(res.rawCount)) {
          roundedFrom = res.rawCount;
        }
      }

      // Check legacy rowOverrides if present
      const legOv = comp.rowOverrides?.[b.id];
      if (legOv) {
        if (legOv.straightFt !== undefined) straightFt = legOv.straightFt;
        if (legOv.hookFt !== undefined) hookFt = legOv.hookFt;
        if (legOv.count !== undefined) {
          count = legOv.count;
          roundedFrom = undefined;
        }
      }

      const totalFt = straightFt + hookFt;
      const totalLenFt = totalFt * count;
      const weightLb = uw * totalLenFt;
      const weightKg = weightLb * 0.453592;

      const overriddenFields: string[] = [];
      if (b.overrides?.straightFt !== undefined) overriddenFields.push('straightFt');
      if (b.overrides?.hookFt !== undefined) overriddenFields.push('hookFt');
      const isOverridden = overriddenFields.length > 0;

      // Build working
      const working: WorkStep[] = [
        step('Bar diameter (in)', 'd = barNo/8', `${barNo}/8`, d),
        step('Straight (ft)', 'Calculated length', `${straightFt.toFixed(4)}`, straightFt),
        step('Hook (ft)', 'Calculated hook', `${hookFt.toFixed(4)}`, hookFt),
        step('Total per bar (ft)', 'straight + hook', `${straightFt.toFixed(4)} + ${hookFt.toFixed(4)}`, totalFt),
        step('Count', 'Bar count', `${count}`, count),
        step('Total length (ft)', 'total × count', `${totalFt.toFixed(4)} × ${count}`, totalLenFt),
        step('Unit weight (lb/ft)', 'barNo² / 24', `${barNo}² / 24`, uw),
        step('Weight (lb)', 'unitWeight × totalLen', `${uw.toFixed(6)} × ${totalLenFt.toFixed(4)}`, weightLb),
        step('Weight (kg)', 'lb × 0.453592', `${weightLb.toFixed(4)} × 0.453592`, weightKg),
      ];

      resultRows.push({
        id: b.id,
        componentId: comp.id,
        componentName: comp.name,
        section: `Reinforcement in ${comp.name}`,
        description: b.description,
        barType: b.barType,
        shape: b.shape,
        barNo,
        diaIn: d,
        spacingIn: b.spacingIn,
        count,
        straightFt,
        hookFt,
        hookOption: b.hookOption,
        totalFt,
        totalLenFt,
        unitWeightLbPerFt: uw,
        weightLb,
        weightKg,
        remarks: b.remarks || '',
        working,
        hasNonIntegerCount: !Number.isInteger(count),
        roundedFromCount: roundedFrom,
        isCustom: b.isCustom,
        isOverridden,
        overriddenFields,
      });
    }

    return resultRows;
  }

  // Fallback for legacy components (v2 without comp.bars)
  let baseRows: BbsRow[] = [];
  if (comp.type === 'footing') {
    baseRows = calcFooting(comp.params as FootingInputs);
  } else if (comp.type === 'column') {
    baseRows = calcColumn(comp.params as ColumnInputs, corrections);
  } else if (comp.type === 'beam') {
    baseRows = calcBeam(comp.params as BeamInputs, corrections);
  } else {
    return [];
  }

  const hidden = comp.hiddenRows || [];
  const overrides = comp.rowOverrides || {};
  const visibleBase = baseRows.filter((r) => !hidden.includes(r.id));
  const processedBase: BbsRow[] = visibleBase.map((row) => {
    const ov = overrides[row.id];
    if (!ov) return { ...row, componentId: comp.id, componentName: comp.name };
    const overriddenFields = Object.keys(ov);
    const barNo = ov.barNo ?? row.barNo;
    const spacingIn = ov.spacingIn !== undefined ? ov.spacingIn : row.spacingIn;

    // Reactively compute count if spacing was overridden and count was not explicitly overridden
    let count = ov.count !== undefined
      ? Math.max(1, Math.round(ov.count))
      : row.count;
    if (ov.spacingIn !== undefined && ov.spacingIn !== null && ov.count === undefined && ov.spacingIn > 0) {
      if (comp.type === 'footing') {
        const fp = comp.params as FootingInputs;
        const totalDeductionFt = (2 * fp.coverEachSideIn) / 12;
        if (row.id === 'R1') {
          count = roundUp((fp.B - totalDeductionFt) / (ov.spacingIn / 12) + 1);
        } else if (row.id === 'R2') {
          count = roundUp((fp.L - totalDeductionFt) / (ov.spacingIn / 12) + 1);
        }
      } else if (comp.type === 'column') {
        const cp = comp.params as ColumnInputs;
        if (row.id === 'R4') {
          const raw = ((cp.tieHeightBelowFt / (ov.spacingIn / 12)) + 1) * cp.tieSetsPerLevel;
          count = corrections.roundUpBarCounts ? roundUp(raw) : raw;
        } else if (row.id === 'R6') {
          const netHeight = cp.columnHeightAboveFt - cp.firstTieOffsetFt - (cp.topCoverIn / 12);
          count = roundUp((netHeight / (ov.spacingIn / 12)) + 1) * cp.tieSetsPerLevel;
        }
      } else if (comp.type === 'beam') {
        const bp = comp.params as BeamInputs;
        const zone = (bp.clearSpanFt - bp.stirrupZoneDeductionFt) / 2;
        const rawCount = (zone / (ov.spacingIn / 12)) + 1;
        count = corrections.roundUpBarCounts ? roundUp(rawCount) : rawCount;
      }
    }

    const straightFt = ov.straightFt ?? row.straightFt;
    let hookFt = ov.hookFt ?? row.hookFt;
    if (ov.hookOption && ov.hookOption !== 'custom') {
      hookFt = calcHookFt(ov.hookOption, barNo, hookFt);
    }
    const totalFt = straightFt + hookFt;
    const totalLenFt = totalFt * count;
    const uw = unitWeight(barNo);
    const weightLb = uw * totalLenFt;
    const weightKg = weightLb * 0.453592;
    return {
      ...row,
      componentId: comp.id,
      componentName: comp.name,
      barNo,
      diaIn: diaIn(barNo),
      spacingIn,
      count,
      straightFt,
      hookFt,
      totalFt,
      totalLenFt,
      unitWeightLbPerFt: uw,
      weightLb,
      weightKg,
      hasNonIntegerCount: !Number.isInteger(count),
      isOverridden: true,
      overriddenFields,
    };
  });

  // Append custom rows
  const customProcessed: BbsRow[] = (comp.customRows || []).map((cr) => {
    let hookFt = cr.hookFt;
    if (cr.hookOption && cr.hookOption !== 'custom') {
      hookFt = calcHookFt(cr.hookOption, cr.barNo, hookFt);
    }
    const count = Math.max(1, Math.round(cr.count));
    const totalFt = cr.straightFt + hookFt;
    const totalLenFt = totalFt * count;
    const uw = unitWeight(cr.barNo);
    const weightLb = uw * totalLenFt;
    const weightKg = weightLb * 0.453592;

    return {
      id: cr.id,
      componentId: comp.id,
      componentName: comp.name,
      section: `Reinforcement in ${comp.name}`,
      description: cr.description,
      barType: cr.barType || 'custom',
      shape: cr.shape,
      barNo: cr.barNo,
      diaIn: diaIn(cr.barNo),
      spacingIn: cr.spacingIn,
      count,
      straightFt: cr.straightFt,
      hookFt,
      hookOption: cr.hookOption,
      totalFt,
      totalLenFt,
      unitWeightLbPerFt: uw,
      weightLb,
      weightKg,
      remarks: cr.remarks,
      working: [
        step('Bar diameter', 'd = barNo/8', `d = ${cr.barNo}/8`, diaIn(cr.barNo)),
        step('Total per bar (ft)', 'straight + hook', `${cr.straightFt} + ${hookFt}`, totalFt),
        step('Total length (ft)', 'total × count', `${totalFt.toFixed(6)} × ${count}`, totalLenFt),
        step('Unit weight (lb/ft)', 'barNo² / 24', `${cr.barNo}² / 24`, uw),
        step('Weight (lb)', 'unitWeight × totalLen', `${uw.toFixed(6)} × ${totalLenFt.toFixed(6)}`, weightLb),
        step('Weight (kg)', 'lb × 0.453592', `${weightLb.toFixed(6)} × 0.453592`, weightKg),
      ],
      hasNonIntegerCount: !Number.isInteger(cr.count),
      isCustom: true,
    };
  });

  return [...processedBase, ...customProcessed];
}

export function computeProjectBbs(project: ProjectState): BbsResult {
  const rows: BbsRow[] = [];

  for (const comp of project.components) {
    if (comp.type === 'rates') continue;
    const compRows = computeComponentRows(comp, project.settings.corrections);
    rows.push(...compRows);
  }

  const grandTotalLb = rows.reduce((s, r) => s + r.weightLb, 0);
  const grandTotalKg = rows.reduce((s, r) => s + r.weightKg, 0);

  // Size summary
  const sizeMap = new Map<number, SizeSummary>();
  for (const row of rows) {
    const existing = sizeMap.get(row.barNo);
    if (existing) {
      existing.weightLb += row.weightLb;
      existing.weightKg += row.weightKg;
    } else {
      sizeMap.set(row.barNo, { barNo: row.barNo, weightLb: row.weightLb, weightKg: row.weightKg });
    }
  }
  const bySize = Array.from(sizeMap.values()).sort((a, b) => a.barNo - b.barNo);

  return { rows, grandTotalLb, grandTotalKg, bySize };
}

// Legacy helper for direct component calculation
export function calcBbs(
  footing: FootingInputs,
  column: ColumnInputs,
  beam: BeamInputs,
  corrections: Corrections,
): BbsResult {
  const rows: BbsRow[] = [
    ...calcFooting(footing),
    ...calcColumn(column, corrections),
    ...calcBeam(beam, corrections),
  ];

  const grandTotalLb = rows.reduce((s, r) => s + r.weightLb, 0);
  const grandTotalKg = rows.reduce((s, r) => s + r.weightKg, 0);

  const sizeMap = new Map<number, SizeSummary>();
  for (const row of rows) {
    const existing = sizeMap.get(row.barNo);
    if (existing) {
      existing.weightLb += row.weightLb;
      existing.weightKg += row.weightKg;
    } else {
      sizeMap.set(row.barNo, { barNo: row.barNo, weightLb: row.weightLb, weightKg: row.weightKg });
    }
  }
  const bySize = Array.from(sizeMap.values()).sort((a, b) => a.barNo - b.barNo);

  return { rows, grandTotalLb, grandTotalKg, bySize };
}
