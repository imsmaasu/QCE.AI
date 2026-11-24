// Pure TypeScript engine – types and interfaces.
// Internal units: lengths in decimal feet, bar diameter in inches,
// spacing and cover in inches, weight in lb. kg = lb * 0.453592.

export type ComponentType = 'footing' | 'column' | 'beam' | 'rates';
export type HookRule = 'multiple_of_dia' | 'fixed_length';

export interface WorkStep {
  label: string;
  formulaText: string;
  substitutedText: string;
  value: number;
}

export interface BbsRow {
  id: string; // e.g. R1, R2, or custom ID
  componentId?: string;
  componentName?: string;
  section: string;
  description: string;
  barType?: string; // "top" | "top_extra" | "bottom" | "bottom_extra" | "stirrup" | "ties" | "dowel" | "main" | "dist" | "custom"
  shape: string; // "u" | "L" | "straight" | ""
  barNo: number;
  diaIn: number; // barNo / 8
  spacingIn: number | null; // null = "-"
  count: number;
  straightFt: number;
  hookFt: number;
  hookOption?: string;
  totalFt: number; // straight + hook
  totalLenFt: number; // total * count
  unitWeightLbPerFt: number; // barNo^2 / 24
  weightLb: number;
  weightKg: number;
  remarks: string;
  working: WorkStep[];
  hasNonIntegerCount: boolean;
  roundedFromCount?: number;
  isCustom?: boolean;
  isOverridden?: boolean;
  overriddenFields?: string[];
}

export interface SizeSummary {
  barNo: number;
  weightLb: number;
  weightKg: number;
}

export interface BbsResult {
  rows: BbsRow[];
  grandTotalLb: number;
  grandTotalKg: number;
  bySize: SizeSummary[];
}

// ─── Footing Inputs ───────────────────────────────────────────────────────────
export interface FootingInputs {
  B: number;               // ft, default 4
  L: number;               // ft, default 5
  coverEachSideIn: number; // in, default 0.75 (total deduction 1.5 in)
  mainBarNo: number;       // default 4
  mainSpacingIn: number;   // in, default 4
  distBarNo: number;       // default 4
  distSpacingIn: number;   // in, default 6
  hookRule: HookRule;      // default 'multiple_of_dia'
  hookFactor: number;      // default 12
  fixedHookIn: number;     // default 6
}

export const FOOTING_DEFAULTS: FootingInputs = {
  B: 4,
  L: 5,
  coverEachSideIn: 0.75,
  mainBarNo: 4,
  mainSpacingIn: 4,
  distBarNo: 4,
  distSpacingIn: 6,
  hookRule: 'multiple_of_dia',
  hookFactor: 12,
  fixedHookIn: 6,
};

// Legacy Footing Defaults (where coverEachSide was 1.5 in)
export const FOOTING_LEGACY_DEFAULTS: FootingInputs = {
  ...FOOTING_DEFAULTS,
  coverEachSideIn: 1.5,
};

// ─── Column Inputs ─────────────────────────────────────────────────────────────
export interface ColumnInputs {
  dowelCount: number;         // default 8
  dowelBarNo: number;         // default 4
  depthGLtoFootingFt: number; // default 5
  plinthAboveGLFt: number;    // default 2
  lapFactor: number;           // default 48
  topCoverIn: number;          // default 1.5
  dowelEndAllowanceIn: number; // default 1  (the "-1/12" in Excel)
  hookRule: HookRule;          // default 'multiple_of_dia'
  hookFactor: number;          // default 12
  fixedHookIn: number;         // default 6
  tieBarNo: number;            // default 3
  tieSpacingIn: number;        // default 6
  tieWidthIn: number;          // default 4.5
  tieDepthIn: number;          // default 11
  tieSetsPerLevel: number;     // default 2
  tieHeightBelowFt: number;    // default 6 (= 4+2)
  columnHeightAboveFt: number; // default 10.5
  firstTieOffsetFt: number;    // default 0.5
  coverEachSideIn: number;     // default 0.75 (ties cover)
}

export const COLUMN_DEFAULTS: ColumnInputs = {
  dowelCount: 8,
  dowelBarNo: 4,
  depthGLtoFootingFt: 5,
  plinthAboveGLFt: 2,
  lapFactor: 48,
  topCoverIn: 1.5,
  dowelEndAllowanceIn: 1,
  hookRule: 'multiple_of_dia',
  hookFactor: 12,
  fixedHookIn: 6,
  tieBarNo: 3,
  tieSpacingIn: 6,
  tieWidthIn: 4.5,
  tieDepthIn: 11,
  tieSetsPerLevel: 2,
  tieHeightBelowFt: 6,
  columnHeightAboveFt: 10.5,
  firstTieOffsetFt: 0.5,
  coverEachSideIn: 0.75,
};

// ─── Beam Inputs ───────────────────────────────────────────────────────────────
export interface BeamInputs {
  clearSpanFt: number;           // default 15.5
  columnWidthFt: number;         // default 1.5
  beamWidthIn: number;           // default 8
  beamDepthIn: number;           // default 24
  coverEachSideIn: number;       // default 0.75 (Excel writes 1.5 = 2 x cover)
  endAllowanceIn: number;        // default 3
  hookRule: HookRule;            // default 'fixed_length'
  uBarHookFt: number;            // default 1 (foot) – fixed 12 in each end
  hookFactor: number;            // default 12 (if multiple_of_dia)
  bottomBarNo: number;           // default 5
  bottomBarCount: number;        // default 2
  extraBottomBarNo: number;      // default 5
  extraBottomBarCount: number;   // default 2
  topBarNo: number;              // default 5
  topBarCount: number;           // default 2
  stirrupBarNo: number;          // default 3
  stirrupSpacingEndIn: number;   // default 6
  stirrupSpacingMidIn: number;   // default 9
  stirrupZoneDeductionFt: number;// default 1.5
}

export const BEAM_DEFAULTS: BeamInputs = {
  clearSpanFt: 15.5,
  columnWidthFt: 1.5,
  beamWidthIn: 8,
  beamDepthIn: 24,
  coverEachSideIn: 0.75,
  endAllowanceIn: 3,
  hookRule: 'fixed_length',
  uBarHookFt: 1,
  hookFactor: 12,
  bottomBarNo: 5,
  bottomBarCount: 2,
  extraBottomBarNo: 5,
  extraBottomBarCount: 2,
  topBarNo: 5,
  topBarCount: 2,
  stirrupBarNo: 3,
  stirrupSpacingEndIn: 6,
  stirrupSpacingMidIn: 9,
  stirrupZoneDeductionFt: 1.5,
};

// ─── Rates Inputs ─────────────────────────────────────────────────────────────
export interface RatesInputs {
  steelRateRs: number;    // default 0 (placeholder)
  laborRateRs: number;    // default 0 (placeholder)
  wastagePercent: number; // default 0 (placeholder)
}

export const RATES_DEFAULTS: RatesInputs = {
  steelRateRs: 0,
  laborRateRs: 0,
  wastagePercent: 0,
};

// ─── Corrections ──────────────────────────────────────────────────────────────
export interface Corrections {
  roundUpBarCounts: boolean;       // default true (replaces C1)
  c2StirrupHooksLikeTies: boolean; // default false
}

export const CORRECTIONS_DEFAULTS: Corrections = {
  roundUpBarCounts: true,
  c2StirrupHooksLikeTies: false,
};

// ─── Row Overrides & Custom Rows ──────────────────────────────────────────────
export interface RowOverrideValues {
  barNo?: number;
  spacingIn?: number | null;
  count?: number;
  straightFt?: number;
  hookFt?: number;
  hookOption?: string;
  barType?: string;
  shape?: string;
  description?: string;
}

export interface CustomBbsRow {
  id: string; // e.g. "custom-1700000000"
  description: string;
  barType?: string;
  shape: string;
  barNo: number;
  spacingIn: number | null;
  count: number;
  straightFt: number;
  hookFt: number;
  hookOption?: string;
  remarks: string;
}

export interface BarRowConfig {
  id: string; // e.g. "R1", "R2", "custom-..."
  description: string;
  barType?: string; // "main" | "dist" | "dowel" | "ties" | "bottom" | "bottom_extra" | "top" | "stirrup" | "custom"
  shape: string; // "u" | "L" | "straight" | "stirrup" | ""
  barNo: number; // e.g. 3, 4, 5
  spacingIn: number | null; // null for non-spaced rows ("n/a")
  count: number;
  hookOption: string; // "none" | "9d" | "12d" | "16d" | "18d" | "24d" | "30d" | "fixed_6" | "fixed_12" | "fixed_24" | "custom"
  hookRule?: HookRule;
  hookFactor?: number;
  fixedHookIn?: number;
  overrides?: {
    straightFt?: number;
    hookFt?: number;
  };
  isCustom?: boolean;
  hidden?: boolean;
  remarks?: string;
}

export const DEFAULT_FOOTING_BARS: BarRowConfig[] = [
  {
    id: 'R1',
    description: 'Main Bars (along B)',
    barType: 'main',
    shape: 'u',
    barNo: 4,
    spacingIn: 4,
    count: 13,
    hookOption: '24d',
    hookRule: 'multiple_of_dia',
    hookFactor: 12,
  },
  {
    id: 'R2',
    description: 'Distribution Bars (along L)',
    barType: 'dist',
    shape: 'u',
    barNo: 4,
    spacingIn: 6,
    count: 11,
    hookOption: '24d',
    hookRule: 'multiple_of_dia',
    hookFactor: 12,
  },
];

export const DEFAULT_COLUMN_BARS: BarRowConfig[] = [
  {
    id: 'R3',
    description: 'Dowel Bars (below plinth)',
    barType: 'dowel',
    shape: 'L',
    barNo: 4,
    spacingIn: null,
    count: 8,
    hookOption: '12d',
    hookRule: 'multiple_of_dia',
    hookFactor: 12,
  },
  {
    id: 'R4',
    description: 'Ties up to plinth',
    barType: 'ties',
    shape: 'stirrup',
    barNo: 3,
    spacingIn: 6,
    count: 26,
    hookOption: 'custom',
  },
  {
    id: 'R5',
    description: 'Dowel Bars (above plinth)',
    barType: 'dowel',
    shape: 'straight',
    barNo: 4,
    spacingIn: null,
    count: 8,
    hookOption: '12d',
    hookRule: 'multiple_of_dia',
    hookFactor: 12,
  },
  {
    id: 'R6',
    description: 'Ties above plinth',
    barType: 'ties',
    shape: 'stirrup',
    barNo: 3,
    spacingIn: 6,
    count: 42,
    hookOption: 'custom',
  },
];

export const DEFAULT_BEAM_BARS: BarRowConfig[] = [
  {
    id: 'R7',
    description: 'Bottom Longitudinal Bars',
    barType: 'bottom',
    shape: 'u',
    barNo: 5,
    spacingIn: null,
    count: 2,
    hookOption: 'fixed_24',
    hookRule: 'fixed_length',
  },
  {
    id: 'R8',
    description: 'Extra Bottom Bars',
    barType: 'bottom_extra',
    shape: 'straight',
    barNo: 5,
    spacingIn: null,
    count: 2,
    hookOption: 'none',
  },
  {
    id: 'R9',
    description: 'Top Longitudinal bars',
    barType: 'top',
    shape: 'u',
    barNo: 5,
    spacingIn: null,
    count: 2,
    hookOption: 'fixed_24',
    hookRule: 'fixed_length',
  },
  {
    id: 'R10',
    description: 'Stirrups @ L/4 and 6"c/c',
    barType: 'stirrup',
    shape: 'stirrup',
    barNo: 3,
    spacingIn: 6,
    count: 15,
    hookOption: 'custom',
  },
  {
    id: 'R11',
    description: 'Stirrups @ L/2 and 9"c/c',
    barType: 'stirrup',
    shape: 'stirrup',
    barNo: 3,
    spacingIn: 9,
    count: 11,
    hookOption: 'custom',
  },
];

// ─── Component Instance ───────────────────────────────────────────────────────
export interface ComponentInstance {
  id: string;
  type: ComponentType;
  name: string;
  params: FootingInputs | ColumnInputs | BeamInputs | RatesInputs;
  bars?: BarRowConfig[];
  rowOverrides?: Record<string, RowOverrideValues>; // for backward compat during migration
  customRows?: CustomBbsRow[]; // for backward compat during migration
  hiddenRows?: string[]; // for backward compat during migration
  drawingDetails?: Record<string, unknown>; // drawing-only parameters (e.g. thickness, lean, linkedColumn)
}

// ─── Project Settings & State ─────────────────────────────────────────────────
export interface ProjectSettings {
  corrections: Corrections;
}

export interface ProjectState {
  schemaVersion: number;
  name: string;
  settings: ProjectSettings;
  components: ComponentInstance[];
  theme: 'light' | 'dark';
}
