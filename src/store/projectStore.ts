// Zustand project store – multi-instance components, bar configs, undo history, persistence.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ComponentInstance,
  ComponentType,
  ProjectState,
  ProjectSettings,
  FootingInputs,
  ColumnInputs,
  BeamInputs,
  RatesInputs,
  Corrections,
  BbsResult,
  RowOverrideValues,
  CustomBbsRow,
  BarRowConfig,
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  RATES_DEFAULTS,
  CORRECTIONS_DEFAULTS,
  DEFAULT_FOOTING_BARS,
  DEFAULT_COLUMN_BARS,
  DEFAULT_BEAM_BARS,
} from '../engine/types';
import { computeProjectBbs, getRowSpanFt, calcSpacingFromCount } from '../engine/bbs';
import { getAuditNotes, AuditNote } from '../engine/audit';

export const SCHEMA_VERSION = 3;

export interface UndoableAction {
  message: string;
  previousComponents: ComponentInstance[];
}

export type AppTheme = 'system' | 'light' | 'dark';
export type DrawingStyle = 'textbook' | 'simple' | 'color';

export interface ProjectStoreState {
  schemaVersion: 3;
  name: string;
  settings: ProjectSettings;
  components: ComponentInstance[];
  theme: AppTheme;
  drawingStyle: DrawingStyle;

  // UI state
  currentView: 'cards' | 'sheet';
  expandedComponentIds: string[];
  activeComponentId: string | null;
  hoveredRowId: string | null;
  drawingPanelTabMemory: Record<string, string>;
  drawingLabelsOn: Record<string, boolean>;
  undoStack: ComponentInstance[][];
  redoStack: ComponentInstance[][];
  snackbar: { message: string; onUndo: () => void } | null;

  // Derived
  bbsResult: BbsResult;
  notes: AuditNote[];
  rates: RatesInputs;
}

export interface ProjectStoreActions {
  setName: (name: string) => void;
  setTheme: (theme: AppTheme) => void;
  setDrawingStyle: (style: DrawingStyle) => void;
  setCurrentView: (view: 'cards' | 'sheet') => void;
  setCorrections: (patch: Partial<Corrections>) => void;

  toggleExpanded: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setActiveComponentId: (id: string | null) => void;
  setHoveredRowId: (id: string | null) => void;
  setDrawingPanelTab: (componentId: string, tab: string) => void;
  setDrawingLabelsOn: (componentId: string, viewId: string, on: boolean) => void;

  // Component management
  addComponent: (type: ComponentType) => void;
  duplicateComponent: (id: string) => void;
  renameComponent: (id: string, newName: string) => void;
  deleteComponent: (id: string) => void;
  resetComponentToDefaults: (id: string) => void;
  restoreHiddenRows: (id: string) => void;
  updateComponentParams: (id: string, patch: Record<string, unknown>) => void;
  updateDrawingDetails: (id: string, patch: Record<string, unknown>) => void;

  // Bar Rows (Single Source of Truth)
  updateBarRow: (compId: string, rowId: string, patch: Partial<BarRowConfig>) => void;
  setBarLengthOverride: (compId: string, rowId: string, field: 'straightFt' | 'hookFt', value: number) => void;
  resetBarLengthOverride: (compId: string, rowId: string, field?: 'straightFt' | 'hookFt') => void;
  addCustomBarRow: (compId: string, row: Omit<BarRowConfig, 'id'>) => void;
  deleteBarRow: (compId: string, rowId: string) => void;
  restoreHiddenBarRows: (compId: string) => void;

  // Backward-compatible delegates
  updateRowOverride: (compId: string, rowId: string, patch: Partial<RowOverrideValues>) => void;
  resetRowOverride: (compId: string, rowId: string, field?: keyof RowOverrideValues) => void;
  deleteRow: (compId: string, rowId: string) => void;
  addCustomRow: (compId: string, row: Omit<CustomBbsRow, 'id'>) => void;
  updateCustomRow: (compId: string, rowId: string, patch: Partial<CustomBbsRow>) => void;

  // Presets & Serialization
  loadSampleProject: () => void;
  newProject: () => void;
  loadJson: (json: string) => void;
  toJson: () => string;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  clearSnackbar: () => void;
}

export type Store = ProjectStoreState & ProjectStoreActions;

function extractRates(components: ComponentInstance[]): RatesInputs {
  const ratesComp = components.find((c) => c.type === 'rates');
  if (ratesComp) {
    return ratesComp.params as RatesInputs;
  }
  return { ...RATES_DEFAULTS };
}

function recompute(
  components: ComponentInstance[],
  settings: ProjectSettings,
  name: string,
  theme: AppTheme,
): { bbsResult: BbsResult; notes: AuditNote[]; rates: RatesInputs } {
  const project: ProjectState = {
    schemaVersion: 3,
    name,
    settings,
    components,
    theme: theme === 'dark' ? 'dark' : 'light',
  };
  const bbsResult = computeProjectBbs(project);
  const notes = getAuditNotes(bbsResult);
  const rates = extractRates(components);
  return { bbsResult, notes, rates };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateToV3(oldProject: any): {
  components: ComponentInstance[];
  settings: ProjectSettings;
  name: string;
  theme: AppTheme;
} {
  const settings: ProjectSettings = {
    corrections: {
      roundUpBarCounts: true, // A1: MUST default to ON
      c2StirrupHooksLikeTies: Boolean(
        oldProject?.settings?.corrections?.c2StirrupHooksLikeTies ??
          oldProject?.corrections?.c2StirrupBendRule
      ),
    },
  };
  const name = oldProject?.name ?? oldProject?.projectName ?? 'My BBS Project';
  const theme = oldProject?.theme ?? 'system';

  let rawComponents = oldProject?.components;
  if (!rawComponents && (oldProject?.schemaVersion === 1 || !oldProject?.schemaVersion)) {
    rawComponents = [
      {
        id: 'f1',
        type: 'footing',
        name: 'Footing F1',
        params: {
          ...FOOTING_DEFAULTS,
          ...oldProject?.footing,
          coverEachSideIn: oldProject?.footing?.coverIn ?? 0.75,
        },
      },
      {
        id: 'c1',
        type: 'column',
        name: 'Column C1',
        params: { ...COLUMN_DEFAULTS, ...oldProject?.column },
      },
      {
        id: 'b1',
        type: 'beam',
        name: 'Beam B1',
        params: { ...BEAM_DEFAULTS, ...oldProject?.beam },
      },
      {
        id: 'rates-1',
        type: 'rates',
        name: 'Rates',
        params: {
          steelRateRs: oldProject?.steelRateRs ?? 0,
          laborRateRs: oldProject?.laborRateRs ?? 0,
          wastagePercent: oldProject?.wastagePercent ?? 0,
        },
      },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: ComponentInstance[] = (rawComponents ?? []).map((c: any) => {
    if (c.bars && Array.isArray(c.bars) && c.bars.length > 0) {
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        params: { ...c.params },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bars: c.bars.map((b: any) => ({ ...b })),
        drawingDetails: c.drawingDetails ? { ...c.drawingDetails } : undefined,
      };
    }

    let bars: BarRowConfig[] = [];
    if (c.type === 'footing') {
      bars = JSON.parse(JSON.stringify(DEFAULT_FOOTING_BARS));
      if (c.params?.mainBarNo) bars[0].barNo = c.params.mainBarNo;
      if (c.params?.mainSpacingIn) bars[0].spacingIn = c.params.mainSpacingIn;
      if (c.params?.distBarNo) bars[1].barNo = c.params.distBarNo;
      if (c.params?.distSpacingIn) bars[1].spacingIn = c.params.distSpacingIn;
    } else if (c.type === 'column') {
      bars = JSON.parse(JSON.stringify(DEFAULT_COLUMN_BARS));
      if (c.params?.dowelBarNo) {
        bars[0].barNo = c.params.dowelBarNo;
        bars[2].barNo = c.params.dowelBarNo;
      }
      if (c.params?.dowelCount) {
        bars[0].count = c.params.dowelCount;
        bars[2].count = c.params.dowelCount;
      }
      if (c.params?.tieBarNo) {
        bars[1].barNo = c.params.tieBarNo;
        bars[3].barNo = c.params.tieBarNo;
      }
      if (c.params?.tieSpacingIn) {
        bars[1].spacingIn = c.params.tieSpacingIn;
        bars[3].spacingIn = c.params.tieSpacingIn;
      }
    } else if (c.type === 'beam') {
      bars = JSON.parse(JSON.stringify(DEFAULT_BEAM_BARS));
      if (c.params?.bottomBarNo) bars[0].barNo = c.params.bottomBarNo;
      if (c.params?.bottomBarCount) bars[0].count = c.params.bottomBarCount;
      if (c.params?.extraBottomBarNo) bars[1].barNo = c.params.extraBottomBarNo;
      if (c.params?.extraBottomBarCount) bars[1].count = c.params.extraBottomBarCount;
      if (c.params?.topBarNo) bars[2].barNo = c.params.topBarNo;
      if (c.params?.topBarCount) bars[2].count = c.params.topBarCount;
      if (c.params?.stirrupBarNo) {
        bars[3].barNo = c.params.stirrupBarNo;
        bars[4].barNo = c.params.stirrupBarNo;
      }
      if (c.params?.stirrupSpacingEndIn) bars[3].spacingIn = c.params.stirrupSpacingEndIn;
      if (c.params?.stirrupSpacingMidIn) bars[4].spacingIn = c.params.stirrupSpacingMidIn;
    }

    if (c.rowOverrides) {
      for (const bar of bars) {
        const ov = c.rowOverrides[bar.id];
        if (ov) {
          if (ov.barNo !== undefined) bar.barNo = ov.barNo;
          if (ov.spacingIn !== undefined) bar.spacingIn = ov.spacingIn;
          if (ov.count !== undefined) bar.count = ov.count;
          if (ov.shape !== undefined) bar.shape = ov.shape;
          if (ov.hookOption !== undefined) bar.hookOption = ov.hookOption;
          if (ov.straightFt !== undefined || ov.hookFt !== undefined) {
            bar.overrides = {
              straightFt: ov.straightFt,
              hookFt: ov.hookFt,
            };
          }
        }
      }
    }

    if (Array.isArray(c.hiddenRows)) {
      for (const bar of bars) {
        if (c.hiddenRows.includes(bar.id)) {
          bar.hidden = true;
        }
      }
    }

    if (Array.isArray(c.customRows)) {
      for (const cr of c.customRows) {
        bars.push({
          id: cr.id,
          description: cr.description,
          barType: cr.barType || 'custom',
          shape: cr.shape || 'straight',
          barNo: cr.barNo,
          spacingIn: cr.spacingIn,
          count: cr.count,
          hookOption: cr.hookOption || 'none',
          overrides: {
            straightFt: cr.straightFt,
            hookFt: cr.hookFt,
          },
          isCustom: true,
          remarks: cr.remarks,
        });
      }
    }

    return {
      id: c.id,
      type: c.type,
      name: c.name,
      params: { ...c.params },
      bars,
      drawingDetails: c.drawingDetails ? { ...c.drawingDetails } : undefined,
    };
  });

  return { components, settings, name, theme };
}

function createSampleComponents(): ComponentInstance[] {
  return [
    {
      id: 'f1',
      type: 'footing',
      name: 'Footing F1',
      params: { ...FOOTING_DEFAULTS },
      bars: JSON.parse(JSON.stringify(DEFAULT_FOOTING_BARS)),
      drawingDetails: {
        thicknessIn: 12,
        leanThicknessIn: 4,
        leanProjectionIn: 4,
        leanMixLabel: '1:4:8',
        linkedColumnId: 'c1',
        unlinkedDepthGLtoFootingFt: 5,
        unlinkedPlinthAboveGLFt: 2,
      },
    },
    {
      id: 'c1',
      type: 'column',
      name: 'Column C1',
      params: { ...COLUMN_DEFAULTS },
      bars: JSON.parse(JSON.stringify(DEFAULT_COLUMN_BARS)),
      drawingDetails: {
        colWidthIn: 12,
        colDepthIn: 18,
      },
    },
    {
      id: 'b1',
      type: 'beam',
      name: 'Beam B1',
      params: { ...BEAM_DEFAULTS },
      bars: JSON.parse(JSON.stringify(DEFAULT_BEAM_BARS)),
    },
    {
      id: 'rates-1',
      type: 'rates',
      name: 'Rates',
      params: { ...RATES_DEFAULTS },
      bars: [],
    },
  ];
}

const initialSettings: ProjectSettings = {
  corrections: { ...CORRECTIONS_DEFAULTS },
};

const initialComponents: ComponentInstance[] = [];

const initialDerived = recompute(initialComponents, initialSettings, 'My BBS Project', 'light');

const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      return localStorage.getItem(key);
    }
    return memoryStorage[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(key);
    }
    delete memoryStorage[key];
  },
};

export const useProjectStore = create<Store>()(
  persist(
    (set, get) => ({
      schemaVersion: 3,
      name: 'My BBS Project',
      settings: initialSettings,
      components: initialComponents,
      theme: 'system',
      drawingStyle: 'textbook',

      currentView: 'cards',
      expandedComponentIds: [],
      activeComponentId: null,
      hoveredRowId: null,
      drawingPanelTabMemory: {},
      drawingLabelsOn: {},
      undoStack: [],
      redoStack: [],
      snackbar: null,

      bbsResult: initialDerived.bbsResult,
      notes: initialDerived.notes,
      rates: initialDerived.rates,

      setName: (name) => set({ name }),

      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
        set({ theme });
      },

      setDrawingStyle: (drawingStyle) => set({ drawingStyle }),

      setCurrentView: (currentView) => set({ currentView }),

      setCorrections: (patch) =>
        set((s) => {
          const settings = {
            ...s.settings,
            corrections: { ...s.settings.corrections, ...patch },
          };
          const derived = recompute(s.components, settings, s.name, s.theme);
          return { settings, ...derived };
        }),

      toggleExpanded: (id) =>
        set((s) => {
          const exists = s.expandedComponentIds.includes(id);
          const expandedComponentIds = exists
            ? s.expandedComponentIds.filter((item) => item !== id)
            : [...s.expandedComponentIds, id];
          return {
            expandedComponentIds,
            activeComponentId: !exists ? id : s.activeComponentId,
          };
        }),

      setActiveComponentId: (activeComponentId) => set({ activeComponentId }),
      setHoveredRowId: (hoveredRowId) => set({ hoveredRowId }),
      setDrawingPanelTab: (componentId, tab) =>
        set((s) => ({
          drawingPanelTabMemory: {
            ...s.drawingPanelTabMemory,
            [componentId]: tab,
          },
        })),
      setDrawingLabelsOn: (componentId, viewId, on) =>
        set((s) => ({
          drawingLabelsOn: {
            ...s.drawingLabelsOn,
            [`${componentId}:${viewId}`]: on,
          },
        })),

      expandAll: () =>
        set((s) => ({
          expandedComponentIds: s.components.map((c) => c.id),
        })),

      collapseAll: () => set({ expandedComponentIds: [] }),

      addComponent: (type) =>
        set((s) => {
          if (type === 'rates') {
            const existingRates = s.components.find((c) => c.type === 'rates');
            if (existingRates) {
              return {
                expandedComponentIds: Array.from(new Set([...s.expandedComponentIds, existingRates.id])),
              };
            }
          }

          const typeCounts = s.components.filter((c) => c.type === type).length + 1;
          const prefix = type === 'footing' ? 'F' : type === 'column' ? 'C' : type === 'beam' ? 'B' : 'Rates';
          const defaultName = type === 'rates' ? 'Rates' : `${type.charAt(0).toUpperCase() + type.slice(1)} ${prefix}${typeCounts}`;

          let params: FootingInputs | ColumnInputs | BeamInputs | RatesInputs;
          let bars: BarRowConfig[] = [];
          let drawingDetails: Record<string, unknown> | undefined;
          if (type === 'footing') {
            params = { ...FOOTING_DEFAULTS };
            bars = JSON.parse(JSON.stringify(DEFAULT_FOOTING_BARS));
            drawingDetails = {
              thicknessIn: 12,
              leanThicknessIn: 4,
              leanProjectionIn: 4,
              leanMixLabel: '1:4:8',
              linkedColumnId: null,
              unlinkedDepthGLtoFootingFt: 5,
              unlinkedPlinthAboveGLFt: 2,
            };
          } else if (type === 'column') {
            params = { ...COLUMN_DEFAULTS };
            bars = JSON.parse(JSON.stringify(DEFAULT_COLUMN_BARS));
            drawingDetails = {
              colWidthIn: 12,
              colDepthIn: 18,
            };
          } else if (type === 'beam') {
            params = { ...BEAM_DEFAULTS };
            bars = JSON.parse(JSON.stringify(DEFAULT_BEAM_BARS));
          } else {
            params = { ...RATES_DEFAULTS };
            bars = [];
          }

          const newComp: ComponentInstance = {
            id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type,
            name: defaultName,
            params,
            bars,
            drawingDetails,
          };

          const components = [...s.components, newComp];
          const derived = recompute(components, s.settings, s.name, s.theme);
          return {
            components,
            expandedComponentIds: [...s.expandedComponentIds, newComp.id],
            undoStack: [...s.undoStack, s.components],
            redoStack: [],
            ...derived,
          };
        }),

      duplicateComponent: (id) =>
        set((s) => {
          const target = s.components.find((c) => c.id === id);
          if (!target || target.type === 'rates') return {};

          const dupId = `${target.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const dupName = `${target.name} (Copy)`;
          const dupComp: ComponentInstance = {
            ...target,
            id: dupId,
            name: dupName,
            params: { ...target.params },
            bars: (target.bars || []).map((b) => ({ ...b })),
            drawingDetails: target.drawingDetails ? { ...target.drawingDetails } : undefined,
          };

          const index = s.components.findIndex((c) => c.id === id);
          const components = [...s.components];
          components.splice(index + 1, 0, dupComp);

          const derived = recompute(components, s.settings, s.name, s.theme);
          return {
            components,
            expandedComponentIds: [...s.expandedComponentIds, dupId],
            undoStack: [...s.undoStack, s.components],
            redoStack: [],
            ...derived,
          };
        }),

      renameComponent: (id, newName) =>
        set((s) => {
          const components = s.components.map((c) => (c.id === id ? { ...c, name: newName } : c));
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      deleteComponent: (id) =>
        set((s) => {
          const target = s.components.find((c) => c.id === id);
          if (!target) return {};
          const prev = s.components;
          const components = s.components.filter((c) => c.id !== id);
          const derived = recompute(components, s.settings, s.name, s.theme);
          return {
            components,
            expandedComponentIds: s.expandedComponentIds.filter((item) => item !== id),
            undoStack: [...s.undoStack, prev],
            redoStack: [],
            snackbar: {
              message: `Deleted "${target.name}"`,
              onUndo: () => get().undo(),
            },
            ...derived,
          };
        }),

      resetComponentToDefaults: (id) =>
        set((s) => {
          const comp = s.components.find((c) => c.id === id);
          if (!comp) return {};

          let defaultParams: FootingInputs | ColumnInputs | BeamInputs | RatesInputs;
          let defaultBars: BarRowConfig[] = [];
          if (comp.type === 'footing') {
            defaultParams = { ...FOOTING_DEFAULTS };
            defaultBars = JSON.parse(JSON.stringify(DEFAULT_FOOTING_BARS));
          } else if (comp.type === 'column') {
            defaultParams = { ...COLUMN_DEFAULTS };
            defaultBars = JSON.parse(JSON.stringify(DEFAULT_COLUMN_BARS));
          } else if (comp.type === 'beam') {
            defaultParams = { ...BEAM_DEFAULTS };
            defaultBars = JSON.parse(JSON.stringify(DEFAULT_BEAM_BARS));
          } else {
            defaultParams = { ...RATES_DEFAULTS };
            defaultBars = [];
          }

          const components = s.components.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              params: defaultParams,
              bars: defaultBars,
            };
          });

          const derived = recompute(components, s.settings, s.name, s.theme);
          return {
            components,
            undoStack: [...s.undoStack, s.components],
            redoStack: [],
            ...derived,
          };
        }),

      restoreHiddenRows: (id) => get().restoreHiddenBarRows(id),

      updateComponentParams: (id, patch) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              params: { ...c.params, ...patch },
            };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      updateDrawingDetails: (id, patch) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              drawingDetails: { ...(c.drawingDetails || {}), ...patch },
            };
          });
          return { components };
        }),

      // ── Bar Rows Actions ───────────────────────────────────────────────────
      updateBarRow: (compId, rowId, patch) =>
        set((s) => {
          const comp = s.components.find((c) => c.id === compId);
          if (!comp) return {};

          const finalPatch = { ...patch };
          const existingBar = (comp.bars || []).find((b) => b.id === rowId);

          if (
            existingBar &&
            finalPatch.count !== undefined &&
            finalPatch.spacingIn === undefined &&
            existingBar.spacingIn !== null
          ) {
            const spanFt = getRowSpanFt(rowId, comp.type, comp.params);
            if (spanFt !== null && spanFt > 0) {
              const tieSets =
                comp.type === 'column' && (rowId === 'R4' || rowId === 'R6')
                  ? ((comp.params as ColumnInputs).tieSetsPerLevel || 1)
                  : 1;
              const { spacingIn, adjustedCount } = calcSpacingFromCount(
                spanFt,
                finalPatch.count,
                tieSets,
              );
              finalPatch.spacingIn = spacingIn;
              finalPatch.count = adjustedCount;
            }
          }

          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const bars = (c.bars || []).map((b) => {
              if (b.id !== rowId) return b;
              return { ...b, ...finalPatch };
            });
            return { ...c, bars };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      setBarLengthOverride: (compId, rowId, field, value) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const bars = (c.bars || []).map((b) => {
              if (b.id !== rowId) return b;
              const overrides = { ...b.overrides, [field]: value };
              return { ...b, overrides };
            });
            return { ...c, bars };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      resetBarLengthOverride: (compId, rowId, field) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const bars = (c.bars || []).map((b) => {
              if (b.id !== rowId) return b;
              if (!b.overrides) return b;
              const overrides = { ...b.overrides };
              if (field) {
                delete overrides[field];
              } else {
                delete overrides.straightFt;
                delete overrides.hookFt;
              }
              return {
                ...b,
                overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
              };
            });
            return { ...c, bars };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      addCustomBarRow: (compId, row) =>
        set((s) => {
          const newBar: BarRowConfig = {
            ...row,
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            isCustom: true,
          };
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            return {
              ...c,
              bars: [...(c.bars || []), newBar],
            };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      deleteBarRow: (compId, rowId) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const bar = (c.bars || []).find((b) => b.id === rowId);
            if (bar?.isCustom) {
              return {
                ...c,
                bars: (c.bars || []).filter((b) => b.id !== rowId),
              };
            }
            return {
              ...c,
              bars: (c.bars || []).map((b) => (b.id === rowId ? { ...b, hidden: true } : b)),
            };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      restoreHiddenBarRows: (compId) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            return {
              ...c,
              bars: (c.bars || []).map((b) => ({ ...b, hidden: false })),
            };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      // ── Backward-compatible delegates ─────────────────────────────────────
      updateRowOverride: (compId, rowId, patch) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const rowOverrides = {
              ...(c.rowOverrides || {}),
              [rowId]: {
                ...(c.rowOverrides?.[rowId] || {}),
                ...patch,
              },
            };
            return { ...c, rowOverrides };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      resetRowOverride: (compId, rowId, field) =>
        set((s) => {
          const components = s.components.map((c) => {
            if (c.id !== compId) return c;
            const rowOverrides = { ...(c.rowOverrides || {}) };
            if (!field) {
              delete rowOverrides[rowId];
            } else if (rowOverrides[rowId]) {
              const copy = { ...rowOverrides[rowId] };
              delete copy[field];
              if (Object.keys(copy).length === 0) {
                delete rowOverrides[rowId];
              } else {
                rowOverrides[rowId] = copy;
              }
            }
            return { ...c, rowOverrides };
          });
          const derived = recompute(components, s.settings, s.name, s.theme);
          return { components, ...derived };
        }),

      deleteRow: (compId, rowId) => get().deleteBarRow(compId, rowId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addCustomRow: (compId, row) => get().addCustomBarRow(compId, row as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateCustomRow: (compId, rowId, patch) => get().updateBarRow(compId, rowId, patch as any),

      loadSampleProject: () =>
        set((s) => {
          const components = createSampleComponents();
          const derived = recompute(components, s.settings, 'Sample Project (Sir SRK Example)', s.theme);
          return {
            name: 'Sample Project (Sir SRK Example)',
            components,
            expandedComponentIds: [],
            undoStack: [...s.undoStack, s.components],
            redoStack: [],
            ...derived,
          };
        }),

      newProject: () =>
        set((s) => {
          const components: ComponentInstance[] = [];
          const derived = recompute(components, s.settings, 'Untitled Project', s.theme);
          return {
            name: 'Untitled Project',
            components,
            expandedComponentIds: [],
            undoStack: [...s.undoStack, s.components],
            redoStack: [],
            ...derived,
          };
        }),

      loadJson: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          const migrated = migrateToV3(parsed);
          const derived = recompute(migrated.components, migrated.settings, migrated.name, migrated.theme);
          set({
            schemaVersion: 3,
            name: migrated.name,
            settings: migrated.settings,
            components: migrated.components,
            theme: migrated.theme,
            expandedComponentIds: [],
            undoStack: [],
            redoStack: [],
            ...derived,
          });
        } catch (e) {
          alert(`Failed to load JSON file: ${e}`);
        }
      },

      toJson: () => {
        const s = get();
        const exportObj: ProjectState = {
          schemaVersion: 3,
          name: s.name,
          settings: s.settings,
          theme: s.theme === 'dark' ? 'dark' : 'light',
          components: s.components,
        };
        return JSON.stringify(exportObj, null, 2);
      },

      undo: () =>
        set((s) => {
          if (s.undoStack.length === 0) return {};
          const previous = s.undoStack[s.undoStack.length - 1];
          const newUndoStack = s.undoStack.slice(0, -1);
          const redoStack = [...s.redoStack, s.components];
          const derived = recompute(previous, s.settings, s.name, s.theme);
          return {
            components: previous,
            undoStack: newUndoStack,
            redoStack,
            snackbar: null,
            ...derived,
          };
        }),

      redo: () =>
        set((s) => {
          if (s.redoStack.length === 0) return {};
          const next = s.redoStack[s.redoStack.length - 1];
          const newRedoStack = s.redoStack.slice(0, -1);
          const undoStack = [...s.undoStack, s.components];
          const derived = recompute(next, s.settings, s.name, s.theme);
          return {
            components: next,
            undoStack,
            redoStack: newRedoStack,
            snackbar: null,
            ...derived,
          };
        }),

      clearSnackbar: () => set({ snackbar: null }),
    }),
    {
      name: 'qce-project-v3',
      version: 3,
      storage: createJSONStorage(() => safeStorage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persistedState: any, version: number) => {
        if (version < 3 || !persistedState?.schemaVersion || persistedState.schemaVersion < 3) {
          const migrated = migrateToV3(persistedState);
          return {
            ...persistedState,
            schemaVersion: 3,
            settings: migrated.settings,
            components: migrated.components,
            drawingStyle: persistedState?.drawingStyle ?? 'textbook',
          };
        }
        return persistedState;
      },
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        name: s.name,
        settings: s.settings,
        theme: s.theme,
        drawingStyle: s.drawingStyle,
        components: s.components,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.settings?.corrections) {
            state.settings.corrections.roundUpBarCounts = true;
          }
          if (!state.drawingStyle) {
            state.drawingStyle = 'textbook';
          }
          const derived = recompute(state.components, state.settings, state.name, state.theme);
          state.bbsResult = derived.bbsResult;
          state.notes = derived.notes;
          state.rates = derived.rates;
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', state.theme);
          }
        }
      },
    },
  ),
);
