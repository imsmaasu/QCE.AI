import { describe, it, expect } from 'vitest';
import { generateView2D, DrawingStyle } from '../../geometry';
import { useProjectStore } from '../../store/projectStore';

describe('Fix 1: Three Drawing Styles (Textbook | Simple | Color)', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const c1 = state.components.find((c) => c.type === 'column')!;
  const b1 = state.components.find((c) => c.type === 'beam')!;

  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const c1Rows = bbsResult.rows.filter((r) => r.componentId === c1.id);
  const b1Rows = bbsResult.rows.filter((r) => r.componentId === b1.id);

  const r1ComputedCount = f1Rows.find((r) => r.id === 'R1')!.count;

  const styles: DrawingStyle[] = ['textbook', 'simple', 'color'];

  styles.forEach((style) => {
    describe(`Style mode: ${style}`, () => {
      it(`verifies footing-plan bar counts for ${style}`, () => {
        const v = generateView2D(f1, f1Rows, state.components, 'footing-plan', style);
        const r1Lines = v.lines.filter((l) => l.rowId === 'R1');

        if (style === 'textbook') {
          // Exactly 1 representative bar in textbook mode
          expect(r1Lines.length).toBe(1);
        } else {
          // All bars drawn in simple and color modes
          expect(r1Lines.length).toBe(r1ComputedCount);
        }
      });

      it(`verifies column-elevation bar counts for ${style}`, () => {
        const v = generateView2D(c1, c1Rows, state.components, 'column-elevation', style);
        const r4Lines = v.lines.filter((l) => l.rowId === 'R4');

        if (style === 'textbook') {
          expect(r4Lines.length).toBe(1);
        } else {
          expect(r4Lines.length).toBeGreaterThan(1);
        }
      });

      it(`verifies beam-elevation stirrup counts for ${style}`, () => {
        const v = generateView2D(b1, b1Rows, state.components, 'beam-elevation', style);
        const stirrupLines = v.lines.filter((l) => l.kind === 'stirrup');

        if (style === 'textbook') {
          // 1 stirrup per zone (left, mid, right) -> 3 stirrups
          expect(stirrupLines.length).toBe(3);
        } else {
          // All stirrups drawn
          expect(stirrupLines.length).toBeGreaterThan(3);
        }
      });
    });
  });
});
