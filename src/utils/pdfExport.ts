import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BbsResult, BbsRow, SizeSummary, RatesInputs } from '../engine/types';
import { fmtDia, fmtNum, fmtShape } from './units';

function formatCount(row: BbsRow): string {
  return row.hasNonIntegerCount ? row.count.toFixed(6) : String(row.count);
}

function formatHook(row: BbsRow): string {
  return row.hookFt === 0 ? '—' : fmtNum(row.hookFt, 6);
}

export function exportPdf(
  result: BbsResult,
  projectName: string,
  rates?: RatesInputs,
  date?: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  const dateStr = date ?? new Date().toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Title Header ─────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bar Bending Schedule', 40, 34);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(projectName, 40, 48);
  doc.text(`Date: ${dateStr}`, doc.internal.pageSize.width - 40, 48, { align: 'right' });

  // ── Build table body grouped by section / instance ───────────────────────
  const body: (string | { content: string; colSpan?: number; styles?: object })[][] = [];
  let sno = 0;

  // Group rows while preserving order
  const sectionGroups: Array<{ title: string; rows: BbsRow[] }> = [];
  let currentGroup: { title: string; rows: BbsRow[] } | null = null;

  for (const row of result.rows) {
    const groupTitle = row.componentName
      ? `${row.componentName} — ${row.section}`
      : row.section;

    if (!currentGroup || currentGroup.title !== groupTitle) {
      currentGroup = { title: groupTitle, rows: [] };
      sectionGroups.push(currentGroup);
    }
    currentGroup.rows.push(row);
  }

  for (const group of sectionGroups) {
    // Section header row
    body.push([
      {
        content: group.title,
        colSpan: 15,
        styles: {
          fontStyle: 'bold' as const,
          fillColor: [225, 235, 250] as [number, number, number],
          fontSize: 8,
          textColor: [20, 40, 80],
        },
      },
    ]);

    for (const row of group.rows) {
      sno++;
      body.push([
        String(sno),
        row.description,
        fmtShape(row.shape, row.barType),
        String(row.barNo),
        fmtDia(row.barNo),
        row.spacingIn !== null ? `${row.spacingIn}"` : '—',
        formatCount(row),
        fmtNum(row.straightFt, 6),
        formatHook(row),
        fmtNum(row.totalFt, 6),
        fmtNum(row.totalLenFt, 6),
        fmtNum(row.unitWeightLbPerFt, 6),
        fmtNum(row.weightLb, 6),
        fmtNum(row.weightKg, 6),
        row.remarks,
      ]);
    }
  }

  // Grand total row
  body.push([
    {
      content: 'Grand Total',
      colSpan: 12,
      styles: {
        fontStyle: 'bold' as const,
        halign: 'right' as const,
        fillColor: [240, 240, 240] as [number, number, number],
      },
    },
    {
      content: fmtNum(result.grandTotalLb, 4),
      styles: {
        fontStyle: 'bold' as const,
        halign: 'right' as const,
        fillColor: [240, 240, 240] as [number, number, number],
      },
    },
    {
      content: fmtNum(result.grandTotalKg, 4),
      styles: {
        fontStyle: 'bold' as const,
        halign: 'right' as const,
        fillColor: [240, 240, 240] as [number, number, number],
      },
    },
    {
      content: '',
      styles: { fillColor: [240, 240, 240] as [number, number, number] },
    },
  ]);

  // Size-wise summary
  const sizeSummaryText = 'Summary by bar size:  ' + result.bySize
    .map((s: SizeSummary) => `#${s.barNo} (${fmtDia(s.barNo)}"): ${fmtNum(s.weightLb, 2)} lb  /  ${fmtNum(s.weightKg, 2)} kg`)
    .join('    |    ');

  body.push([
    {
      content: sizeSummaryText,
      colSpan: 15,
      styles: {
        fontStyle: 'bold' as const,
        fillColor: [248, 248, 248] as [number, number, number],
        fontSize: 7.5,
        halign: 'left' as const,
      },
    },
  ]);

  // Cost estimate summary if rates provided
  if (rates && (rates.steelRateRs > 0 || rates.laborRateRs > 0)) {
    const netKg = result.grandTotalKg;
    const grossKg = netKg * (1 + rates.wastagePercent / 100);
    const steelCost = grossKg * rates.steelRateRs;
    const laborCost = netKg * rates.laborRateRs;
    const totalCost = steelCost + laborCost;

    const costText = `Cost Estimate: Steel (Rs ${rates.steelRateRs}/kg @ ${rates.wastagePercent}% wastage) = Rs ${fmtNum(steelCost, 0)}  |  Labor (Rs ${rates.laborRateRs}/kg) = Rs ${fmtNum(laborCost, 0)}  |  Total = Rs ${fmtNum(totalCost, 0)}`;

    body.push([
      {
        content: costText,
        colSpan: 15,
        styles: {
          fontStyle: 'bold' as const,
          fillColor: [253, 246, 227] as [number, number, number],
          fontSize: 7.5,
          halign: 'left' as const,
        },
      },
    ]);
  }

  // ── autoTable ─────────────────────────────────────────────────────────────
  const callAutoTable = (autoTable as unknown as { default?: typeof autoTable })?.default || autoTable;
  callAutoTable(doc, {
    startY: 58,
    margin: { left: 40, right: 40, top: 40, bottom: 35 },
    head: [
      [
        { content: 'S.No.', rowSpan: 2 },
        { content: 'Description of Items', rowSpan: 2 },
        { content: 'Shape of Bar', rowSpan: 2 },
        { content: 'Dia of bar', colSpan: 2 },
        { content: 'Spacing in c/c', rowSpan: 2 },
        { content: 'No. of bars', rowSpan: 2 },
        { content: 'Length (ft)', colSpan: 3 },
        { content: 'Tot Len ft', rowSpan: 2 },
        { content: 'Unit Wt lb/ft', rowSpan: 2 },
        { content: 'Weight of Bar', colSpan: 2 },
        { content: 'Remarks', rowSpan: 2 },
      ],
      [
        '# of bar',
        'in',
        'Straight',
        'Hook',
        'Total',
        'lb',
        'kg',
      ],
    ],
    body: body as never,
    styles: {
      fontSize: 7.2,
      cellPadding: 4,
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
      font: 'helvetica',
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 7.2,
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 },
      1: { halign: 'left', cellWidth: 160 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 32 },
      6: { halign: 'right', cellWidth: 34 },
      7: { halign: 'right', cellWidth: 44 },
      8: { halign: 'right', cellWidth: 34 },
      9: { halign: 'right', cellWidth: 44 },
      10: { halign: 'right', cellWidth: 44 },
      11: { halign: 'right', cellWidth: 38 },
      12: { halign: 'right', cellWidth: 44 },
      13: { halign: 'right', cellWidth: 44 },
      14: { halign: 'left', cellWidth: 'auto' },
    },
    showHead: 'everyPage',
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `${projectName} | Generated on ${dateStr} | Page ${data.pageNumber}`,
        40,
        pageHeight - 18,
      );
      doc.setTextColor(0);
    },
  });

  if (typeof window !== 'undefined') {
    doc.save(`BBS_${projectName.replace(/\s+/g, '_')}.pdf`);
  }
}
