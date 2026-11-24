import {
  Scene3D,
  Solid3D,
  BarPath3D,
  LinearDimension3D,
  LevelMark3D,
  LeaderAnnotation3D,
} from './types';
import { FootingInputs, ColumnInputs, BbsRow, ComponentInstance } from '../engine/types';
import { fmtDimInches, fmtCalloutWithSpacing, fmtCalloutWithCount, fmtLevelText } from './formatting';

export interface FootingDrawingDetails {
  thicknessIn: number;
  leanThicknessIn: number;
  leanProjectionIn: number;
  leanMixLabel: string;
  linkedColumnId: string | null;
  unlinkedDepthGLtoFootingFt?: number;
  unlinkedPlinthAboveGLFt?: number;
}

export const FOOTING_DRAWING_DEFAULTS: FootingDrawingDetails = {
  thicknessIn: 12,
  leanThicknessIn: 4,
  leanProjectionIn: 4,
  leanMixLabel: '1:4:8',
  linkedColumnId: null, // set to 'c1' in sample project
  unlinkedDepthGLtoFootingFt: 5,
  unlinkedPlinthAboveGLFt: 2,
};

export function buildFootingScene(
  component: ComponentInstance,
  computedRows: BbsRow[],
  allComponents: ComponentInstance[],
): Scene3D {
  const p = component.params as FootingInputs;
  const details: FootingDrawingDetails = {
    ...FOOTING_DRAWING_DEFAULTS,
    ...(component.drawingDetails as Partial<FootingDrawingDetails>),
  };

  const B_in = p.B * 12; // width in inches (along z)
  const L_in = p.L * 12; // length in inches (along x)
  const coverIn = p.coverEachSideIn;
  const thicknessIn = details.thicknessIn;
  const leanThickIn = details.leanThicknessIn;
  const leanProjIn = details.leanProjectionIn;

  // Retrieve computed rows
  const r1 = computedRows.find((r) => r.id === 'R1'); // Main bars along L
  const r2 = computedRows.find((r) => r.id === 'R2'); // Dist bars along B

  const mainCount = r1?.count ?? 13;
  const mainBarNo = r1?.barNo ?? p.mainBarNo;
  const mainDia = r1?.diaIn ?? mainBarNo / 8;
  const mainSpacingIn = r1?.spacingIn ?? p.mainSpacingIn;

  const distCount = r2?.count ?? 11;
  const distBarNo = r2?.barNo ?? p.distBarNo;
  const distDia = r2?.diaIn ?? distBarNo / 8;
  const distSpacingIn = r2?.spacingIn ?? p.distSpacingIn;

  // 1. Solids
  const solids: Solid3D[] = [];

  // Footing concrete block
  // Centered at x=0, z=0. y from 0 to thicknessIn
  solids.push({
    id: 'footing-solid',
    label: component.name,
    material: 'concrete',
    min: [-L_in / 2, 0, -B_in / 2],
    max: [L_in / 2, thicknessIn, B_in / 2],
  });

  // Lean concrete block
  solids.push({
    id: 'lean-concrete-solid',
    label: `${details.leanMixLabel} LEAN CONCRETE`,
    material: 'lean_concrete',
    min: [-L_in / 2 - leanProjIn, -leanThickIn, -B_in / 2 - leanProjIn],
    max: [L_in / 2 + leanProjIn, 0, B_in / 2 + leanProjIn],
  });

  // Check if linked column exists
  let linkedColumn = details.linkedColumnId
    ? allComponents.find((c) => c.id === details.linkedColumnId && c.type === 'column')
    : undefined;

  // If sample project default (C1)
  if (!linkedColumn && details.linkedColumnId === 'c1') {
    linkedColumn = allComponents.find((c) => c.type === 'column');
  }

  const notes: string[] = [];
  if (!linkedColumn) {
    notes.push('No column linked — select a column in Drawing Details to show column & dowels');
  }

  let depthGLtoFootingIn = (details.unlinkedDepthGLtoFootingFt ?? 5) * 12;
  let plinthAboveGLIn = (details.unlinkedPlinthAboveGLFt ?? 2) * 12;

  let colWidthIn = 12;
  let colDepthIn = 18;
  let colDowelCount = 8;
  let colDowelBarNo = 4;
  let colTieSpacingIn = 6;
  let colTieBarNo = 3;

  if (linkedColumn) {
    const cp = linkedColumn.params as ColumnInputs;
    depthGLtoFootingIn = cp.depthGLtoFootingFt * 12;
    plinthAboveGLIn = cp.plinthAboveGLFt * 12;
    colDowelCount = cp.dowelCount;
    colDowelBarNo = cp.dowelBarNo;
    colTieSpacingIn = cp.tieSpacingIn;
    colTieBarNo = cp.tieBarNo;

    // Check column drawing details for width & depth
    const colDetails = linkedColumn.drawingDetails as { colWidthIn?: number; colDepthIn?: number } | undefined;
    if (colDetails?.colWidthIn) colWidthIn = colDetails.colWidthIn;
    if (colDetails?.colDepthIn) colDepthIn = colDetails.colDepthIn;

    // Add column solid rising above footing
    const colTopY = thicknessIn + depthGLtoFootingIn + plinthAboveGLIn + 24; // extends past plinth
    solids.push({
      id: 'column-shaft',
      label: linkedColumn.name,
      material: 'concrete',
      min: [-colWidthIn / 2, thicknessIn, -colDepthIn / 2],
      max: [colWidthIn / 2, colTopY, colDepthIn / 2],
    });

    // Earth block at GL
    const glY = thicknessIn + depthGLtoFootingIn;
    solids.push({
      id: 'earth-left',
      label: 'Ground Level',
      material: 'earth',
      min: [-L_in / 2 - 12, glY - 6, -colDepthIn / 2],
      max: [-colWidthIn / 2, glY, colDepthIn / 2],
    });
  }

  // 2. Bar Paths
  const bars: BarPath3D[] = [];

  // R1 – Main Bars (along L / x-axis, spaced across B / z-axis)
  // U-bars with vertical hooks rising to top cover
  const hookTopY = thicknessIn - coverIn;
  const mainBottomY = coverIn + mainDia / 2;
  const mainStartX = -L_in / 2 + coverIn;
  const mainEndX = L_in / 2 - coverIn;

  const zStartMain = -B_in / 2 + coverIn + mainDia / 2;
  const zEndMain = B_in / 2 - coverIn - mainDia / 2;
  const zStepMain = mainCount > 1 ? (zEndMain - zStartMain) / (mainCount - 1) : 0;

  for (let i = 0; i < mainCount; i++) {
    const zPos = mainCount > 1 ? zStartMain + i * zStepMain : 0;
    bars.push({
      rowId: 'R1',
      markId: `R1-${i}`,
      diaIn: mainDia,
      kind: 'main',
      points: [
        [mainStartX, hookTopY, zPos],
        [mainStartX, mainBottomY, zPos],
        [mainEndX, mainBottomY, zPos],
        [mainEndX, hookTopY, zPos],
      ],
    });
  }

  // R2 – Dist Bars (along B / z-axis, spaced across L / x-axis)
  // Rest directly on top of main bars!
  const distBottomY = mainBottomY + mainDia / 2 + distDia / 2;
  const distStartZ = -B_in / 2 + coverIn;
  const distEndZ = B_in / 2 - coverIn;

  const xStartDist = -L_in / 2 + coverIn + distDia / 2;
  const xEndDist = L_in / 2 - coverIn - distDia / 2;
  const xStepDist = distCount > 1 ? (xEndDist - xStartDist) / (distCount - 1) : 0;

  for (let j = 0; j < distCount; j++) {
    const xPos = distCount > 1 ? xStartDist + j * xStepDist : 0;
    bars.push({
      rowId: 'R2',
      markId: `R2-${j}`,
      diaIn: distDia,
      kind: 'dist',
      points: [
        [xPos, hookTopY, distStartZ],
        [xPos, distBottomY, distStartZ],
        [xPos, distBottomY, distEndZ],
        [xPos, hookTopY, distEndZ],
      ],
    });
  }

  // Column dowels & ties if column linked
  if (linkedColumn) {
    const dDia = colDowelBarNo / 8;
    const tDia = colTieBarNo / 8;
    const dowelCoverIn = 1.5;
    const dowelHookY = mainBottomY + dDia / 2;
    const dowelTopY = thicknessIn + depthGLtoFootingIn + plinthAboveGLIn + 20;

    // 8 dowels positioned around column perimeter
    const hw = colWidthIn / 2 - dowelCoverIn;
    const hd = colDepthIn / 2 - dowelCoverIn;
    const dowelPositions: [number, number][] = [
      [-hw, -hd], [0, -hd], [hw, -hd],
      [hw, 0], [hw, hd], [0, hd],
      [-hw, hd], [-hw, 0],
    ];

    dowelPositions.forEach(([dx, dz], idx) => {
      // Bottom bend (L) extends outwards 6" into footing
      const bendDirX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
      const bendDirZ = dz === 0 ? 0 : (dz > 0 ? 1 : -1);
      const hookEndX = dx + bendDirX * 6;
      const hookEndZ = dz + bendDirZ * 6;

      bars.push({
        rowId: 'R3',
        markId: `col-dowel-${idx}`,
        diaIn: dDia,
        kind: 'dowel',
        points: [
          [hookEndX, dowelHookY, hookEndZ],
          [dx, dowelHookY, dz],
          [dx, dowelTopY, dz],
        ],
      });
    });

    // Column ties below plinth
    const tieBottomY = thicknessIn + 2;
    const tieTopY = thicknessIn + depthGLtoFootingIn + plinthAboveGLIn;
    const numTies = Math.max(1, Math.floor((tieTopY - tieBottomY) / colTieSpacingIn));

    for (let t = 0; t <= numTies; t++) {
      const ty = tieBottomY + t * colTieSpacingIn;
      if (ty > tieTopY) break;
      bars.push({
        rowId: 'R4',
        markId: `col-tie-${t}`,
        diaIn: tDia,
        kind: 'tie',
        points: [
          [-hw, ty, -hd],
          [hw, ty, -hd],
          [hw, ty, hd],
          [-hw, ty, hd],
          [-hw, ty, -hd],
        ],
      });
    }
  }

  // 3. Annotations & Dimensions
  const dimensions: LinearDimension3D[] = [];
  const levelMarks: LevelMark3D[] = [];
  const leaders: LeaderAnnotation3D[] = [];

  // Footing width B (across z / in section)
  dimensions.push({
    id: 'dim-B',
    p1: [0, 0, -B_in / 2],
    p2: [0, 0, B_in / 2],
    text: fmtDimInches(B_in),
    offsetIn: -12,
    axis: 'z',
  });

  // Footing length L (along x / in plan)
  dimensions.push({
    id: 'dim-L',
    p1: [-L_in / 2, 0, -B_in / 2 - 8],
    p2: [L_in / 2, 0, -B_in / 2 - 8],
    text: fmtDimInches(L_in),
    offsetIn: -10,
    axis: 'x',
  });

  // Footing thickness (12")
  dimensions.push({
    id: 'dim-thickness',
    p1: [0, 0, -B_in / 2],
    p2: [0, thicknessIn, -B_in / 2],
    text: fmtDimInches(thicknessIn),
    offsetIn: -8,
    axis: 'y',
  });

  // Lean concrete thickness (4")
  dimensions.push({
    id: 'dim-lean-thick',
    p1: [0, -leanThickIn, -B_in / 2 - leanProjIn],
    p2: [0, 0, -B_in / 2 - leanProjIn],
    text: fmtDimInches(leanThickIn),
    offsetIn: -8,
    axis: 'y',
  });

  // Lean projections (4" each side)
  dimensions.push({
    id: 'dim-lean-proj-left',
    p1: [0, 0, -B_in / 2 - leanProjIn],
    p2: [0, 0, -B_in / 2],
    text: fmtDimInches(leanProjIn),
    offsetIn: -6,
    axis: 'z',
  });

  dimensions.push({
    id: 'dim-lean-proj-right',
    p1: [0, 0, B_in / 2],
    p2: [0, 0, B_in / 2 + leanProjIn],
    text: fmtDimInches(leanProjIn),
    offsetIn: -6,
    axis: 'z',
  });

  // Overall lean concrete width (e.g. 4'-8" or 5'-8")
  dimensions.push({
    id: 'dim-lean-total',
    p1: [0, -leanThickIn, -B_in / 2 - leanProjIn],
    p2: [0, -leanThickIn, B_in / 2 + leanProjIn],
    text: fmtDimInches(B_in + 2 * leanProjIn),
    offsetIn: -12,
    axis: 'z',
  });

  // If column linked, add GL depth dimension and level marks
  if (linkedColumn) {
    const glY = thicknessIn + depthGLtoFootingIn;
    const plinthY = glY + plinthAboveGLIn;
    const lapIn = (linkedColumn.params as ColumnInputs).lapFactor * (colDowelBarNo / 8);

    // 5'-0" dimension from GL to footing top
    dimensions.push({
      id: 'dim-depth-gl',
      p1: [-colWidthIn / 2 - 24, thicknessIn, 0],
      p2: [-colWidthIn / 2 - 24, glY, 0],
      text: fmtDimInches(depthGLtoFootingIn),
      offsetIn: -8,
      axis: 'y',
    });

    // 2'-0" dimension for plinth above GL
    dimensions.push({
      id: 'dim-plinth-above-gl',
      p1: [-colWidthIn / 2 - 24, glY, 0],
      p2: [-colWidthIn / 2 - 24, plinthY, 0],
      text: fmtDimInches(plinthAboveGLIn),
      offsetIn: -8,
      axis: 'y',
    });

    // Column width dimension at top
    dimensions.push({
      id: 'dim-col-width',
      p1: [-colWidthIn / 2, plinthY + 28, 0],
      p2: [colWidthIn / 2, plinthY + 28, 0],
      text: fmtDimInches(colWidthIn),
      offsetIn: 6,
      axis: 'x',
    });

    // Lap splice annotation
    leaders.push({
      id: 'lead-lap',
      target: [colWidthIn / 2 - 1.5, plinthY + lapIn / 2, 0],
      text: `[ ${fmtDimInches(lapIn)} LAP ]`,
      preferredSide: 'right',
    });

    // Level marks: GL & Plinth (placed close to column, >= 20" clear of vertical dimensions)
    levelMarks.push({
      id: 'lm-gl',
      p: [-colWidthIn / 2 - 6, glY, 0],
      elevationFt: -(depthGLtoFootingIn / 12),
      text: fmtLevelText(-(plinthAboveGLIn / 12)),
      label: 'G.LEV.',
      hasEarthHatch: true,
    });

    levelMarks.push({
      id: 'lm-plinth',
      p: [-colWidthIn / 2 - 6, plinthY, 0],
      elevationFt: 0,
      text: "EL.±0'-0\"",
      label: 'PLINTH LEVEL',
    });

    // Leaders for column dowels and ties
    leaders.push({
      id: 'lead-dowels',
      rowId: 'R3',
      target: [0, glY + 8, -colDepthIn / 2],
      text: fmtCalloutWithCount(colDowelCount, colDowelBarNo),
      preferredSide: 'right',
    });

    leaders.push({
      id: 'lead-ties',
      rowId: 'R4',
      target: [0, glY - 12, -colDepthIn / 2],
      text: fmtCalloutWithSpacing(colTieBarNo, colTieSpacingIn),
      preferredSide: 'right',
    });
  }

  // Leaders for Footing bars
  leaders.push({
    id: 'lead-main',
    rowId: 'R1',
    target: [L_in * 0.25, mainBottomY, 0],
    text: fmtCalloutWithSpacing(mainBarNo, mainSpacingIn),
    preferredSide: 'right',
  });

  leaders.push({
    id: 'lead-dist',
    rowId: 'R2',
    target: [-L_in * 0.25, distBottomY, 0],
    text: fmtCalloutWithSpacing(distBarNo, distSpacingIn),
    preferredSide: 'left',
  });

  leaders.push({
    id: 'lead-lean',
    target: [L_in / 2 + leanProjIn, -leanThickIn / 2, 0],
    text: `${details.leanMixLabel}\nLEAN CONCRETE`,
    preferredSide: 'right',
  });

  return {
    solids,
    bars,
    dimensions,
    levelMarks,
    leaders,
    sectionMarkers: [],
    title: 'Section of Column Footing',
    subTitle: `B=${p.B}' × L=${p.L}'`,
    notes,
  };
}
