import { describe, it, expect } from 'vitest';
import { generateView2D } from '../geometry';
import { useProjectStore } from '../store/projectStore';

describe('Milestone 2.2 - Part 3: U-Bar Highlight and Geometric Mark Row IDs', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  const views = [
    { type: 'footing-section' as const, comp: f1, rows: f1Rows },
    { type: 'footing-plan' as const, comp: f1, rows: f1Rows },
    { type: 'column-section' as const, comp: c1, rows: c1Rows },
    { type: 'column-elevation' as const, comp: c1, rows: c1Rows },
    { type: 'beam-elevation' as const, comp: b1, rows: b1Rows },
    { type: 'beam-section' as const, comp: b1, rows: b1Rows },
  ];

  it('guarantees every Line2D and Circle2D in every view has a valid non-empty rowId', () => {
    for (const { type, comp, rows } of views) {
      const v = generateView2D(comp, rows, state.components, type);

      for (const line of v.lines) {
        expect(line.rowId).toBeDefined();
        expect(line.rowId.length).toBeGreaterThan(0);
      }

      for (const circle of v.circles) {
        expect(circle.rowId).toBeDefined();
        expect(circle.rowId.length).toBeGreaterThan(0);
      }
    }
  });

  it('verifies footing U-bars R1 and R2 are present in footing views', () => {
    const sec = generateView2D(f1, f1Rows, state.components, 'footing-section');
    const r1Line = sec.lines.find((l) => l.rowId === 'R1');
    const r2Circle = sec.circles.find((c) => c.rowId === 'R2');
    expect(r1Line).toBeDefined();
    expect(r2Circle).toBeDefined();

    const plan = generateView2D(f1, f1Rows, state.components, 'footing-plan');
    const r1PlanLine = plan.lines.find((l) => l.rowId === 'R1');
    const r2PlanLine = plan.lines.find((l) => l.rowId === 'R2');
    expect(r1PlanLine).toBeDefined();
    expect(r2PlanLine).toBeDefined();
  });

  it('verifies beam U-bars R7 and R9 are present in beam views', () => {
    const elev = generateView2D(b1, b1Rows, state.components, 'beam-elevation');
    const r7Line = elev.lines.find((l) => l.rowId === 'R7');
    const r9Line = elev.lines.find((l) => l.rowId === 'R9');
    expect(r7Line).toBeDefined();
    expect(r9Line).toBeDefined();

    const sec = generateView2D(b1, b1Rows, state.components, 'beam-section');
    const r7Circle = sec.circles.find((c) => c.rowId === 'R7');
    const r9Circle = sec.circles.find((c) => c.rowId === 'R9');
    expect(r7Circle).toBeDefined();
    expect(r9Circle).toBeDefined();
  });
});
