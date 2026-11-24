import {
  Scene3D,
  Solid3D,
  BarPath3D,
  LinearDimension3D,
  LevelMark3D,
  LeaderAnnotation3D,
} from './types';
import { ColumnInputs, BbsRow, ComponentInstance } from '../engine/types';
import { fmtDimInches, fmtCalloutWithSpacing, fmtCalloutWithCount, fmtLevelText } from './formatting';

export interface ColumnDrawingDetails {
  colWidthIn: number;
  colDepthIn: number;
}

export const COLUMN_DRAWING_DEFAULTS: ColumnDrawingDetails = {
  colWidthIn: 12,
  colDepthIn: 18,
};

export function buildColumnScene(
  component: ComponentInstance,
  computedRows: BbsRow[],
): Scene3D {
  const p = component.params as ColumnInputs;
  const details: ColumnDrawingDetails = {
    ...COLUMN_DRAWING_DEFAULTS,
    ...(component.drawingDetails as Partial<ColumnDrawingDetails>),
  };

  const colWidthIn = details.colWidthIn; // along x
  const colDepthIn = details.colDepthIn; // along z

  const depthGLtoFootingIn = p.depthGLtoFootingFt * 12; // 60 in
  const plinthAboveGLIn = p.plinthAboveGLFt * 12;       // 24 in
  const colHeightAboveIn = p.columnHeightAboveFt * 12;   // 126 in
  const firstTieOffsetIn = p.firstTieOffsetFt * 12;     // 6 in
  const lapLengthIn = (p.lapFactor * (p.dowelBarNo / 8)); // 48 * 0.5 = 24 in

  // Origin y=0 at footing top.
  // GL is at y = depthGLtoFootingIn (60 in)
  // Plinth is at y = depthGLtoFootingIn + plinthAboveGLIn (84 in)
  // Column top is at y = 84 + colHeightAboveIn (210 in)
  const glY = depthGLtoFootingIn;
  const plinthY = glY + plinthAboveGLIn;
  const colTopY = plinthY + colHeightAboveIn;

  // Retrieve computed rows
  const r3 = computedRows.find((r) => r.id === 'R3'); // Dowels below plinth
  const r4 = computedRows.find((r) => r.id === 'R4'); // Ties below plinth
  const r5 = computedRows.find((r) => r.id === 'R5'); // Dowels above plinth
  const r6 = computedRows.find((r) => r.id === 'R6'); // Ties above plinth

  const dowelCount = r3?.count ?? r5?.count ?? p.dowelCount;
  const dowelBarNo = r3?.barNo ?? p.dowelBarNo;
  const dowelDia = r3?.diaIn ?? dowelBarNo / 8;

  const tieBarNo = r4?.barNo ?? p.tieBarNo;
  const tieDia = r4?.diaIn ?? tieBarNo / 8;
  const tieSpacingIn = r4?.spacingIn ?? p.tieSpacingIn;

  const tieWidthIn = p.tieWidthIn;   // 4.5 in (from engine)
  const tieDepthIn = p.tieDepthIn;   // 11 in (from engine)
  const tieSets = p.tieSetsPerLevel; // 2 sets per level

  const notes: string[] = [];

  // Check if tie size fits column size with 1.5 in cover
  const expectedTieWidth = colWidthIn - 3;
  const expectedTieDepth = colDepthIn - 3;
  if (Math.abs(tieWidthIn - expectedTieWidth) > 0.5 || Math.abs(tieDepthIn - expectedTieDepth) > 0.5) {
    notes.push(
      `Tie size comes from Sir's Excel (${tieWidthIn} x ${tieDepthIn} in) and does not match this column size (${colWidthIn} x ${colDepthIn} in). Drawn as specified.`,
    );
  }

  // 1. Solids
  const solids: Solid3D[] = [];

  // Column shaft from footing top to column top
  solids.push({
    id: 'column-shaft',
    label: component.name,
    material: 'concrete',
    min: [-colWidthIn / 2, 0, -colDepthIn / 2],
    max: [colWidthIn / 2, colTopY, colDepthIn / 2],
  });

  // Earth hatching block at GL
  solids.push({
    id: 'column-earth-left',
    label: 'Ground Level',
    material: 'earth',
    min: [-colWidthIn / 2 - 16, glY - 6, -colDepthIn / 2],
    max: [-colWidthIn / 2, glY, colDepthIn / 2],
  });

  // 2. Bars
  const bars: BarPath3D[] = [];

  // 8 Dowel positions around column perimeter
  // 4 corners + 2 on each long face (depth side)
  const dowelCover = 1.5;
  const hx = colWidthIn / 2 - dowelCover - dowelDia / 2;
  const hz = colDepthIn / 2 - dowelCover - dowelDia / 2;

  const dowelCoords: [number, number][] = [
    [-hx, -hz], // corner bottom-left
    [0, -hz],   // mid bottom
    [hx, -hz],  // corner bottom-right
    [hx, 0],    // mid right
    [hx, hz],   // corner top-right
    [0, hz],    // mid top
    [-hx, hz],  // corner top-left
    [-hx, 0],   // mid left
  ];

  // R3 Dowels below plinth (extending into footing with hook, up to plinth + lap)
  const hookLen = 12 * dowelDia; // 6 in
  const dowelLapTopY = plinthY + lapLengthIn;

  dowelCoords.slice(0, dowelCount).forEach(([dx, dz], idx) => {
    // Bottom hook into footing bends outwards
    const dirX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const dirZ = dz === 0 ? 0 : (dz > 0 ? 1 : -1);
    const hookX = dx + dirX * hookLen;
    const hookZ = dz + dirZ * (dirX === 0 ? hookLen : 0);

    bars.push({
      rowId: 'R3',
      markId: `col-dowel-below-${idx}`,
      diaIn: dowelDia,
      kind: 'dowel',
      points: [
        [hookX, -12 + dowelDia, hookZ],
        [dx, -12 + dowelDia, dz],
        [dx, dowelLapTopY, dz],
      ],
    });
  });

  // R5 Dowels above plinth (starting from plinth level up to column top - cover)
  const r5TopY = colTopY - p.topCoverIn;
  dowelCoords.slice(0, dowelCount).forEach(([dx, dz], idx) => {
    // Slight offset for lap splice visualization
    const spliceOffset = (idx % 2 === 0 ? 0.35 : -0.35);
    bars.push({
      rowId: 'R5',
      markId: `col-dowel-above-${idx}`,
      diaIn: dowelDia,
      kind: 'dowel',
      points: [
        [dx + spliceOffset, plinthY - 2, dz],
        [dx + spliceOffset, r5TopY, dz],
      ],
    });
  });

  // R4 Ties below plinth (up to plinth)
  // Tie loop size drawn centered as closed rectangle with cover
  const thw = colWidthIn / 2 - p.coverEachSideIn;
  const thd = colDepthIn / 2 - p.coverEachSideIn;
  const tieBelowCount = r4?.count ?? 26;
  const tieLevelsBelow = Math.max(1, Math.floor(tieBelowCount / tieSets));
  const tieStepBelow = p.depthGLtoFootingFt * 12 / (tieLevelsBelow - 1 || 1);

  for (let t = 0; t < tieLevelsBelow; t++) {
    const ty = Math.min(plinthY, 2 + t * tieStepBelow);
    bars.push({
      rowId: 'R4',
      markId: `col-tie-below-${t}`,
      diaIn: tieDia,
      kind: 'tie',
      points: [
        [-thw, ty, -thd],
        [thw, ty, -thd],
        [thw, ty, thd],
        [-thw, ty, thd],
        [-thw, ty, -thd],
      ],
    });
  }

  // R6 Ties above plinth
  const tieAboveCount = r6?.count ?? 42;
  const tieLevelsAbove = Math.max(1, Math.floor(tieAboveCount / tieSets));
  const startTieY = plinthY + firstTieOffsetIn;
  const endTieY = colTopY - p.topCoverIn;
  const tieStepAbove = (endTieY - startTieY) / (tieLevelsAbove - 1 || 1);

  for (let ta = 0; ta < tieLevelsAbove; ta++) {
    const ty = startTieY + ta * tieStepAbove;
    bars.push({
      rowId: 'R6',
      markId: `col-tie-above-${ta}`,
      diaIn: tieDia,
      kind: 'tie',
      points: [
        [-thw, ty, -thd],
        [thw, ty, -thd],
        [thw, ty, thd],
        [-thw, ty, thd],
        [-thw, ty, -thd],
      ],
    });
  }

  // 3. Dimensions, Level Marks, Leaders
  const dimensions: LinearDimension3D[] = [];
  const levelMarks: LevelMark3D[] = [];
  const leaders: LeaderAnnotation3D[] = [];

  // Width & Depth dimensions
  dimensions.push({
    id: 'dim-col-width',
    p1: [-colWidthIn / 2, 0, -colDepthIn / 2],
    p2: [colWidthIn / 2, 0, -colDepthIn / 2],
    text: fmtDimInches(colWidthIn),
    offsetIn: -8,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-col-depth',
    p1: [colWidthIn / 2, 0, -colDepthIn / 2],
    p2: [colWidthIn / 2, 0, colDepthIn / 2],
    text: fmtDimInches(colDepthIn),
    offsetIn: 8,
    axis: 'z',
  });

  // Vertical dimensions in elevation (placed on left with guaranteed clearance from level marks)
  const dimLeftX = -colWidthIn / 2 - 32;
  dimensions.push({
    id: 'dim-gl-depth',
    p1: [dimLeftX, 0, 0],
    p2: [dimLeftX, glY, 0],
    text: fmtDimInches(depthGLtoFootingIn),
    offsetIn: -8,
    axis: 'y',
  });

  dimensions.push({
    id: 'dim-plinth-height',
    p1: [dimLeftX, glY, 0],
    p2: [dimLeftX, plinthY, 0],
    text: fmtDimInches(plinthAboveGLIn),
    offsetIn: -8,
    axis: 'y',
  });

  dimensions.push({
    id: 'dim-col-above',
    p1: [dimLeftX, plinthY, 0],
    p2: [dimLeftX, colTopY, 0],
    text: fmtDimInches(colHeightAboveIn),
    offsetIn: -8,
    axis: 'y',
  });

  // Level marks (placed closer to column shaft, separated from dimensions by > 20 in)
  levelMarks.push({
    id: 'col-lm-gl',
    p: [-colWidthIn / 2 - 6, glY, 0],
    elevationFt: -(plinthAboveGLIn / 12),
    text: fmtLevelText(-(plinthAboveGLIn / 12)),
    label: 'G.LEV.',
    hasEarthHatch: true,
  });

  levelMarks.push({
    id: 'col-lm-plinth',
    p: [-colWidthIn / 2 - 6, plinthY, 0],
    elevationFt: 0,
    text: "EL.±0'-0\"",
    label: 'PLINTH LEVEL',
  });

  // Leaders
  leaders.push({
    id: 'col-lead-dowels',
    rowId: 'R3',
    target: [hx, plinthY / 2, hz],
    text: fmtCalloutWithCount(dowelCount, dowelBarNo),
    preferredSide: 'right',
  });

  leaders.push({
    id: 'col-lead-ties-below',
    rowId: 'R4',
    target: [thw, glY / 2, thd],
    text: `${fmtCalloutWithSpacing(tieBarNo, tieSpacingIn)} (x${tieSets})`,
    preferredSide: 'right',
  });

  leaders.push({
    id: 'col-lead-ties-above',
    rowId: 'R6',
    target: [thw, plinthY + colHeightAboveIn / 2, thd],
    text: `${fmtCalloutWithSpacing(tieBarNo, tieSpacingIn)} (x${tieSets})`,
    preferredSide: 'right',
  });

  return {
    solids,
    bars,
    dimensions,
    levelMarks,
    leaders,
    sectionMarkers: [],
    title: 'COLUMN ELEVATION',
    subTitle: `(${colWidthIn}"x${colDepthIn}")`,
    notes,
  };
}
