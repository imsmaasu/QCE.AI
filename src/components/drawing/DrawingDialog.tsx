import React, { useState, useRef, useEffect } from 'react';
import { View2D } from '../../geometry/types';
import { useProjectStore } from '../../store/projectStore';
import { SvgDraftingCanvas } from './SvgDraftingCanvas';

interface DrawingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  view: View2D;
  viewTitle: string;
  tabs: { id: string; label: string }[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  highlightedRowId?: string | null;
  onHighlightRow?: (rowId: string | null) => void;
}

export function DrawingDialog({
  isOpen,
  onClose,
  view,
  viewTitle,
  tabs,
  activeTab,
  onSelectTab,
  highlightedRowId,
  onHighlightRow,
}: DrawingDialogProps) {
  const drawingStyle = useProjectStore((s) => s.drawingStyle);
  const setDrawingStyle = useProjectStore((s) => s.setDrawingStyle);
  const activeComponentId = useProjectStore((s) => s.activeComponentId);
  const drawingLabelsOn = useProjectStore((s) => s.drawingLabelsOn);
  const setDrawingLabelsOn = useProjectStore((s) => s.setDrawingLabelsOn);

  const labelsKey = `${activeComponentId}:${activeTab}`;
  const showLabels = drawingLabelsOn[labelsKey] ?? true;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom & pan when tab or modal changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(6, Math.max(0.3, prev * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(6, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z / 1.25));
  const handleResetFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleOneToOne = () => {
    setZoom(1.5);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      className="drawing-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 15, 18, 0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        className="drawing-modal-panel"
        style={{
          width: '94vw',
          height: '90vh',
          maxWidth: '1440px',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--hairline, #E9E9ED)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.28)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--hairline, #E9E9ED)',
            backgroundColor: 'var(--bg-page, #FAFAFB)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Title & Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary, #17171A)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '240px',
              }}
              title={viewTitle}
            >
              {viewTitle}
            </h3>

            {/* View Tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-field, #F3F3F6)',
                padding: '2px',
                borderRadius: '8px',
                gap: '2px',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: activeTab === tab.id ? 'var(--bg-surface, #FFFFFF)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent-text, #3B4A8C)' : 'var(--text-muted, #76767E)',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Style switch, Zoom, Fit, 1:1, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 3-Button Style Switcher */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-field, #F3F3F6)',
                padding: '2px',
                borderRadius: '8px',
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
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 600 : 400,
                      borderRadius: '6px',
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

            {/* Labels Toggle */}
            <button
              type="button"
              onClick={() => {
                if (activeComponentId) {
                  setDrawingLabelsOn(activeComponentId, activeTab, !showLabels);
                }
              }}
              title={showLabels ? 'Hide leaders and annotations' : 'Show leaders and annotations'}
              aria-label="Toggle drawing labels"
              style={{
                padding: '4px 10px',
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-field, #F3F3F6)',
                borderRadius: '8px',
                padding: '2px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                className="btn-icon"
                onClick={handleZoomIn}
                title="Zoom in (+)"
                aria-label="Zoom in"
                style={{ width: '28px', height: '28px' }}
              >
                +
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={handleZoomOut}
                title="Zoom out (-)"
                aria-label="Zoom out"
                style={{ width: '28px', height: '28px' }}
              >
                −
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={handleResetFit}
                title="Fit to view"
                aria-label="Fit to view"
                style={{ width: 'auto', padding: '0 8px', fontSize: '11px', height: '28px' }}
              >
                Fit
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={handleOneToOne}
                title="1:1 scale"
                aria-label="1:1 scale"
                style={{ width: 'auto', padding: '0 8px', fontSize: '11px', height: '28px' }}
              >
                1:1
              </button>
            </div>

            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close drawing dialog"
              style={{ width: '32px', height: '32px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Canvas Body */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: drawingStyle === 'textbook' ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgDraftingCanvas
              view={view}
              highlightedRowId={highlightedRowId}
              onHighlightRow={onHighlightRow}
              drawingStyle={drawingStyle}
              showLabels={showLabels}
              style={{ width: '92%', height: '92%' }}
            />
          </div>
        </div>

        {/* HTML Site View Footer */}
        {view.siteView && (
          <div
            className="site-view-html-footer"
            style={{
              borderTop: '2px solid var(--text-primary, #000000)',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              padding: '10px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '11px',
              fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
              flexShrink: 0,
            }}
          >
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
                  {viewTitle.toUpperCase()}
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

        {/* Modal Footer Notes (Non-Site Views) */}
        {!view.siteView && view.notes && view.notes.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--bg-field, #F3F3F6)',
              borderTop: '1px solid var(--hairline, #E9E9ED)',
              fontSize: '11px',
              color: 'var(--text-muted, #76767E)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--accent-text, #3B4A8C)' }}>NOTE:</span>
            {view.notes.map((n, i) => (
              <span key={i}>{n}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
