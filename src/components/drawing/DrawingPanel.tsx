import { useState, useMemo, useRef, lazy, Suspense } from 'react';
import jsPDF from 'jspdf';
import { useProjectStore } from '../../store/projectStore';
import { generateView2D, buildComponentScene, ViewType } from '../../geometry';
import { SvgDraftingCanvas } from './SvgDraftingCanvas';
import { DrawingDialog } from './DrawingDialog';
import { BbsRow } from '../../engine/types';

const ThreeDViewer = lazy(() => import('./ThreeDViewer'));

export function DrawingPanel() {
  const components = useProjectStore((s) => s.components);
  const activeComponentId = useProjectStore((s) => s.activeComponentId);
  const hoveredRowId = useProjectStore((s) => s.hoveredRowId);
  const setHoveredRowId = useProjectStore((s) => s.setHoveredRowId);
  const drawingStyle = useProjectStore((s) => s.drawingStyle);
  const setDrawingStyle = useProjectStore((s) => s.setDrawingStyle);
  const drawingPanelTabMemory = useProjectStore((s) => s.drawingPanelTabMemory);
  const setDrawingPanelTab = useProjectStore((s) => s.setDrawingPanelTab);
  const drawingLabelsOn = useProjectStore((s) => s.drawingLabelsOn);
  const setDrawingLabelsOn = useProjectStore((s) => s.setDrawingLabelsOn);
  const bbsResult = useProjectStore((s) => s.bbsResult);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const getSvgBlobUrl = (): { blobUrl: string; width: number; height: number } | null => {
    if (!canvasContainerRef.current) return null;
    const svgEl = canvasContainerRef.current.querySelector('svg');
    if (!svgEl) return null;

    const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Use viewBox or bounding client rect
    const viewBox = svgEl.viewBox?.baseVal;
    const width = viewBox && viewBox.width > 0 ? viewBox.width : svgEl.clientWidth || 800;
    const height = viewBox && viewBox.height > 0 ? viewBox.height : svgEl.clientHeight || 600;

    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    // Ensure opaque white background behind geometry
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#FFFFFF');
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    return {
      blobUrl: URL.createObjectURL(svgBlob),
      width,
      height,
    };
  };

  const handleSavePng = () => {
    const data = getSvgBlobUrl();
    if (!data || !activeComponent) return;

    const { blobUrl, width, height } = data;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const scale = 2; // 2x device pixel ratio for crisp rendering
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `QCE_${activeComponent.name}_${currentTab}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');
      }
      URL.revokeObjectURL(blobUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
    };

    img.src = blobUrl;
  };

  const handleExportPdf = () => {
    const data = getSvgBlobUrl();
    if (!data || !activeComponent) return;

    const { blobUrl, width, height } = data;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = canvas.toDataURL('image/png');

        // Landscape A3: 420 x 297 mm
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a3',
        });

        const pageWidth = 420;
        const pageHeight = 297;
        const margin = 15;
        const availWidth = pageWidth - 2 * margin;
        const availHeight = pageHeight - 2 * margin - 15;

        // Title and meta
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(`QCE — ${activeComponent.name} (${currentTab.toUpperCase()})`, margin, margin + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        const dateStr = new Date().toISOString().slice(0, 10);
        pdf.text(`Style: ${drawingStyle.toUpperCase()} | Generated: ${dateStr}`, margin, margin + 10);

        // Aspect fit image
        const aspect = width / height;
        let targetW = availWidth;
        let targetH = availWidth / aspect;
        if (targetH > availHeight) {
          targetH = availHeight;
          targetW = availHeight * aspect;
        }
        const xPos = margin + (availWidth - targetW) / 2;
        const yPos = margin + 14 + (availHeight - targetH) / 2;

        pdf.addImage(imgData, 'PNG', xPos, yPos, targetW, targetH);
        pdf.save(`QCE_${activeComponent.name}_${currentTab}_${dateStr}.pdf`);
      }
      URL.revokeObjectURL(blobUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
    };

    img.src = blobUrl;
  };

  // Pick active component or fall back to first non-rates component if available
  const activeComponent = useMemo(() => {
    if (activeComponentId) {
      const found = components.find((c) => c.id === activeComponentId);
      if (found && found.type !== 'rates') return found;
    }
    // Default to first visual component
    return components.find((c) => c.type !== 'rates') || null;
  }, [components, activeComponentId]);

  // Tabs for the active component
  const tabs = useMemo(() => {
    if (!activeComponent) return [];
    switch (activeComponent.type) {
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
  }, [activeComponent]);

  // Active tab with memory per component
  const currentTab = useMemo(() => {
    if (!activeComponent || tabs.length === 0) return '';
    const remembered = drawingPanelTabMemory[activeComponent.id];
    if (remembered && tabs.some((t) => t.id === remembered)) {
      return remembered;
    }
    return tabs[0].id;
  }, [activeComponent, drawingPanelTabMemory, tabs]);

  const handleSelectTab = (tabId: string) => {
    setIs3DMode(false);
    if (activeComponent) {
      setDrawingPanelTab(activeComponent.id, tabId);
    }
  };

  // Rows for active component
  const computedRows: BbsRow[] = useMemo(() => {
    if (!activeComponent) return [];
    return bbsResult.rows.filter((r) => r.componentId === activeComponent.id);
  }, [bbsResult.rows, activeComponent]);

  // 3D Scene
  const scene3D = useMemo(() => {
    if (!activeComponent) return null;
    return buildComponentScene(activeComponent, computedRows, components);
  }, [activeComponent, computedRows, components]);

  // 2D View
  const view2D = useMemo(() => {
    if (!activeComponent || !currentTab) return null;
    return generateView2D(activeComponent, computedRows, components, currentTab as ViewType, drawingStyle);
  }, [activeComponent, computedRows, components, currentTab, drawingStyle]);

  // Type tick color
  const typeTickColor = useMemo(() => {
    if (!activeComponent) return 'var(--text-muted, #8A8A94)';
    switch (activeComponent.type) {
      case 'footing':
        return '#C08A3E';
      case 'column':
        return '#3C8D93';
      case 'beam':
        return '#7A6BC4';
      default:
        return '#8A8A94';
    }
  }, [activeComponent]);

  if (!activeComponent || !view2D) {
    return (
      <div
        className="drawing-panel-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px 20px',
          textAlign: 'center',
          color: 'var(--text-muted, #76767E)',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.5, marginBottom: '12px' }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>Live Drawing Panel</div>
        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
          Select or hover a component to see its drawing
        </div>
      </div>
    );
  }

  const labelsKey = `${activeComponent?.id}:${currentTab}`;
  const showLabels = activeComponent ? (drawingLabelsOn[labelsKey] ?? true) : true;

  // Determine drawn row IDs in this view
  const drawnRowIds = new Set<string>();
  view2D.lines.forEach((l) => drawnRowIds.add(l.rowId));
  view2D.circles.forEach((c) => drawnRowIds.add(c.rowId));

  return (
    <div
      className="drawing-panel-inner"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface, #FFFFFF)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--hairline, #E9E9ED)',
          backgroundColor: 'var(--bg-page, #FAFAFB)',
          flexShrink: 0,
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Component Title & Type Tick */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '3px',
              height: '18px',
              borderRadius: '999px',
              backgroundColor: typeTickColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary, #17171A)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeComponent.name}
          </span>
        </div>

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
              onClick={() => handleSelectTab(tab.id)}
              style={{
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: currentTab === tab.id ? 600 : 400,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: currentTab === tab.id ? 'var(--bg-surface, #FFFFFF)' : 'transparent',
                color: currentTab === tab.id ? 'var(--accent-text, #3B4A8C)' : 'var(--text-muted, #76767E)',
                boxShadow: currentTab === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Style switch, Labels toggle & Modal Expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* 3-Button Style Switcher */}
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
                    padding: '2px 7px',
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

          {/* Labels Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (activeComponent) {
                setDrawingLabelsOn(activeComponent.id, currentTab, !showLabels);
              }
            }}
            title={showLabels ? 'Hide leaders and annotations' : 'Show leaders and annotations'}
            aria-label="Toggle drawing labels"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--hairline, #E9E9ED)',
              backgroundColor: showLabels ? 'var(--bg-surface, #FFFFFF)' : 'var(--bg-field, #F3F3F6)',
              color: showLabels ? 'var(--text-primary, #17171A)' : 'var(--text-muted, #76767E)',
              cursor: 'pointer',
              boxShadow: showLabels ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {showLabels ? 'Labels ✓' : 'Labels —'}
          </button>

          {/* Imagine 3D Button (Visible only for structural members, not rates) */}
          {activeComponent && activeComponent.type !== 'rates' && (
            <button
              type="button"
              onClick={() => setIs3DMode((prev) => !prev)}
              title={is3DMode ? 'Return to 2D view' : 'Imagine 3D Rebar Cage'}
              aria-label="Toggle 3D View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: is3DMode ? '1px solid var(--accent, #2563EB)' : '1px solid var(--hairline, #E9E9ED)',
                backgroundColor: is3DMode ? 'var(--accent, #2563EB)' : 'var(--bg-field, #F3F3F6)',
                color: is3DMode ? '#FFFFFF' : 'var(--text-primary, #17171A)',
                cursor: 'pointer',
                boxShadow: is3DMode ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              {is3DMode ? '2D View' : 'Imagine 3D'}
            </button>
          )}

          {/* Save PNG Button */}
          <button
            type="button"
            className="btn-icon"
            onClick={handleSavePng}
            title="Save PNG (2x resolution)"
            aria-label="Save drawing as PNG"
            style={{ width: '28px', height: '28px' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            className="btn-icon"
            onClick={handleExportPdf}
            title="Export drawing as A3 Landscape PDF"
            aria-label="Export drawing as PDF"
            style={{ width: '28px', height: '28px' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => setDialogOpen(true)}
            title="Expand drawing (full modal)"
            aria-label="Expand drawing view"
            style={{ width: '28px', height: '28px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Drawing Canvas / 3D Viewport */}
      <div
        ref={canvasContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          padding: is3DMode ? 0 : '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: is3DMode ? 'var(--bg-surface, #FAFAFB)' : drawingStyle === 'textbook' ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)',
          overflow: 'hidden',
          minHeight: '260px',
        }}
      >
        {is3DMode && scene3D ? (
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-muted, #76767E)',
                  fontSize: '13px',
                }}
              >
                Loading 3D model...
              </div>
            }
          >
            <ThreeDViewer scene={scene3D} />
          </Suspense>
        ) : (
          <SvgDraftingCanvas
            view={view2D}
            highlightedRowId={hoveredRowId}
            onHighlightRow={setHoveredRowId}
            drawingStyle={drawingStyle}
            showLabels={showLabels}
          />
        )}
      </div>

      {/* HTML Site View Footer: General Notes + Title Block */}
      {!is3DMode && view2D.siteView && (
        <div
          className="site-view-html-footer"
          style={{
            borderTop: '2px solid var(--text-primary, #000000)',
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px',
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
            flexShrink: 0,
          }}
        >
          {/* General Notes */}
          <div style={{ lineHeight: 1.45, color: 'var(--text-secondary, #333333)' }}>
            <div style={{ fontWeight: 700, letterSpacing: '0.04em', marginBottom: '2px', color: 'var(--text-primary, #000000)' }}>
              GENERAL CONSTRUCTION NOTES:
            </div>
            <div>1. All dimensions are in inches unless specified otherwise.</div>
            <div>2. Concrete: 1:2:4 mix (fc = 3,000 psi) with 3/4" aggregate.</div>
            <div>3. Lean concrete: 1:4:8 mix under footings.</div>
            <div>4. Steel: Deformed grade 60 rebars (fy = 60,000 psi).</div>
            <div>5. Clear cover: Footing 3.0", Column 1.5", Beam 1.5".</div>
            <div>6. Lap splice minimum 40×dia or as detailed.</div>
          </div>

          {/* 2-Column Title Block */}
          <div
            style={{
              borderTop: '1px solid var(--hairline, #E9E9ED)',
              paddingTop: '6px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary, #000000)', fontSize: '11.5px' }}>
                {activeComponent.name.toUpperCase()} REINFORCEMENT WORKING DRAWING
              </div>
              <div style={{ color: 'var(--text-muted, #76767E)', fontSize: '10.5px' }}>
                A3 LANDSCAPE WORKING SHEET &nbsp;|&nbsp; DRG NO: S-01
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary, #000000)', fontSize: '10.5px' }}>
                NED UNIVERSITY OF ENGINEERING & TECHNOLOGY
              </div>
              <div style={{ color: 'var(--text-muted, #76767E)', fontSize: '10px' }}>
                Dept. of Civil Engineering &nbsp;|&nbsp; DRAWN BY: STUDENT &nbsp;|&nbsp; CHECKED: SIR SHAHRUKH
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HTML Notes Caption (Non-Site Views) */}
      {!view2D.siteView && view2D.notes && view2D.notes.length > 0 && (
        <div
          className="drawing-notes-caption"
          style={{
            padding: '5px 14px',
            fontSize: '11px',
            color: 'var(--text-muted, #76767E)',
            fontStyle: 'italic',
            borderTop: '1px solid var(--hairline, #E9E9ED)',
            backgroundColor: 'var(--bg-page, #FAFAFB)',
            flexShrink: 0,
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
          padding: '8px 14px',
          backgroundColor: 'var(--bg-page, #FAFAFB)',
          borderTop: '1px solid var(--hairline, #E9E9ED)',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted, #76767E)', marginRight: '4px' }}>
          BARS:
        </span>

        {computedRows.map((row) => {
          const isDrawn = drawnRowIds.has(row.id);
          const isHighlighted = hoveredRowId === row.id;

          return (
            <button
              key={row.id}
              type="button"
              onMouseEnter={() => setHoveredRowId(row.id)}
              onMouseLeave={() => setHoveredRowId(null)}
              onClick={() => setHoveredRowId(isHighlighted ? null : row.id)}
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
      </div>

      {/* Expanded Modal Dialog */}
      <DrawingDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        view={view2D}
        viewTitle={`${activeComponent.name} — ${view2D.title}`}
        tabs={tabs}
        activeTab={currentTab}
        onSelectTab={handleSelectTab}
        highlightedRowId={hoveredRowId}
        onHighlightRow={setHoveredRowId}
      />
    </div>
  );
}
