import { ComponentInstance, BbsRow } from '../engine/types';
import {
  View2D,
  Point2D,
  Polygon2D,
  Line2D,
  Circle2D,
  Dimension2D,
  LevelMark2D,
  Leader2D,
  SectionMarker2D,
  DrawingStyle,
} from './types';
import { buildFootingScene } from './footingScene';
import { buildColumnScene } from './columnScene';
import { buildBeamScene } from './beamScene';
import { projectScene } from './projection';

/**
 * Transforms a 2D view by scaling and translating its elements into a target box.
 */
function fitViewIntoBox(
  source: View2D,
  box: { x: number; y: number; w: number; h: number },
  prefix: string,
) {
  const { minU, minV, width, height } = source.bounds;
  const scale = Math.min(box.w / Math.max(1, width), box.h / Math.max(1, height)) * 0.92;
  const cx = box.x + (box.w - width * scale) / 2;
  const cy = box.y + (box.h - height * scale) / 2;

  const tx = (u: number) => cx + (u - minU) * scale;
  const ty = (v: number) => cy + (v - minV) * scale;

  const polygons: Polygon2D[] = source.polygons.map((p) => ({
    id: `${prefix}-${p.id}`,
    material: p.material,
    points: p.points.map(([u, v]) => [tx(u), ty(v)] as Point2D),
  }));

  const lines: Line2D[] = source.lines.map((l) => ({
    id: `${prefix}-${l.id}`,
    rowId: l.rowId,
    markId: l.markId,
    diaIn: l.diaIn * scale,
    kind: l.kind,
    points: l.points.map(([u, v]) => [tx(u), ty(v)] as Point2D),
  }));

  const circles: Circle2D[] = source.circles.map((c) => ({
    id: `${prefix}-${c.id}`,
    rowId: c.rowId,
    markId: c.markId,
    center: [tx(c.center[0]), ty(c.center[1])] as Point2D,
    radiusIn: Math.max(0.8, c.radiusIn * scale),
    kind: c.kind,
  }));

  const dimensions: Dimension2D[] = source.dimensions.map((d) => ({
    id: `${prefix}-${d.id}`,
    p1: [tx(d.p1[0]), ty(d.p1[1])] as Point2D,
    p2: [tx(d.p2[0]), ty(d.p2[1])] as Point2D,
    text: d.text,
    subText: d.subText,
    offset: d.offset * scale,
    orientation: d.orientation,
  }));

  const levelMarks: LevelMark2D[] = source.levelMarks.map((lm) => ({
    id: `${prefix}-${lm.id}`,
    x: tx(lm.x),
    y: ty(lm.y),
    text: lm.text,
    label: lm.label,
    hasEarthHatch: lm.hasEarthHatch,
  }));

  const leaders: Leader2D[] = source.leaders.map((lead) => ({
    id: `${prefix}-${lead.id}`,
    rowId: lead.rowId,
    target: [tx(lead.target[0]), ty(lead.target[1])] as Point2D,
    text: lead.text,
    direction: lead.direction,
  }));

  const sectionMarkers: SectionMarker2D[] = source.sectionMarkers.map((sm) => ({
    id: `${prefix}-${sm.id}`,
    p: [tx(sm.p[0]), ty(sm.p[1])] as Point2D,
    label: sm.label,
    direction: sm.direction,
  }));

  return { polygons, lines, circles, dimensions, levelMarks, leaders, sectionMarkers };
}

/**
 * Builds an A3 Construction Site Working Sheet for the given component.
 * Standard A3 Landscape sheet size: 420 x 297 mm.
 * Contains:
 * - Outer sheet border framing the SVG content
 * - Side-by-side sub-views using Textbook geometry (1-rep bar per row + TYP. labels)
 * - Bar mark tags: leaders [N] #barNo (description) in right margin
 * - General Notes and Title Block rendered as HTML below SVG
 */
export function buildSiteView2D(
  component: ComponentInstance,
  computedRows: BbsRow[],
  allComponents: ComponentInstance[],
  _drawingStyle: DrawingStyle = 'textbook',
): View2D {
  const SHEET_W = 420;
  const SHEET_H = 297;

  const polygons: Polygon2D[] = [];
  const lines: Line2D[] = [];
  const circles: Circle2D[] = [];
  const dimensions: Dimension2D[] = [];
  const levelMarks: LevelMark2D[] = [];
  const leaders: Leader2D[] = [];
  const sectionMarkers: SectionMarker2D[] = [];
  const notes: string[] = [];

  // 1. Outer Border Frame (Framing the entire SVG content)
  lines.push({
    id: 'sheet-border-outer',
    rowId: '',
    markId: 'border-outer',
    diaIn: 1.0,
    kind: 'main',
    points: [
      [12, 12],
      [SHEET_W - 12, 12],
      [SHEET_W - 12, SHEET_H - 12],
      [12, SHEET_H - 12],
      [12, 12],
    ],
  });

  // 2. Component Sub-Views Layout (Always 1-rep Textbook geometry)
  if (component.type === 'footing') {
    const scene = buildFootingScene(component, computedRows, allComponents);
    const sec = projectScene(scene, 'footing-section', 'textbook');
    const plan = projectScene(scene, 'footing-plan', 'textbook');

    // Section view on left half: x = 20 to 195, y = 20 to 280
    const secBox = fitViewIntoBox(sec, { x: 20, y: 20, w: 180, h: 255 }, 'sec');
    // Plan view on right half: x = 205 to 380, y = 20 to 280
    const planBox = fitViewIntoBox(plan, { x: 205, y: 20, w: 175, h: 255 }, 'plan');

    polygons.push(...secBox.polygons, ...planBox.polygons);
    lines.push(...secBox.lines, ...planBox.lines);
    circles.push(...secBox.circles, ...planBox.circles);
    dimensions.push(...secBox.dimensions, ...planBox.dimensions);
    levelMarks.push(...secBox.levelMarks);
  } else if (component.type === 'column') {
    const scene = buildColumnScene(component, computedRows);
    const elev = projectScene(scene, 'column-elevation', 'textbook');
    const sec = projectScene(scene, 'column-section', 'textbook');

    // Column elevation on left: x = 20 to 230, y = 20 to 280
    const elevBox = fitViewIntoBox(elev, { x: 20, y: 20, w: 210, h: 255 }, 'elev');
    // Cross-section on right: x = 240 to 385, y = 40 to 255
    const secBox = fitViewIntoBox(sec, { x: 240, y: 40, w: 145, h: 215 }, 'sec');

    polygons.push(...elevBox.polygons, ...secBox.polygons);
    lines.push(...elevBox.lines, ...secBox.lines);
    circles.push(...secBox.circles);
    dimensions.push(...elevBox.dimensions, ...secBox.dimensions);
    levelMarks.push(...elevBox.levelMarks);
  } else if (component.type === 'beam') {
    const scene = buildBeamScene(component, computedRows);
    const elev = projectScene(scene, 'beam-elevation', 'textbook');
    const sec = projectScene(scene, 'beam-section', 'textbook');

    // Beam elevation along top: x = 20 to 385, y = 125 to 280
    const elevBox = fitViewIntoBox(elev, { x: 20, y: 125, w: 365, h: 150 }, 'elev');
    // Beam Section A-A centered below: x = 125 to 275, y = 20 to 120
    const secBox = fitViewIntoBox(sec, { x: 125, y: 20, w: 150, h: 100 }, 'sec');

    polygons.push(...elevBox.polygons, ...secBox.polygons);
    lines.push(...elevBox.lines, ...secBox.lines);
    circles.push(...secBox.circles);
    dimensions.push(...elevBox.dimensions, ...secBox.dimensions);
    sectionMarkers.push(...elevBox.sectionMarkers);
  }

  // 3. Add BBS Bar Mark Tags for each computed row (Leaders in Right Margin Column)
  computedRows.forEach((r, idx) => {
    const tagNo = idx + 1;
    // Find representative line or circle with this rowId
    const repLine = lines.find((l) => l.rowId === r.id);
    const repCircle = circles.find((c) => c.rowId === r.id);

    if (repLine && repLine.points.length >= 2) {
      const midIdx = Math.floor(repLine.points.length / 2);
      const pt = repLine.points[midIdx];
      leaders.push({
        id: `site-tag-${r.id}`,
        rowId: r.id,
        target: pt,
        text: `[${tagNo}] #${r.barNo} (${r.description})`,
        direction: 'right',
      });
    } else if (repCircle) {
      leaders.push({
        id: `site-tag-${r.id}`,
        rowId: r.id,
        target: repCircle.center,
        text: `[${tagNo}] #${r.barNo} (${r.description})`,
        direction: 'right',
      });
    }
  });

  return {
    viewId: 'site',
    title: `${component.name.toUpperCase()} — SITE WORKING DRAWING`,
    subTitle: 'A3 LANDSCAPE WORKING SHEET',
    siteView: true,
    bounds: {
      minU: 0,
      maxU: SHEET_W,
      minV: 0,
      maxV: SHEET_H,
      width: SHEET_W,
      height: SHEET_H,
    },
    polygons,
    lines,
    circles,
    dimensions,
    levelMarks,
    leaders,
    sectionMarkers,
    notes,
  };
}
