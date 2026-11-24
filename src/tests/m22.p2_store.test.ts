import { describe, it, expect } from 'vitest';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.2 - Part 2: Right Sticky Panel Store & Tab Memory', () => {
  it('updates activeComponentId correctly', () => {
    const store = useProjectStore.getState();
    store.setActiveComponentId('c1');
    expect(useProjectStore.getState().activeComponentId).toBe('c1');

    store.setActiveComponentId('b1');
    expect(useProjectStore.getState().activeComponentId).toBe('b1');

    store.setActiveComponentId(null);
    expect(useProjectStore.getState().activeComponentId).toBeNull();
  });

  it('updates hoveredRowId bidirectionally', () => {
    const store = useProjectStore.getState();
    store.setHoveredRowId('R1');
    expect(useProjectStore.getState().hoveredRowId).toBe('R1');

    store.setHoveredRowId(null);
    expect(useProjectStore.getState().hoveredRowId).toBeNull();
  });

  it('maintains per-component drawing tab memory', () => {
    const store = useProjectStore.getState();
    store.setDrawingPanelTab('f1', 'footing-plan');
    store.setDrawingPanelTab('c1', 'column-elevation');
    store.setDrawingPanelTab('b1', 'beam-section');

    const state = useProjectStore.getState();
    expect(state.drawingPanelTabMemory['f1']).toBe('footing-plan');
    expect(state.drawingPanelTabMemory['c1']).toBe('column-elevation');
    expect(state.drawingPanelTabMemory['b1']).toBe('beam-section');
  });

  it('sets activeComponentId when expanding a component', () => {
    const store = useProjectStore.getState();
    store.setActiveComponentId(null);
    store.toggleExpanded('c1');
    expect(useProjectStore.getState().activeComponentId).toBe('c1');
  });
});
