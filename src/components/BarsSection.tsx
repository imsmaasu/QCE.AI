import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import {
  ComponentInstance,
  BbsRow,
  BarRowConfig,
  ColumnInputs,
} from '../engine/types';
import {
  getRowSpanFt,
  calcSpacingFromCount,
} from '../engine/bbs';
import { fmtDimInches } from '../geometry/formatting';
import { AuditNote } from '../engine/audit';
import { fmtNum, fmtDia } from '../utils/units';
import { useFlashOnChange } from '../utils/useFlashOnChange';

interface BarsSectionProps {
  component: ComponentInstance;
  highlightedRowId?: string | null;
  onHighlightRow?: (rowId: string | null) => void;
}

export function BarsSection({
  component,
  highlightedRowId,
  onHighlightRow,
}: BarsSectionProps) {
  const bbsResult = useProjectStore((s) => s.bbsResult);
  const notes = useProjectStore((s) => s.notes);
  const updateBarRow = useProjectStore((s) => s.updateBarRow);
  const setBarLengthOverride = useProjectStore((s) => s.setBarLengthOverride);
  const resetBarLengthOverride = useProjectStore((s) => s.resetBarLengthOverride);
  const addCustomBarRow = useProjectStore((s) => s.addCustomBarRow);
  const deleteBarRow = useProjectStore((s) => s.deleteBarRow);

  const [activeWorkingRowId, setActiveWorkingRowId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter rows belonging to this component
  const rows = bbsResult.rows.filter((r) => r.componentId === component.id);

  // Close working popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveWorkingRowId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCustom = () => {
    const newBar: Omit<BarRowConfig, 'id'> = {
      description: 'Extra bar',
      barType: 'bottom_extra',
      shape: 'straight',
      barNo: 4,
      spacingIn: 6,
      count: 2,
      hookOption: 'none',
      isCustom: true,
      overrides: {
        straightFt: 10,
        hookFt: 0,
      },
      remarks: '',
    };
    addCustomBarRow(component.id, newBar);
  };

  const handleDuplicateRow = (row: BbsRow) => {
    const barConfig = component.bars?.find((b) => b.id === row.id);
    const newBar: Omit<BarRowConfig, 'id'> = {
      description: `${row.description} (copy)`,
      barType: barConfig?.barType || row.barType || 'bottom_extra',
      shape: barConfig?.shape || row.shape || 'straight',
      barNo: barConfig?.barNo || row.barNo,
      spacingIn: barConfig?.spacingIn !== undefined ? barConfig.spacingIn : row.spacingIn,
      count: row.count,
      hookOption: barConfig?.hookOption || row.hookOption || 'none',
      isCustom: true,
      overrides: {
        straightFt: row.straightFt,
        hookFt: row.hookFt,
      },
      remarks: row.remarks || '',
    };
    addCustomBarRow(component.id, newBar);
  };

  return (
    <div className="bars-section">
      <div className="bars-section__header">
        <h4 className="bars-section__title">Reinforcement bars ({rows.length})</h4>
        <button
          type="button"
          className="btn btn--ghost"
          style={{ fontSize: 12, padding: '0 8px', height: 28 }}
          onClick={handleAddCustom}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add bar</span>
        </button>
      </div>

      <div className="bars-list">
        {rows.map((row) => {
          const barConfig = component.bars?.find((b) => b.id === row.id);
          return (
            <BarRowItem
              key={row.id}
              component={component}
              row={row}
              barConfig={barConfig}
              isHighlighted={highlightedRowId === row.id}
              onHighlight={() => onHighlightRow?.(row.id)}
              onUnfocus={() => onHighlightRow?.(null)}
              notes={notes.filter((n) => n.rowId === row.id || (n.componentId === component.id && n.rowId === row.id))}
              isWorkingOpen={activeWorkingRowId === row.id}
              onToggleWorking={() =>
                setActiveWorkingRowId(activeWorkingRowId === row.id ? null : row.id)
              }
              popoverRef={activeWorkingRowId === row.id ? popoverRef : undefined}
              onUpdateBar={(patch) => updateBarRow(component.id, row.id, patch)}
              onSetLengthOverride={(field, val) => setBarLengthOverride(component.id, row.id, field, val)}
              onResetLengthOverride={(field) => resetBarLengthOverride(component.id, row.id, field)}
              onDelete={() => deleteBarRow(component.id, row.id)}
              onDuplicate={() => handleDuplicateRow(row)}
            />
          );
        })}

        {rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
            No bar rows. Click "Add bar" or restore hidden rows from card menu.
          </div>
        )}
      </div>
    </div>
  );
}

interface BarRowItemProps {
  component: ComponentInstance;
  row: BbsRow;
  barConfig?: BarRowConfig;
  isHighlighted?: boolean;
  onHighlight?: () => void;
  onUnfocus?: () => void;
  notes: AuditNote[];
  isWorkingOpen: boolean;
  onToggleWorking: () => void;
  popoverRef?: React.RefObject<HTMLDivElement>;
  onUpdateBar: (patch: Partial<BarRowConfig>) => void;
  onSetLengthOverride: (field: 'straightFt' | 'hookFt', val: number) => void;
  onResetLengthOverride: (field?: 'straightFt' | 'hookFt') => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function BarRowItem({
  component,
  row,
  barConfig,
  isHighlighted,
  onHighlight,
  onUnfocus,
  notes,
  isWorkingOpen,
  onToggleWorking,
  popoverRef,
  onUpdateBar,
  onSetLengthOverride,
  onResetLengthOverride,
  onDelete,
  onDuplicate,
}: BarRowItemProps) {
  const [rowMenuOpen, setRowMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingStraight, setEditingStraight] = useState(false);
  const [editingHook, setEditingHook] = useState(false);
  const [countHelperMsg, setCountHelperMsg] = useState<string | null>(null);

  const rowMenuRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const isWeightFlashing = useFlashOnChange(row.weightKg);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setRowMenuOpen(false);
      }
      if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
        setNoteOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const barType = (barConfig?.barType || row.barType || getRowDefaultBarType(row.id)).toLowerCase();
  const currentHookOption = barConfig?.hookOption || row.hookOption || getRowDefaultHookOption(row);

  const isStraightOverridden = barConfig?.overrides?.straightFt !== undefined;
  const isHookOverridden = barConfig?.overrides?.hookFt !== undefined;

  // Span Context
  const spanFt = getRowSpanFt(row.id, component.type, component.params);
  const tieSets = (component.type === 'column' && (row.id === 'R4' || row.id === 'R6'))
    ? ((component.params as ColumnInputs).tieSetsPerLevel || 1)
    : 1;

  // Handle Spacing Change
  const handleSpacingChange = (newSpacingIn: number) => {
    if (isNaN(newSpacingIn) || newSpacingIn <= 0) return;
    setCountHelperMsg(null);
    onUpdateBar({ spacingIn: newSpacingIn });
  };

  // Handle Count Change
  const handleCountChange = (newCount: number) => {
    if (isNaN(newCount) || newCount <= 0) return;
    if (spanFt !== null && row.spacingIn !== null) {
      const { spacingIn, adjustedCount } = calcSpacingFromCount(spanFt, newCount, tieSets);
      if (adjustedCount !== Math.round(newCount)) {
        setCountHelperMsg(`Adjusted to ${adjustedCount} (multiple of ${tieSets} tie sets)`);
      } else {
        setCountHelperMsg(null);
      }
      onUpdateBar({ count: adjustedCount, spacingIn });
    } else {
      setCountHelperMsg(null);
      onUpdateBar({ count: Math.round(newCount) });
    }
  };

  const handleHookOptionChange = (opt: string) => {
    onUpdateBar({ hookOption: opt });
  };

  return (
    <div
      className={`bar-row-item ${isHighlighted ? 'bar-row-item--highlighted' : ''}`}
      style={
        isHighlighted
          ? {
              borderColor: 'var(--accent, #3B4A8C)',
              backgroundColor: 'var(--accent-wash, #EEF1FF)',
              boxShadow: '0 0 0 1px var(--accent, #3B4A8C)',
            }
          : undefined
      }
      onMouseEnter={onHighlight}
      onMouseLeave={onUnfocus}
      onFocus={onHighlight}
      onBlur={onUnfocus}
    >
      {/* ── Line 1: Header / meta & actions ── */}
      <div className="bar-row__line1">
        <div className="bar-row__line1-left">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              className={`bar-type-dot bar-type-dot--${barType.replace(/[^a-z]/g, '')}`}
              title={`Type: ${barType}`}
            />
            <select
              value={barType}
              onChange={(e) => onUpdateBar({ barType: e.target.value })}
              className="mini-field__select"
              style={{ width: '104px', height: '26px', fontSize: '11px', padding: '0 4px' }}
              aria-label="Bar type"
            >
              <option value="main">Main (bot)</option>
              <option value="dist">Dist (bot)</option>
              <option value="bottom">Bottom</option>
              <option value="bottom_extra">Bottom extra</option>
              <option value="top">Top</option>
              <option value="top_extra">Top extra</option>
              <option value="stirrup">Stirrup</option>
              <option value="ties">Ties</option>
              <option value="dowel">Dowel</option>
            </select>
          </div>

          {row.isCustom ? (
            <input
              type="text"
              value={barConfig?.description ?? row.description}
              onChange={(e) => onUpdateBar({ description: e.target.value })}
              className="mini-field__input"
              style={{ height: '26px', fontSize: '13px', maxWidth: '280px' }}
              placeholder="Bar description"
            />
          ) : (
            <span className="bar-row__desc" title={row.description}>
              {row.description}
            </span>
          )}
        </div>

        <div className="bar-row__line1-right">
          {/* Row length (muted) */}
          <span className="bar-row__length" title="Total length">
            {fmtNum(row.totalLenFt, 2)} ft
          </span>

          {/* Row weight in kg */}
          <span className={`bar-row__weight ${isWeightFlashing ? 'flash-change' : ''}`} title="Total steel weight">
            {fmtNum(row.weightKg, 2)} kg
          </span>

          {/* Audit Note info icon button */}
          {notes.length > 0 && (
            <div style={{ position: 'relative' }} ref={noteRef}>
              <button
                type="button"
                className={`btn-icon ${noteOpen ? 'btn-icon--active' : ''}`}
                style={{ width: 28, height: 28 }}
                onClick={() => setNoteOpen(!noteOpen)}
                aria-label="View calculation note"
                title="View note"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>

              {noteOpen && (
                <div className="working-popover" style={{ width: 260 }}>
                  <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Calculation note
                  </div>
                  {notes.map((n, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: '16px' }}>
                      {n.text || n.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Working text button */}
          {row.working && row.working.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: '0 8px', height: 28, fontSize: 12 }}
                onClick={onToggleWorking}
                aria-label="Show step-by-step working"
              >
                Working
              </button>

              {isWorkingOpen && (
                <div className="working-popover" ref={popoverRef}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 12, fontWeight: 500 }}>Working: {row.description}</strong>
                    <button
                      type="button"
                      className="mini-field__reset-btn"
                      onClick={onToggleWorking}
                      aria-label="Close working"
                    >
                      ✕
                    </button>
                  </div>
                  {row.working.map((w, idx) => (
                    <div key={idx} className="working-popover__step">
                      <div style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{w.label}</div>
                      <div className="working-popover__formula">{w.formulaText}</div>
                      <div className="working-popover__sub">{w.substitutedText}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Row actions menu button */}
          <div style={{ position: 'relative' }} ref={rowMenuRef}>
            <button
              type="button"
              className="btn-icon"
              style={{ width: 28, height: 28 }}
              onClick={() => setRowMenuOpen(!rowMenuOpen)}
              aria-label="Row options"
              aria-expanded={rowMenuOpen}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {rowMenuOpen && (
              <div className="menu-dropdown" style={{ right: 0 }} role="menu">
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    onDuplicate();
                    setRowMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  Duplicate row
                </button>
                <button
                  type="button"
                  className="menu-item menu-item--danger"
                  onClick={() => {
                    onDelete();
                    setRowMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  {row.isCustom ? 'Delete row' : 'Hide row'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Line 2: Labelled mini fields wrapping grid ── */}
      <div className="bar-row__line2">
        {/* 1. Shape */}
        <div className="mini-field mini-field--shape">
          <label className="mini-field__label">
            <span>Shape</span>
          </label>
          <select
            value={barConfig?.shape ?? (row.shape || (barType.includes('stirrup') || barType.includes('tie') ? 'square' : barType.includes('extra') ? 'straight' : ''))}
            onChange={(e) => onUpdateBar({ shape: e.target.value })}
            className="mini-field__select"
            aria-label="Bar shape"
          >
            <option value="square">□</option>
            <option value="straight">---</option>
            <option value="u">u</option>
            <option value="L">L</option>
            <option value="">blank</option>
          </select>
        </div>

        {/* 2. Dia */}
        <div className="mini-field mini-field--dia">
          <label className="mini-field__label">
            <span>Dia</span>
          </label>
          <select
            value={barConfig?.barNo ?? row.barNo}
            onChange={(e) => onUpdateBar({ barNo: Number(e.target.value) })}
            className="mini-field__select"
            aria-label="Bar diameter"
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                #{n} ({fmtDia(n)}")
              </option>
            ))}
          </select>
        </div>

        {/* 3 & 4. Spacing and Count Linked */}
        <div className="mini-field-group--linked">
          <div className="mini-field-group__row">
            {/* Spacing */}
            <div className="mini-field" style={{ flex: 1, minWidth: 64 }}>
              <label className="mini-field__label">
                <span>Spacing</span>
              </label>
              {row.spacingIn !== null ? (
                <div className="mini-field__input-wrap">
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={barConfig?.spacingIn !== undefined && barConfig.spacingIn !== null ? fmtNum(barConfig.spacingIn, 2) : fmtNum(row.spacingIn, 2)}
                    onChange={(e) => {
                      const s = parseFloat(e.target.value);
                      if (!isNaN(s)) handleSpacingChange(s);
                    }}
                    className="mini-field__input"
                    style={{ paddingRight: 22 }}
                    aria-label="Spacing in inches"
                  />
                  <span className="mini-field__unit">in</span>
                </div>
              ) : (
                <span className="mini-field__chip mini-field__chip--na">n/a</span>
              )}
            </div>

            {/* Link Icon between Spacing and Count */}
            {row.spacingIn !== null && (
              <span className="mini-field-group__link-badge" title="Linked: spacing and count">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
            )}

            {/* Count */}
            <div className="mini-field" style={{ flex: 1, minWidth: 64 }}>
              <label className="mini-field__label">
                <span>Count</span>
                {row.roundedFromCount !== undefined && (
                  <span
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', display: 'inline-block' }}
                    title={`Rounded up from ${fmtNum(row.roundedFromCount, 2)}`}
                  />
                )}
              </label>
              <div className="mini-field__input-wrap">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={row.count}
                  onChange={(e) => {
                    const c = parseFloat(e.target.value);
                    if (!isNaN(c)) handleCountChange(c);
                  }}
                  className="mini-field__input"
                  aria-label="Number of bars"
                />
              </div>
            </div>
          </div>

          {/* Span Helper or Adjusted Multiple note */}
          {spanFt !== null && row.spacingIn !== null && (
            <div className="mini-field-group__span-helper">
              {countHelperMsg ? (
                <span style={{ color: 'var(--accent-text)' }}>{countHelperMsg}</span>
              ) : (
                <span>over {fmtDimInches(spanFt * 12)} span</span>
              )}
            </div>
          )}
        </div>

        {/* 5. Straight (ft) - Calculated with Pencil Override */}
        <div className="mini-field mini-field--length" style={{ minWidth: 90 }}>
          <label className="mini-field__label">
            <span>Straight</span>
            {isStraightOverridden && <span className="override-dot" title="Overridden value" />}
            {isStraightOverridden ? (
              <button
                type="button"
                className="mini-field__reset-btn"
                onClick={() => {
                  onResetLengthOverride('straightFt');
                  setEditingStraight(false);
                }}
                title="Reset straight length to calculated"
                aria-label="Reset straight length"
              >
                <ResetIcon />
              </button>
            ) : (
              <button
                type="button"
                className={`mini-field__pencil-btn ${editingStraight ? 'mini-field__pencil-btn--active' : ''}`}
                onClick={() => setEditingStraight(!editingStraight)}
                title="Override straight length"
                aria-label="Override straight length"
              >
                <PencilIcon />
              </button>
            )}
          </label>
          {editingStraight || isStraightOverridden ? (
            <div className="mini-field__input-wrap">
              <input
                type="number"
                step="0.01"
                value={barConfig?.overrides?.straightFt ?? fmtNum(row.straightFt, 3)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onSetLengthOverride('straightFt', val);
                }}
                className={`mini-field__input ${isStraightOverridden ? 'mini-field__input--overridden' : ''}`}
                style={{ paddingRight: 20 }}
                aria-label="Straight length in feet"
              />
              <span className="mini-field__unit">ft</span>
            </div>
          ) : (
            <span
              className="mini-field__chip mini-field__chip--calc"
              onClick={() => setEditingStraight(true)}
              title="Calculated straight length (click pencil to override)"
            >
              {fmtNum(row.straightFt, 2)} ft
            </span>
          )}
        </div>

        {/* 6. Hook (Dropdown + Calculated with Pencil Override) */}
        <div className="mini-field mini-field--hook" style={{ minWidth: 155 }}>
          <label className="mini-field__label">
            <span>Hook</span>
            {isHookOverridden && <span className="override-dot" title="Overridden value" />}
            {isHookOverridden ? (
              <button
                type="button"
                className="mini-field__reset-btn"
                onClick={() => {
                  onResetLengthOverride('hookFt');
                  setEditingHook(false);
                }}
                title="Reset hook length to calculated"
                aria-label="Reset hook length"
              >
                <ResetIcon />
              </button>
            ) : (
              <button
                type="button"
                className={`mini-field__pencil-btn ${editingHook ? 'mini-field__pencil-btn--active' : ''}`}
                onClick={() => setEditingHook(!editingHook)}
                title="Override hook length"
                aria-label="Override hook length"
              >
                <PencilIcon />
              </button>
            )}
          </label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select
              value={currentHookOption}
              onChange={(e) => handleHookOptionChange(e.target.value)}
              className="mini-field__select"
              aria-label="Hook option"
              style={{ flex: 1 }}
            >
              <option value="none">None</option>
              <option value="9d">9× dia</option>
              <option value="12d">12× dia</option>
              <option value="16d">16× dia</option>
              <option value="18d">18× dia</option>
              <option value="24d">24× dia</option>
              <option value="30d">30× dia</option>
              <option value="fixed_6">6" fixed</option>
              <option value="fixed_12">12" fixed</option>
              <option value="fixed_24">24" fixed</option>
              <option value="custom">Custom</option>
            </select>

            {editingHook || isHookOverridden ? (
              <div className="mini-field__input-wrap" style={{ width: 64 }}>
                <input
                  type="number"
                  step="0.01"
                  value={barConfig?.overrides?.hookFt ?? fmtNum(row.hookFt, 3)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onSetLengthOverride('hookFt', val);
                  }}
                  className={`mini-field__input ${isHookOverridden ? 'mini-field__input--overridden' : ''}`}
                  style={{ paddingRight: 18, width: 64 }}
                  aria-label="Custom hook length in feet"
                />
                <span className="mini-field__unit">ft</span>
              </div>
            ) : (
              <span
                className="mini-field__chip mini-field__chip--calc"
                style={{ padding: '0 6px', fontSize: 11 }}
                onClick={() => setEditingHook(true)}
                title="Calculated hook length (click pencil to override)"
              >
                {fmtNum(row.hookFt, 2)} ft
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function getRowDefaultBarType(rowId: string): string {
  switch (rowId) {
    case 'R1': return 'main';
    case 'R2': return 'dist';
    case 'R3': return 'dowel';
    case 'R4': return 'ties';
    case 'R5': return 'dowel';
    case 'R6': return 'ties';
    case 'R7': return 'bottom';
    case 'R8': return 'bottom_extra';
    case 'R9': return 'top';
    case 'R10': return 'stirrup';
    case 'R11': return 'stirrup';
    default: return 'bottom_extra';
  }
}

function getRowDefaultHookOption(row: BbsRow): string {
  if (row.id === 'R8') return 'none';
  if (row.id === 'R7' || row.id === 'R9') return 'fixed_24';
  if (row.id === 'R1' || row.id === 'R2') return '24d';
  if (row.id === 'R3' || row.id === 'R5') return '12d';
  if (row.id === 'R4' || row.id === 'R6' || row.id === 'R10' || row.id === 'R11') return 'custom';
  return 'none';
}
