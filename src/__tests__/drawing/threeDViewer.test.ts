import { describe, it, expect } from 'vitest';
import {
  buildFootingScene,
  buildColumnScene,
  buildBeamScene,
  buildComponentScene,
} from '../../geometry';
import { useProjectStore } from '../../store/projectStore';

describe('Milestone 3: Interactive 3D Model Scene Geometry', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  it('buildFootingScene returns a scene with bars.length > 0 and solids.length > 0', () => {
    const scene = buildFootingScene(f1, f1Rows, state.components);

    expect(scene.solids.length).toBeGreaterThan(0);
    expect(scene.bars.length).toBeGreaterThan(0);

    // Verify concrete solids have valid 3D bounding boxes
    for (const solid of scene.solids) {
      expect(solid.max[0]).toBeGreaterThan(solid.min[0]);
      expect(solid.max[1]).toBeGreaterThan(solid.min[1]);
      expect(solid.max[2]).toBeGreaterThan(solid.min[2]);
    }

    // Verify bars have valid 3D coordinates and diameters
    for (const bar of scene.bars) {
      expect(bar.points.length).toBeGreaterThanOrEqual(2);
      expect(bar.diaIn).toBeGreaterThan(0);
      expect(bar.rowId).toBeDefined();
    }
  });

  it('buildColumnScene returns a scene with bars.length > 0 and solids.length > 0', () => {
    const scene = buildColumnScene(c1, c1Rows);

    expect(scene.solids.length).toBeGreaterThan(0);
    expect(scene.bars.length).toBeGreaterThan(0);

    const dowels = scene.bars.filter((b) => b.kind === 'dowel');
    const ties = scene.bars.filter((b) => b.kind === 'tie');

    expect(dowels.length).toBeGreaterThan(0);
    expect(ties.length).toBeGreaterThan(0);

    // Verify ties form closed loops (first point equals last point)
    for (const tie of ties) {
      expect(tie.points.length).toBe(5);
      expect(tie.points[0][0]).toBeCloseTo(tie.points[4][0]);
      expect(tie.points[0][2]).toBeCloseTo(tie.points[4][2]);
    }
  });

  it('buildBeamScene returns a scene with bars.length > 0 and solids.length > 0', () => {
    const scene = buildBeamScene(b1, b1Rows);

    expect(scene.solids.length).toBeGreaterThan(0);
    expect(scene.bars.length).toBeGreaterThan(0);

    const topBars = scene.bars.filter((b) => b.kind === 'top');
    const botBars = scene.bars.filter((b) => b.kind === 'bottom');
    const stirrups = scene.bars.filter((b) => b.kind === 'stirrup');

    expect(topBars.length).toBeGreaterThan(0);
    expect(botBars.length).toBeGreaterThan(0);
    expect(stirrups.length).toBeGreaterThan(0);

    for (const s of stirrups) {
      expect(s.points.length).toBe(5); // closed rectangular stirrup loop
    }
  });

  it('buildComponentScene dispatches correctly for all three component types', () => {
    const fScene = buildComponentScene(f1, f1Rows, state.components);
    const cScene = buildComponentScene(c1, c1Rows, state.components);
    const bScene = buildComponentScene(b1, b1Rows, state.components);

    expect(fScene.title.toLowerCase()).toContain('footing');
    expect(cScene.title.toLowerCase()).toContain('column');
    expect(bScene.title.toLowerCase()).toContain('beam');
  });
});
