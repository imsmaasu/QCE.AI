import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import {
  ComponentInstance,
  FootingInputs,
  ColumnInputs,
  BeamInputs,
  RatesInputs,
  FOOTING_DEFAULTS,
  COLUMN_DEFAULTS,
  BEAM_DEFAULTS,
  RATES_DEFAULTS,
} from '../engine/types';
import { NumberField } from './fields/NumberField';
import { BarsSection } from './BarsSection';
import { FOOTING_DRAWING_DEFAULTS, COLUMN_DRAWING_DEFAULTS } from '../geometry';
import { fmtNum } from '../utils/units';
import { useFlashOnChange } from '../utils/useFlashOnChange';
import { getFieldLimits } from '../engine/validation';

interface ComponentCardProps {
  component: ComponentInstance;
}

export function ComponentCard({ component }: ComponentCardProps) {
  const bbsResult = useProjectStore((s) => s.bbsResult);
  const expandedComponentIds = useProjectStore((s) => s.expandedComponentIds);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const updateComponentParams = useProjectStore((s) => s.updateComponentParams);
  const duplicateComponent = useProjectStore((s) => s.duplicateComponent);
  const renameComponent = useProjectStore((s) => s.renameComponent);
  const deleteComponent = useProjectStore((s) => s.deleteComponent);
  const restoreHiddenRows = useProjectStore((s) => s.restoreHiddenRows);
  const updateDrawingDetails = useProjectStore((s) => s.updateDrawingDetails);
  const allComponents = useProjectStore((s) => s.components);
  const hoveredRowId = useProjectStore((s) => s.hoveredRowId);
  const setHoveredRowId = useProjectStore((s) => s.setHoveredRowId);
  const setActiveComponentId = useProjectStore((s) => s.setActiveComponentId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(component.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedComponentIds.includes(component.id);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  // Calculate live weight for this component
  const compRows = bbsResult.rows.filter((r) => r.componentId === component.id);
  const totalWeightKg = compRows.reduce((acc, r) => acc + r.weightKg, 0);

  // Calculate live cost for Rates component
  let ratesTotalCost = 0;
  if (component.type === 'rates') {
    const p = component.params as RatesInputs;
    const steelCost = bbsResult.grandTotalKg * p.steelRateRs;
    const wastageCost = steelCost * (p.wastagePercent / 100);
    const laborCost = bbsResult.grandTotalKg * p.laborRateRs;
    ratesTotalCost = steelCost + wastageCost + laborCost;
  }

  const metricValue = component.type === 'rates' ? ratesTotalCost : totalWeightKg;
  const isMetricFlashing = useFlashOnChange(metricValue);

  // Generate one-line summary
  let summary = '';
  if (component.type === 'footing') {
    const p = component.params as FootingInputs;
    summary = `${p.B}' × ${p.L}', cover ${p.coverEachSideIn}", hook ${p.hookFactor}d`;
  } else if (component.type === 'column') {
    const p = component.params as ColumnInputs;
    summary = `H=${p.columnHeightAboveFt}', depth=${p.depthGLtoFootingFt}', ${p.tieSetsPerLevel} tie sets/level`;
  } else if (component.type === 'beam') {
    const p = component.params as BeamInputs;
    summary = `Span ${p.clearSpanFt}', ${p.beamWidthIn}"×${p.beamDepthIn}", cover ${p.coverEachSideIn}"`;
  } else if (component.type === 'rates') {
    const p = component.params as RatesInputs;
    summary = ratesTotalCost > 0
      ? `Steel Rs. ${p.steelRateRs}/kg, Labor Rs. ${p.laborRateRs}/kg, Wastage ${p.wastagePercent}%`
      : 'Rates not set (enter steel & labor rates)';
  }

  const handleRenameSubmit = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      renameComponent(component.id, trimmed);
    } else {
      setNewName(component.name);
    }
    setIsRenaming(false);
  };

  const handleUpdate = (patch: Record<string, unknown>) => {
    updateComponentParams(component.id, patch);
  };

  return (
    <article
      id={`card-${component.id}`}
      className={`card ${isExpanded ? 'card--expanded' : ''} ${menuOpen ? 'card--menu-open' : ''}`}
      style={menuOpen ? { zIndex: 60, position: 'relative' } : undefined}
      onFocus={() => setActiveComponentId(component.id)}
      onMouseEnter={() => setActiveComponentId(component.id)}
    >
      {/* Header */}
      <div
        className="card__header"
        onClick={() => toggleExpanded(component.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded(component.id);
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="card__header-left">
          {/* 3px x 20px Type Tick */}
          <span className={`type-tick type-tick--${component.type}`} aria-hidden="true" />

          <div className="card__title-meta">
            <div className="card__title-row">
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') {
                      setNewName(component.name);
                      setIsRenaming(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="top-bar__name-input"
                  style={{ width: '200px', fontSize: '15px', padding: '2px 6px' }}
                />
              ) : (
                <span className="card__name">{component.name}</span>
              )}
            </div>
            <div className="card__summary" title={summary}>
              {summary}
            </div>
          </div>
        </div>

        <div className="card__header-right">
          {component.type === 'rates' ? (
            <span
              className={`card__weight ${isMetricFlashing ? 'flash-change' : ''}`}
              title="Total project cost"
            >
              {ratesTotalCost > 0 ? (
                <span>Rs. {Math.round(ratesTotalCost).toLocaleString()}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Cost not set</span>
              )}
            </span>
          ) : (
            <span
              className={`card__weight ${isMetricFlashing ? 'flash-change' : ''}`}
              title="Total steel weight"
            >
              <span>{fmtNum(totalWeightKg, 2)}</span>
              <span className="card__weight-unit">kg</span>
            </span>
          )}

          <span className="card__chevron" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>

          {/* 3-dots Menu */}
          <div style={{ position: 'relative' }} ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Component options"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {menuOpen && (
              <div className="menu-dropdown" role="menu">
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setIsRenaming(true);
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  Rename
                </button>
                {component.type !== 'rates' && (
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      duplicateComponent(component.id);
                      setMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    Duplicate
                  </button>
                )}
                {component.hiddenRows && component.hiddenRows.length > 0 && (
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      restoreHiddenRows(component.id);
                      setMenuOpen(false);
                    }}
                    role="menuitem"
                  >
                    Restore hidden rows ({component.hiddenRows.length})
                  </button>
                )}
                <button
                  type="button"
                  className="menu-item menu-item--danger"
                  onClick={() => {
                    deleteComponent(component.id);
                    setMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Body with 180ms ease-out height animation wrapper */}
      <div className="card__collapse-wrapper">
        <div className="card__collapse-inner">
          <div className="card__body">
            {component.type === 'footing' && (
              <FootingParamsGrid
                params={component.params as FootingInputs}
                drawingDetails={component.drawingDetails}
                allComponents={allComponents}
                onUpdate={handleUpdate}
                onUpdateDrawingDetails={(patch) => updateDrawingDetails(component.id, patch)}
              />
            )}

            {component.type === 'column' && (
              <ColumnParamsGrid
                params={component.params as ColumnInputs}
                drawingDetails={component.drawingDetails}
                onUpdate={handleUpdate}
                onUpdateDrawingDetails={(patch) => updateDrawingDetails(component.id, patch)}
              />
            )}

            {component.type === 'beam' && (
              <BeamParamsGrid
                params={component.params as BeamInputs}
                onUpdate={handleUpdate}
              />
            )}

            {component.type === 'rates' && (
              <RatesParamsGrid
                params={component.params as RatesInputs}
                totalWeightKg={bbsResult.grandTotalKg}
                totalCostRs={ratesTotalCost}
                onUpdate={handleUpdate}
              />
            )}

            {component.type !== 'rates' && (
              <BarsSection
                component={component}
                highlightedRowId={hoveredRowId}
                onHighlightRow={setHoveredRowId}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Footing Parameters ───────────────────────────────────────────────────────
function FootingParamsGrid({
  params,
  drawingDetails,
  allComponents,
  onUpdate,
  onUpdateDrawingDetails,
}: {
  params: FootingInputs;
  drawingDetails?: Record<string, unknown>;
  allComponents?: ComponentInstance[];
  onUpdate: (patch: Record<string, unknown>) => void;
  onUpdateDrawingDetails?: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="card__section-title">Member dimensions</div>
      <div className="params-grid">
        <NumberField
          label="Width (B)"
          value={params.B}
          defaultValue={FOOTING_DEFAULTS.B}
          unit="ft"
          min={0.5}
          step={0.5}
          onChange={(B) => onUpdate({ B })}
        />
        <NumberField
          label="Length (L)"
          value={params.L}
          defaultValue={FOOTING_DEFAULTS.L}
          unit="ft"
          min={0.5}
          step={0.5}
          onChange={(L) => onUpdate({ L })}
        />
        {(() => {
          const limits = getFieldLimits('footing', 'coverEachSideIn', params as unknown as Record<string, unknown>);
          return (
            <NumberField
              label="Cover (each side)"
              value={params.coverEachSideIn}
              defaultValue={FOOTING_DEFAULTS.coverEachSideIn}
              unit="in"
              min={limits?.hardMin ?? 0.5}
              max={limits?.hardMax}
              step={0.25}
              helperText={limits?.helperText ?? `Total deduction ${params.coverEachSideIn * 2} in`}
              onChange={(coverEachSideIn) => onUpdate({ coverEachSideIn })}
            />
          );
        })()}
        <NumberField
          label="Hook factor (× dia)"
          value={params.hookFactor}
          defaultValue={FOOTING_DEFAULTS.hookFactor}
          min={4}
          max={24}
          onChange={(hookFactor) => onUpdate({ hookFactor })}
        />
      </div>

      <FootingDrawingDetailsSection
        details={drawingDetails}
        allComponents={allComponents || []}
        onUpdateDetails={onUpdateDrawingDetails || (() => {})}
      />
    </>
  );
}

function FootingDrawingDetailsSection({
  details,
  allComponents,
  onUpdateDetails,
}: {
  details?: Record<string, unknown>;
  allComponents: ComponentInstance[];
  onUpdateDetails: (patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const d = { ...FOOTING_DRAWING_DEFAULTS, ...details };
  const columns = allComponents.filter((c) => c.type === 'column');
  const linkedCol = columns.find((c) => c.id === d.linkedColumnId);

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid var(--hairline, #E9E9ED)', paddingTop: '12px' }}>
      <button
        type="button"
        className="card__section-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ marginTop: 0, borderTop: 'none', padding: '4px 0' }}
      >
        <span className="card__section-title" style={{ margin: 0 }}>
          Drawing details
        </span>
        <svg
          className={`card__chevron ${open ? 'card__chevron--expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="params-grid" style={{ marginTop: '12px' }}>
          <NumberField
            label="Footing thickness"
            value={d.thicknessIn}
            defaultValue={12}
            unit="in"
            min={4}
            step={1}
            onChange={(thicknessIn) => onUpdateDetails({ thicknessIn })}
          />
          <NumberField
            label="Lean concrete thickness"
            value={d.leanThicknessIn}
            defaultValue={4}
            unit="in"
            min={1}
            step={1}
            onChange={(leanThicknessIn) => onUpdateDetails({ leanThicknessIn })}
          />
          <NumberField
            label="Lean projection (each side)"
            value={d.leanProjectionIn}
            defaultValue={4}
            unit="in"
            min={0}
            step={1}
            onChange={(leanProjectionIn) => onUpdateDetails({ leanProjectionIn })}
          />
          <div className="number-field">
            <span className="number-field__label">Lean mix ratio</span>
            <div className="number-field__control">
              <input
                type="text"
                className="number-field__input"
                value={d.leanMixLabel}
                onChange={(e) => onUpdateDetails({ leanMixLabel: e.target.value })}
                placeholder="1:4:8"
              />
            </div>
          </div>
          <div className="number-field">
            <span className="number-field__label">Linked column</span>
            <div className="number-field__control">
              <select
                className="number-field__input"
                value={d.linkedColumnId || ''}
                onChange={(e) => onUpdateDetails({ linkedColumnId: e.target.value || null })}
              >
                <option value="">(None / Unlinked)</option>
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="number-field__helper">
              {linkedCol
                ? `Levels (depth ${(linkedCol.params as ColumnInputs).depthGLtoFootingFt} ft, plinth ${(linkedCol.params as ColumnInputs).plinthAboveGLFt} ft) & dowels from ${linkedCol.name}`
                : 'Unlinked: enters custom depth & plinth below'}
            </span>
          </div>

          {!d.linkedColumnId && (
            <>
              <NumberField
                label="Depth GL to footing"
                value={d.unlinkedDepthGLtoFootingFt ?? 5}
                defaultValue={5}
                unit="ft"
                min={1}
                step={0.5}
                onChange={(unlinkedDepthGLtoFootingFt) => onUpdateDetails({ unlinkedDepthGLtoFootingFt })}
              />
              <NumberField
                label="Plinth above GL"
                value={d.unlinkedPlinthAboveGLFt ?? 2}
                defaultValue={2}
                unit="ft"
                min={0}
                step={0.5}
                onChange={(unlinkedPlinthAboveGLFt) => onUpdateDetails({ unlinkedPlinthAboveGLFt })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Column Parameters ────────────────────────────────────────────────────────
function ColumnParamsGrid({
  params,
  drawingDetails,
  onUpdate,
  onUpdateDrawingDetails,
}: {
  params: ColumnInputs;
  drawingDetails?: Record<string, unknown>;
  onUpdate: (patch: Record<string, unknown>) => void;
  onUpdateDrawingDetails?: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="card__section-title">Member dimensions</div>
      <div className="params-grid">
      <NumberField
        label="Depth GL to footing"
        value={params.depthGLtoFootingFt}
        defaultValue={COLUMN_DEFAULTS.depthGLtoFootingFt}
        unit="ft"
        min={0.5}
        step={0.5}
        onChange={(depthGLtoFootingFt) => onUpdate({ depthGLtoFootingFt })}
      />
      <NumberField
        label="Plinth above GL"
        value={params.plinthAboveGLFt}
        defaultValue={COLUMN_DEFAULTS.plinthAboveGLFt}
        unit="ft"
        min={0}
        step={0.5}
        onChange={(plinthAboveGLFt) => onUpdate({ plinthAboveGLFt })}
      />
      <NumberField
        label="Column height above plinth"
        value={params.columnHeightAboveFt}
        defaultValue={COLUMN_DEFAULTS.columnHeightAboveFt}
        unit="ft"
        min={1}
        step={0.5}
        onChange={(columnHeightAboveFt) => onUpdate({ columnHeightAboveFt })}
      />
      <NumberField
        label="Lap factor (× dia)"
        value={params.lapFactor}
        defaultValue={COLUMN_DEFAULTS.lapFactor}
        min={12}
        max={72}
        onChange={(lapFactor) => onUpdate({ lapFactor })}
      />
      {(() => {
        const limits = getFieldLimits('column', 'coverEachSideIn', params as unknown as Record<string, unknown>);
        return (
          <NumberField
            label="Tie cover (each side)"
            value={params.coverEachSideIn}
            defaultValue={COLUMN_DEFAULTS.coverEachSideIn}
            unit="in"
            min={limits?.hardMin ?? 0.5}
            max={limits?.hardMax}
            step={0.25}
            helperText={limits?.helperText ?? `Total deduction ${params.coverEachSideIn * 2} in`}
            onChange={(coverEachSideIn) => onUpdate({ coverEachSideIn })}
          />
        );
      })()}
      {(() => {
        const limits = getFieldLimits('column', 'topCoverIn', params as unknown as Record<string, unknown>);
        return (
          <NumberField
            label="Top cover (above dowels)"
            value={params.topCoverIn}
            defaultValue={COLUMN_DEFAULTS.topCoverIn}
            unit="in"
            min={limits?.hardMin ?? 0.5}
            max={limits?.hardMax}
            step={0.25}
            helperText={limits?.helperText}
            onChange={(topCoverIn) => onUpdate({ topCoverIn })}
          />
        );
      })()}
      <NumberField
        label="Dowel end allowance"
        value={params.dowelEndAllowanceIn}
        defaultValue={COLUMN_DEFAULTS.dowelEndAllowanceIn}
        unit="in"
        min={0}
        step={0.5}
        onChange={(dowelEndAllowanceIn) => onUpdate({ dowelEndAllowanceIn })}
      />
      <NumberField
        label="Tie width"
        value={params.tieWidthIn}
        defaultValue={COLUMN_DEFAULTS.tieWidthIn}
        unit="in"
        min={2}
        step={0.5}
        onChange={(tieWidthIn) => onUpdate({ tieWidthIn })}
      />
      <NumberField
        label="Tie depth"
        value={params.tieDepthIn}
        defaultValue={COLUMN_DEFAULTS.tieDepthIn}
        unit="in"
        min={2}
        step={0.5}
        onChange={(tieDepthIn) => onUpdate({ tieDepthIn })}
      />
      <NumberField
        label="Tie sets per level"
        value={params.tieSetsPerLevel}
        defaultValue={COLUMN_DEFAULTS.tieSetsPerLevel}
        min={1}
        step={1}
        onChange={(tieSetsPerLevel) => onUpdate({ tieSetsPerLevel })}
      />
      <NumberField
        label="Tie height below plinth"
        value={params.tieHeightBelowFt}
        defaultValue={COLUMN_DEFAULTS.tieHeightBelowFt}
        unit="ft"
        min={1}
        step={0.5}
        onChange={(tieHeightBelowFt) => onUpdate({ tieHeightBelowFt })}
      />
      <NumberField
        label="First tie offset"
        value={params.firstTieOffsetFt}
        defaultValue={COLUMN_DEFAULTS.firstTieOffsetFt}
        unit="ft"
        min={0}
        step={0.25}
        onChange={(firstTieOffsetFt) => onUpdate({ firstTieOffsetFt })}
      />
      <NumberField
        label="Hook factor (× dia)"
        value={params.hookFactor}
        defaultValue={COLUMN_DEFAULTS.hookFactor}
        min={4}
        max={24}
        onChange={(hookFactor) => onUpdate({ hookFactor })}
      />
    </div>

    <ColumnDrawingDetailsSection
      details={drawingDetails}
      onUpdateDetails={onUpdateDrawingDetails || (() => {})}
    />
    </>
  );
}

function ColumnDrawingDetailsSection({
  details,
  onUpdateDetails,
}: {
  details?: Record<string, unknown>;
  onUpdateDetails: (patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const d = { ...COLUMN_DRAWING_DEFAULTS, ...details };

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid var(--hairline, #E9E9ED)', paddingTop: '12px' }}>
      <button
        type="button"
        className="card__section-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ marginTop: 0, borderTop: 'none', padding: '4px 0' }}
      >
        <span className="card__section-title" style={{ margin: 0 }}>
          Drawing details
        </span>
        <svg
          className={`card__chevron ${open ? 'card__chevron--expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="params-grid" style={{ marginTop: '12px' }}>
          <NumberField
            label="Column width"
            value={d.colWidthIn}
            defaultValue={12}
            unit="in"
            min={6}
            step={1}
            onChange={(colWidthIn) => onUpdateDetails({ colWidthIn })}
          />
          <NumberField
            label="Column depth"
            value={d.colDepthIn}
            defaultValue={18}
            unit="in"
            min={6}
            step={1}
            onChange={(colDepthIn) => onUpdateDetails({ colDepthIn })}
          />
        </div>
      )}
    </div>
  );
}

// ─── Beam Parameters ──────────────────────────────────────────────────────────
function BeamParamsGrid({
  params,
  onUpdate,
}: {
  params: BeamInputs;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="card__section-title">Member dimensions</div>
      <div className="params-grid">
      <NumberField
        label="Clear span"
        value={params.clearSpanFt}
        defaultValue={BEAM_DEFAULTS.clearSpanFt}
        unit="ft"
        min={1}
        step={0.5}
        onChange={(clearSpanFt) => onUpdate({ clearSpanFt })}
      />
      <NumberField
        label="Column support width"
        value={params.columnWidthFt}
        defaultValue={BEAM_DEFAULTS.columnWidthFt}
        unit="ft"
        min={0.5}
        step={0.25}
        onChange={(columnWidthFt) => onUpdate({ columnWidthFt })}
      />
      <NumberField
        label="Beam width"
        value={params.beamWidthIn}
        defaultValue={BEAM_DEFAULTS.beamWidthIn}
        unit="in"
        min={4}
        step={1}
        onChange={(beamWidthIn) => onUpdate({ beamWidthIn })}
      />
      <NumberField
        label="Beam depth"
        value={params.beamDepthIn}
        defaultValue={BEAM_DEFAULTS.beamDepthIn}
        unit="in"
        min={6}
        step={1}
        onChange={(beamDepthIn) => onUpdate({ beamDepthIn })}
      />
      {(() => {
        const limits = getFieldLimits('beam', 'coverEachSideIn', params as unknown as Record<string, unknown>);
        return (
          <NumberField
            label="Stirrup cover (each side)"
            value={params.coverEachSideIn}
            defaultValue={BEAM_DEFAULTS.coverEachSideIn}
            unit="in"
            min={limits?.hardMin ?? 0.5}
            max={limits?.hardMax}
            step={0.25}
            helperText={limits?.helperText ?? `Total deduction ${params.coverEachSideIn * 2} in`}
            onChange={(coverEachSideIn) => onUpdate({ coverEachSideIn })}
          />
        );
      })()}
      <NumberField
        label="End allowance"
        value={params.endAllowanceIn}
        defaultValue={BEAM_DEFAULTS.endAllowanceIn}
        unit="in"
        min={0}
        step={0.5}
        onChange={(endAllowanceIn) => onUpdate({ endAllowanceIn })}
      />
      <NumberField
        label="U-bar hook length"
        value={params.uBarHookFt}
        defaultValue={BEAM_DEFAULTS.uBarHookFt}
        unit="ft"
        min={0.25}
        step={0.25}
        onChange={(uBarHookFt) => onUpdate({ uBarHookFt })}
      />
      <NumberField
        label="Stirrup zone deduction"
        value={params.stirrupZoneDeductionFt}
        defaultValue={BEAM_DEFAULTS.stirrupZoneDeductionFt}
        unit="ft"
        min={0}
        step={0.25}
        onChange={(stirrupZoneDeductionFt) => onUpdate({ stirrupZoneDeductionFt })}
      />
    </div>

    <BeamDrawingDetailsSection params={params} />
    </>
  );
}

function BeamDrawingDetailsSection({ params }: { params: BeamInputs }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid var(--hairline, #E9E9ED)', paddingTop: '12px' }}>
      <button
        type="button"
        className="card__section-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ marginTop: 0, borderTop: 'none', padding: '4px 0' }}
      >
        <span className="card__section-title" style={{ margin: 0 }}>
          Drawing details
        </span>
        <svg
          className={`card__chevron ${open ? 'card__chevron--expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted, #76767E)', lineHeight: '18px' }}>
          Drawing uses member dimensions: {params.beamWidthIn}″ × {params.beamDepthIn}″ beam, clear span {params.clearSpanFt}′, support columns {(params.columnWidthFt * 12).toFixed(0)}″.
        </div>
      )}
    </div>
  );
}

// ─── Rates Parameters ─────────────────────────────────────────────────────────
function RatesParamsGrid({
  params,
  totalWeightKg,
  totalCostRs,
  onUpdate,
}: {
  params: RatesInputs;
  totalWeightKg: number;
  totalCostRs: number;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const steelCost = totalWeightKg * params.steelRateRs;
  const wastageCost = steelCost * (params.wastagePercent / 100);
  const laborCost = totalWeightKg * params.laborRateRs;

  return (
    <div>
      <div className="params-grid">
        <NumberField
          label="Steel rate"
          value={params.steelRateRs}
          defaultValue={RATES_DEFAULTS.steelRateRs}
          unit="Rs per kg"
          placeholder="e.g. 260"
          min={0}
          step={5}
          onChange={(steelRateRs) => onUpdate({ steelRateRs })}
        />
        <NumberField
          label="Labor rate"
          value={params.laborRateRs}
          defaultValue={RATES_DEFAULTS.laborRateRs}
          unit="Rs per kg"
          placeholder="e.g. 25"
          min={0}
          step={1}
          onChange={(laborRateRs) => onUpdate({ laborRateRs })}
        />
        <NumberField
          label="Wastage allowance"
          value={params.wastagePercent}
          defaultValue={RATES_DEFAULTS.wastagePercent}
          unit="%"
          placeholder="0"
          min={0}
          max={25}
          step={0.5}
          onChange={(wastagePercent) => onUpdate({ wastagePercent })}
        />
      </div>

      <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-field)', borderRadius: 'var(--radius-field)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Net steel:</span>{' '}
            <strong>{steelCost > 0 ? `Rs. ${Math.round(steelCost).toLocaleString()}` : 'Not set'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Wastage ({params.wastagePercent}%):</span>{' '}
            <strong>{wastageCost > 0 ? `Rs. ${Math.round(wastageCost).toLocaleString()}` : 'Not set'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Labor:</span>{' '}
            <strong>{laborCost > 0 ? `Rs. ${Math.round(laborCost).toLocaleString()}` : 'Not set'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Grand total:</span>{' '}
            <strong style={{ color: 'var(--accent-text)' }}>
              {totalCostRs > 0 ? `Rs. ${Math.round(totalCostRs).toLocaleString()}` : 'Not set'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
