import { useState, useMemo } from 'react';
import { ComponentInstance, BbsRow } from '../../engine/types';
import { useProjectStore } from '../../store/projectStore';
import { generateView2D, ViewType } from '../../geometry';
import { SvgDraftingCanvas } from './SvgDraftingCanvas';
import { DrawingDialog } from './DrawingDialog';

interface DrawingPreviewProps {
  component: ComponentInstance;
  highlightedRowId?: string | null;
  onHighlightRow?: (rowId: string | null) => void;
}

export function DrawingPreview({
  component,
  highlightedRowId: propHighlightedRowId,
  onHighlightRow: propOnHighlightRow,
}: DrawingPreviewProps) {
  const allComponents = useProjectStore((s) => s.components);
  const bbsResult = useProjectStore((s) => s.bbsResult);
  const drawingStyle = useProjectStore((s) => s.drawingStyle);
  const setDrawingStyle = useProjectStore((s) => s.setDrawingStyle);
  const storeHoveredRowId = useProjectStore((s) => s.hoveredRowId);
  const setStoreHoveredRowId = useProjectStore((s) => s.setHoveredRowId);

  const highlightedRowId = propHighlightedRowId !== undefined ? propHighlightedRowId : storeHoveredRowId;
  const onHighlightRow = propOnHighlightRow !== undefined ? propOnHighlightRow : setStoreHoveredRowId;

  // Tabs per component type
  const tabs = useMemo(() => {
    switch (component.type) {
      case 'footing':
        return [
          { id: 'footing-section', label: 'Section' },
          { id: 'footing-plan', label: 'Plan' },
          { id: 'site', label: 'Site View' },
        ];
      case 'column':
        return [
          { id: 'column-section', label: 'Section' },
          { id: 'column-elevation', label: 'Elevation' },
          { id: 'site', label: 'Site View' },
        ];
      case 'beam':
        return [
          { id: 'beam-elevation', label: 'Elevation' },
          { id: 'beam-section', label: 'Section A-A' },
          { id: 'site', label: 'Site View' },
        ];
      default:
        return [];
    }
  }, [component.type]);

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? '');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  // Computed rows for this component
  const computedRows: BbsRow[] = useMemo(() => {
    return bbsResult.rows.filter((r) => r.componentId === component.id);
  }, [bbsResult.rows, component.id]);

  // Generate 2D View
  const view2D = useMemo(() => {
    if (!activeTab) return null;
    return generateView2D(component, computedRows, allComponents, activeTab as ViewType, drawingStyle);
  }, [component, computedRows, allComponents, activeTab, drawingStyle]);

  if (!view2D || tabs.length === 0) return null;

  // Determine drawn row IDs in this view
  const drawnRowIds = new Set<string>();
  view2D.lines.forEach((l) => drawnRowIds.add(l.rowId));
  view2D.circles.forEach((c) => drawnRowIds.add(c.rowId));

  return (
    <div
      className="drawing-preview-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        border: '1px solid var(--hairline, #E9E9ED)',
        backgroundColor: 'var(--bg-field, #F3F3F6)',
        overflow: 'hidden',
        marginBottom: '20px',
      }}
    >
      {/* Header bar: Tabs & Expand icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--hairline, #E9E9ED)',
          backgroundColor: 'var(--bg-page, #FAFAFB)',
        }}
      >
        {/* View Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-field, #F3F3F6)',
            padding: '2px',
            borderRadius: '6px',
            gap: '2px',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'var(--bg-surface, #FFFFFF)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-text, #3B4A8C)' : 'var(--text-muted, #76767E)',
                boxShadow: activeTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Style switch & Expand Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Style switch: Textbook / Simple / Color */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-field, #F3F3F6)',
              padding: '2px',
              borderRadius: '6px',
              gap: '2px',
            }}
          >
            {(['textbook', 'simple', 'color'] as const).map((styleOpt) => {
              const isSelected = drawingStyle === styleOpt;
              const label = styleOpt.charAt(0).toUpperCase() + styleOpt.slice(1);
              return (
                <button
                  key={styleOpt}
                  type="button"
                  onClick={() => setDrawingStyle(styleOpt)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 600 : 400,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: isSelected ? 'var(--bg-surface, #FFFFFF)' : 'transparent',
                    color: isSelected
                      ? styleOpt === 'color'
                        ? 'var(--accent-text, #3B4A8C)'
                        : 'var(--text-primary, #17171A)'
                      : 'var(--text-muted, #76767E)',
                    boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={() => setDialogOpen(true)}
            title="Expand drawing (full modal)"
            aria-label="Expand drawing view"
            style={{ width: '26px', height: '26px' }}
          >
            {/* Expand / Maximize icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Drawing Canvas Preview Box (~260px) */}
      <div
        style={{
          height: '260px',
          backgroundColor: drawingStyle === 'textbook' ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)',
          position: 'relative',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgDraftingCanvas
          view={view2D}
          highlightedRowId={highlightedRowId}
          onHighlightRow={onHighlightRow}
          drawingStyle={drawingStyle}
        />
      </div>

      {/* HTML Notes Caption */}
      {view2D.notes && view2D.notes.length > 0 && (
        <div
          className="drawing-notes-caption"
          style={{
            padding: '4px 12px',
            fontSize: '11px',
            color: 'var(--text-muted, #76767E)',
            fontStyle: 'italic',
            borderTop: '1px solid var(--hairline, #E9E9ED)',
            backgroundColor: 'var(--bg-page, #FAFAFB)',
          }}
        >
          {view2D.notes.map((note, idx) => (
            <div key={idx}>* {note}</div>
          ))}
        </div>
      )}

      {/* Legend Chips Under Drawing */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-page, #FAFAFB)',
          borderTop: '1px solid var(--hairline, #E9E9ED)',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted, #76767E)', marginRight: '4px' }}>
          BARS:
        </span>

        {/* Built-in rows */}
        {computedRows.map((row) => {
          const isDrawn = drawnRowIds.has(row.id);
          const isHighlighted = highlightedRowId === row.id;

          return (
            <button
              key={row.id}
              type="button"
              onMouseEnter={() => onHighlightRow?.(row.id)}
              onMouseLeave={() => onHighlightRow?.(null)}
              onClick={() => onHighlightRow?.(isHighlighted ? null : row.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                border: isHighlighted
                  ? '1px solid var(--accent, #3B4A8C)'
                  : '1px solid var(--hairline, #E9E9ED)',
                backgroundColor: isHighlighted
                  ? 'var(--accent-wash, #EEF1FF)'
                  : 'var(--bg-surface, #FFFFFF)',
                color: isHighlighted
                  ? 'var(--accent-text, #3B4A8C)'
                  : isDrawn
                  ? 'var(--text-primary, #17171A)'
                  : 'var(--text-muted, #76767E)',
                cursor: isDrawn ? 'pointer' : 'default',
                opacity: isDrawn ? 1 : 0.65,
                transition: 'all 0.12s ease',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isDrawn
                    ? isHighlighted
                      ? 'var(--accent, #3B4A8C)'
                      : '#3B4A8C'
                    : '#A0A0AA',
                }}
              />
              <span style={{ fontWeight: 600 }}>{row.id}</span>
              <span style={{ color: 'var(--text-muted, #76767E)' }}>
                {row.barNo ? `#${row.barNo}` : ''}
              </span>
              {!isDrawn && <span style={{ fontSize: '9.5px', fontStyle: 'italic' }}>(not in view)</span>}
            </button>
          );
        })}

        {/* Custom rows */}
        {component.customRows?.map((crow) => (
          <div
            key={crow.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              border: '1px dashed var(--hairline, #E9E9ED)',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-muted, #76767E)',
              opacity: 0.75,
            }}
          >
            <span style={{ fontWeight: 500 }}>{crow.description || 'Custom bar'}</span>
            <span style={{ fontSize: '9.5px', fontStyle: 'italic' }}>(not drawn)</span>
          </div>
        ))}
      </div>

      {/* Expanded Modal Dialog */}
      <DrawingDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        view={view2D}
        viewTitle={`${component.name} — ${view2D.title}`}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        highlightedRowId={highlightedRowId}
        onHighlightRow={onHighlightRow}
      />
    </div>
  );
}
