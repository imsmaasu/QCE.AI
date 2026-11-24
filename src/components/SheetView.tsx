import React from 'react';
import { useProjectStore } from '../store/projectStore';
import { exportPdf } from '../utils/pdfExport';
import { fmtDia, fmtNum, fmtShape } from '../utils/units';
import { BbsRow } from '../engine/types';

export function SheetView() {
  const name = useProjectStore((s) => s.name);
  const bbsResult = useProjectStore((s) => s.bbsResult);
  const notes = useProjectStore((s) => s.notes);
  const rates = useProjectStore((s) => s.rates);
  const setCurrentView = useProjectStore((s) => s.setCurrentView);

  const handleExportPdf = () => {
    exportPdf(bbsResult, name, rates);
  };

  // Group rows by instance / section
  const sectionGroups: Array<{ title: string; rows: BbsRow[] }> = [];
  let currentGroup: { title: string; rows: BbsRow[] } | null = null;

  for (const row of bbsResult.rows) {
    const groupTitle = row.componentName
      ? `${row.componentName} — ${row.section}`
      : row.section;

    if (!currentGroup || currentGroup.title !== groupTitle) {
      currentGroup = { title: groupTitle, rows: [] };
      sectionGroups.push(currentGroup);
    }
    currentGroup.rows.push(row);
  }

  let snoCounter = 0;

  const totalWeightKg = bbsResult.grandTotalKg;
  const netSteelCost = totalWeightKg * rates.steelRateRs;
  const wastageCost = netSteelCost * (rates.wastagePercent / 100);
  const laborCost = totalWeightKg * rates.laborRateRs;
  const grandTotalCost = netSteelCost + wastageCost + laborCost;
  const hasConfiguredRates = rates.steelRateRs > 0 || rates.laborRateRs > 0;

  const getGroupType = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('footing')) return 'footing';
    if (lower.includes('column')) return 'column';
    if (lower.includes('beam')) return 'beam';
    return 'rates';
  };

  return (
    <div className="sheet-container">
      {/* Header */}
      <div className="sheet-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setCurrentView('cards')}
            aria-label="Back to cards view"
          >
            ← Back to cards
          </button>
          <div>
            <h2 className="sheet-title">{name}</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Bar bending schedule & cost estimation
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleExportPdf}
          aria-label="Export PDF"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export PDF</span>
        </button>
      </div>

      {/* Main BBS Table */}
      <div className="sheet-table-wrap">
        <table className="sheet-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>S.No</th>
              <th style={{ width: '22%' }}>Description</th>
              <th style={{ width: '6%' }}>Bar #</th>
              <th style={{ width: '6%' }}>Spacing</th>
              <th style={{ width: '6%' }}>Shape</th>
              <th style={{ width: '7%' }}>No. of bars</th>
              <th style={{ width: '8%' }}>Straight (ft)</th>
              <th style={{ width: '7%' }}>Hook (ft)</th>
              <th style={{ width: '8%' }}>1 bar (ft)</th>
              <th style={{ width: '8%' }}>Total (ft)</th>
              <th style={{ width: '6%' }}>lb/ft</th>
              <th style={{ width: '8%' }}>Total lb</th>
              <th style={{ width: '8%' }}>Total kg</th>
              <th style={{ width: '12%' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sectionGroups.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                <tr className="sheet-table__section-row">
                  <td colSpan={14}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`type-tick type-tick--${getGroupType(group.title)}`} style={{ height: 16 }} />
                      <span>{group.title}</span>
                    </div>
                  </td>
                </tr>
                {group.rows.map((row) => {
                  snoCounter++;
                  const rowNotes = notes.filter(
                    (n) => n.rowId === row.id || (n.componentId === row.componentId && n.rowId === row.id),
                  );
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center' }}>{snoCounter}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{row.description}</span>
                        {rowNotes.length > 0 && (
                          <span
                            className="note-dot"
                            style={{ marginLeft: 6 }}
                            title={rowNotes.map((n) => `${n.id}: ${n.text || n.message}`).join('\n')}
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>
                        #{row.barNo} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({fmtDia(row.barNo)}")</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.spacingIn !== null ? `${row.spacingIn}"` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{fmtShape(row.shape, row.barType)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.hasNonIntegerCount ? fmtNum(row.count, 6) : row.count}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(row.straightFt, 6)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.hookFt === 0 ? '—' : fmtNum(row.hookFt, 6)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(row.totalFt, 6)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(row.totalLenFt, 6)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(row.unitWeightLbPerFt, 6)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtNum(row.weightLb, 6)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>
                        {fmtNum(row.weightKg, 6)}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {row.remarks || '—'}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Total Row */}
            <tr className="sheet-table__total-row">
              <td colSpan={11} style={{ textAlign: 'right', fontWeight: 500 }}>
                Total steel weight
              </td>
              <td style={{ textAlign: 'right', fontWeight: 500 }}>
                {fmtNum(bbsResult.grandTotalLb, 2)} lb
              </td>
              <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--accent-text)' }}>
                {fmtNum(bbsResult.grandTotalKg, 2)} kg
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Size Summary Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
          Summary by bar size
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {bbsResult.bySize.map((s) => (
            <div
              key={s.barNo}
              style={{
                background: 'var(--bg-field)',
                borderRadius: 'var(--radius-field)',
                padding: '10px 14px',
                border: '1px solid var(--hairline)',
                fontSize: '12px',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                #{s.barNo} ({s.barNo}/8")
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Weight:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {fmtNum(s.weightKg, 2)} kg ({fmtNum(s.weightLb, 2)} lb)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Summary Breakdown */}
      <div
        style={{
          background: 'var(--bg-field)',
          borderRadius: 'var(--radius-card)',
          padding: '16px',
          border: '1px solid var(--hairline)',
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 500, marginBottom: 12, color: 'var(--text-muted)' }}>
          Cost summary & rates
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Net steel wt:</div>
            <div style={{ fontWeight: 500 }}>{fmtNum(totalWeightKg, 2)} kg</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {rates.steelRateRs > 0 ? `@ Rs. ${rates.steelRateRs}/kg` : 'Rate not set'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Net steel cost:</div>
            <div style={{ fontWeight: 500 }}>
              {netSteelCost > 0 ? `Rs. ${Math.round(netSteelCost).toLocaleString()}` : 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Wastage ({rates.wastagePercent}%):</div>
            <div style={{ fontWeight: 500 }}>
              {wastageCost > 0 ? `Rs. ${Math.round(wastageCost).toLocaleString()}` : 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Labor cost:</div>
            <div style={{ fontWeight: 500 }}>
              {laborCost > 0 ? `Rs. ${Math.round(laborCost).toLocaleString()}` : 'Not set'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {rates.laborRateRs > 0 ? `@ Rs. ${rates.laborRateRs}/kg` : 'Rate not set'}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--hairline)', paddingLeft: '12px' }}>
            <div style={{ color: 'var(--text-muted)' }}>Grand total cost:</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-text)' }}>
              {hasConfiguredRates && grandTotalCost > 0
                ? `Rs. ${Math.round(grandTotalCost).toLocaleString()}`
                : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Notes List */}
      {notes.length > 0 && (
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
            Notes & audit observations
          </h4>
          <ul className="notes-list">
            {notes.map((n) => (
              <li key={n.id} style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="note-dot" />
                <span>
                  <strong>{n.id}:</strong> {n.text || n.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
