import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../store/projectStore';
import { exportPdf } from '../utils/pdfExport';

describe('Project Store & UI Integration Workflows', () => {
  beforeEach(() => {
    // Reset to fresh untitled project
    useProjectStore.getState().newProject();
  });

  it('starts with 0 components and loads sample project correctly', () => {
    const s = useProjectStore.getState();
    expect(s.components.length).toBe(0);
    expect(s.bbsResult.rows.length).toBe(0);

    // Load sample
    s.loadSampleProject();
    const updated = useProjectStore.getState();
    expect(updated.components.length).toBe(4);
    expect(updated.components.map((c) => c.type)).toEqual(['footing', 'column', 'beam', 'rates']);
    expect(updated.bbsResult.rows.length).toBe(11);
    expect(Math.abs(updated.bbsResult.grandTotalKg - 195.654075)).toBeLessThan(1e-4);
  });

  it('supports expand/collapse toggles', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    const loaded = useProjectStore.getState();
    const f1Id = loaded.components[0].id;

    expect(loaded.expandedComponentIds).not.toContain(f1Id);
    s.toggleExpanded(f1Id);
    expect(useProjectStore.getState().expandedComponentIds).toContain(f1Id);

    s.collapseAll();
    expect(useProjectStore.getState().expandedComponentIds.length).toBe(0);

    s.expandAll();
    expect(useProjectStore.getState().expandedComponentIds.length).toBe(4);
  });

  it('enforces at most one rates component', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    expect(useProjectStore.getState().components.filter((c) => c.type === 'rates').length).toBe(1);

    // Attempt to add another rates component
    s.addComponent('rates');
    expect(useProjectStore.getState().components.filter((c) => c.type === 'rates').length).toBe(1);
  });

  it('handles component deletion with snackbar and undo restoration', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    const beforeCount = useProjectStore.getState().components.length;
    const targetComp = useProjectStore.getState().components[0];

    s.deleteComponent(targetComp.id);
    const afterDelete = useProjectStore.getState();
    expect(afterDelete.components.length).toBe(beforeCount - 1);
    expect(afterDelete.snackbar).not.toBeNull();
    expect(afterDelete.snackbar?.message).toContain(targetComp.name);

    // Undo
    s.undo();
    const afterUndo = useProjectStore.getState();
    expect(afterUndo.components.length).toBe(beforeCount);
    expect(afterUndo.components.some((c) => c.id === targetComp.id)).toBe(true);
  });

  it('supports row overrides and reset across parameter changes', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    const f1 = useProjectStore.getState().components.find((c) => c.type === 'footing')!;
    const r1 = useProjectStore.getState().bbsResult.rows.find((r) => r.componentId === f1.id)!;

    expect(r1.count).toBe(13);

    // Override count to 25
    s.updateRowOverride(f1.id, r1.id, { count: 25 });
    let updatedR1 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === r1.id)!;
    expect(updatedR1.count).toBe(25);

    // Change footing width B from 4 to 6 ft (default non-overridden count would change)
    s.updateComponentParams(f1.id, { B: 6 });
    updatedR1 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === r1.id)!;
    // Overridden count must remain 25
    expect(updatedR1.count).toBe(25);

    // Reset override
    s.resetRowOverride(f1.id, r1.id, 'count');
    updatedR1 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === r1.id)!;
    // Should now reflect computed count for B=6 (ROUNDUP((6 - 0.125)/(4/12) + 1) = 19)
    expect(updatedR1.count).toBe(19);
  });

  it('supports custom rows and built-in row hiding/restoring', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    const f1 = useProjectStore.getState().components.find((c) => c.type === 'footing')!;
    const initialRowsCount = useProjectStore.getState().bbsResult.rows.length;

    // Add custom row
    s.addCustomRow(f1.id, {
      description: 'Extra dowel',
      shape: 'straight',
      barNo: 4,
      spacingIn: 12,
      count: 4,
      straightFt: 5,
      hookFt: 1,
      remarks: 'Test custom',
    });
    expect(useProjectStore.getState().bbsResult.rows.length).toBe(initialRowsCount + 1);

    // Hide built-in row (first row of footing)
    const firstRow = useProjectStore.getState().bbsResult.rows[0];
    s.deleteRow(f1.id, firstRow.id);
    expect(useProjectStore.getState().bbsResult.rows.some((r) => r.id === firstRow.id)).toBe(false);

    // Restore hidden rows
    s.restoreHiddenRows(f1.id);
    expect(useProjectStore.getState().bbsResult.rows.some((r) => r.id === firstRow.id)).toBe(true);
  });

  it('updates bar calculation when roundUpBarCounts and C2 are toggled in settings', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();

    const initialR11 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === 'R11')!;
    expect(initialR11.count).toBe(11);

    // Toggle Round up OFF (Sir legacy mode)
    s.setCorrections({ roundUpBarCounts: false });
    const legacyR11 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === 'R11')!;
    expect(Math.abs(legacyR11.count - 10.333333)).toBeLessThan(1e-4);

    // Toggle C2: Stirrup hook bend deduction
    const initialHookFt = legacyR11.hookFt;
    s.setCorrections({ c2StirrupHooksLikeTies: true });
    const c2R11 = useProjectStore.getState().bbsResult.rows.find((r) => r.id === 'R11')!;
    expect(c2R11.hookFt).toBeLessThan(initialHookFt);
  });

  it('runs PDF export successfully without throwing errors', () => {
    const s = useProjectStore.getState();
    s.loadSampleProject();
    const state = useProjectStore.getState();

    expect(() => {
      exportPdf(state.bbsResult, state.name, state.rates);
    }).not.toThrow();
  });
});
