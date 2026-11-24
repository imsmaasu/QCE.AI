import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SvgDraftingCanvas } from '../../components/drawing/SvgDraftingCanvas';
import { generateView2D } from '../../geometry';
import { useProjectStore } from '../../store/projectStore';

describe('Fix 3 & 4: Labels Toggle in Canvas', () => {
  useProjectStore.getState().loadSampleProject();
  const state = useProjectStore.getState();
  const bbsResult = state.bbsResult;

  const f1 = state.components.find((c) => c.type === 'footing')!;
  const f1Rows = bbsResult.rows.filter((r) => r.componentId === f1.id);
  const view = generateView2D(f1, f1Rows, state.components, 'footing-section');

  it('renders leaders and annotations when showLabels === true', () => {
    const html = renderToString(
      React.createElement(SvgDraftingCanvas, {
        view,
        showLabels: true,
      })
    );

    // Leaders and leader texts are rendered
    expect(html).toContain('drafting-leader');
    expect(html).toContain('data-kind="leader-text"');
    expect(html).toContain('drafting-dim');
  });

  it('suppresses leaders and non-dimension text when showLabels === false', () => {
    const html = renderToString(
      React.createElement(SvgDraftingCanvas, {
        view,
        showLabels: false,
      })
    );

    // No leader elements rendered
    expect(html).not.toContain('drafting-leader');
    expect(html).not.toContain('data-kind="leader-text"');

    // Dimension lines and dimension text still render
    expect(html).toContain('drafting-dim');

    // All <text> elements rendered belong strictly to dimension annotations
    const textMatches = html.match(/<text[^>]*>(.*?)<\/text>/g) || [];
    expect(textMatches.length).toBeGreaterThan(0);

    for (const textTag of textMatches) {
      // Must not be a leader text
      expect(textTag).not.toContain('data-kind="leader-text"');
    }
  });
});
