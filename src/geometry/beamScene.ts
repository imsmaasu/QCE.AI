import {
  Scene3D,
  Solid3D,
  BarPath3D,
  LinearDimension3D,
  LeaderAnnotation3D,
  SectionMarker3D,
} from './types';
import { BeamInputs, BbsRow, ComponentInstance } from '../engine/types';
import { fmtDimInches, fmtBarDia, fmtCalloutWithCount, fmtCalloutWithSpacing } from './formatting';

export function buildBeamScene(
  component: ComponentInstance,
  computedRows: BbsRow[],
): Scene3D {
  const p = component.params as BeamInputs;

  const beamWidthIn = p.beamWidthIn;   // 8 in (along z)
  const beamDepthIn = p.beamDepthIn;   // 24 in (along y)
  const clearSpanIn = p.clearSpanFt * 12; // 186 in = 15'-6" (along x)
  const colWidthIn = p.columnWidthFt * 12; // 18 in (support columns at each end)
  const coverIn = p.coverEachSideIn;    // 0.75 in
  const totalCoverDeductionIn = 2 * coverIn; // 1.5 in

  // Retrieve computed rows
  const r7 = computedRows.find((r) => r.id === 'R7');   // Bottom longitudinal
  const r8 = computedRows.find((r) => r.id === 'R8');   // Extra bottom
  const r9 = computedRows.find((r) => r.id === 'R9');   // Top longitudinal
  const r10 = computedRows.find((r) => r.id === 'R10'); // Stirrups @ ends
  const r11 = computedRows.find((r) => r.id === 'R11'); // Stirrups @ mid

  const bottomCount = r7?.count ?? p.bottomBarCount;
  const bottomBarNo = r7?.barNo ?? p.bottomBarNo;
  const bottomDia = r7?.diaIn ?? bottomBarNo / 8;

  const extraBottomCount = r8?.count ?? p.extraBottomBarCount;
  const extraBottomBarNo = r8?.barNo ?? p.extraBottomBarNo;
  const extraBottomDia = r8?.diaIn ?? extraBottomBarNo / 8;

  const topCount = r9?.count ?? p.topBarCount;
  const topBarNo = r9?.barNo ?? p.topBarNo;
  const topDia = r9?.diaIn ?? topBarNo / 8;

  const stirrupEndCount = r10?.count ?? 15;
  const stirrupMidCount = r11?.count ?? 11;
  const stirrupBarNo = r10?.barNo ?? p.stirrupBarNo;
  const stirrupDia = r10?.diaIn ?? stirrupBarNo / 8;
  const stirrupSpacingEndIn = r10?.spacingIn ?? p.stirrupSpacingEndIn;
  const stirrupSpacingMidIn = r11?.spacingIn ?? p.stirrupSpacingMidIn;

  // Coordinate origin:
  // x = 0 at left clear face of support column
  // x = clearSpanIn at right clear face of support column
  // y = 0 at beam bottom soffit, y = beamDepthIn at beam top
  // z = 0 at beam center-line (-beamWidthIn/2 to +beamWidthIn/2)

  // 1. Solids
  const solids: Solid3D[] = [];

  // Left support column
  solids.push({
    id: 'beam-support-left',
    label: 'Support Column',
    material: 'column_support',
    min: [-colWidthIn, -18, -beamWidthIn / 2 - 2],
    max: [0, beamDepthIn, beamWidthIn / 2 + 2],
  });

  // Main beam span
  solids.push({
    id: 'beam-span',
    label: component.name,
    material: 'concrete',
    min: [0, 0, -beamWidthIn / 2],
    max: [clearSpanIn, beamDepthIn, beamWidthIn / 2],
  });

  // Right support column
  solids.push({
    id: 'beam-support-right',
    label: 'Support Column',
    material: 'column_support',
    min: [clearSpanIn, -18, -beamWidthIn / 2 - 2],
    max: [clearSpanIn + colWidthIn, beamDepthIn, beamWidthIn / 2 + 2],
  });

  // 2. Bars
  const bars: BarPath3D[] = [];
  const hookLengthIn = 12; // 12 in hook typical

  // Effective beam longitudinal extent inside support columns
  const endAllowanceIn = p.endAllowanceIn; // 3 in
  const leftEmbedX = -colWidthIn + endAllowanceIn;
  const rightEmbedX = clearSpanIn + colWidthIn - endAllowanceIn;

  // Lateral z-spacing inside stirrup
  const stirrupInnerWidth = beamWidthIn - totalCoverDeductionIn - 2 * stirrupDia;
  const innerLeftZ = -stirrupInnerWidth / 2;
  const innerRightZ = stirrupInnerWidth / 2;

  // R7 – Bottom longitudinal U-bars (2 bars)
  const bottomBarY = coverIn + stirrupDia + bottomDia / 2;
  const bottomHookTopY = bottomBarY + hookLengthIn;

  // 2 bars placed near corners inside stirrups
  const r7ZCoords = bottomCount === 2 ? [innerLeftZ, innerRightZ] : [-innerLeftZ / 2, innerLeftZ / 2];
  r7ZCoords.forEach((zPos, idx) => {
    bars.push({
      rowId: 'R7',
      markId: `beam-bot-${idx}`,
      diaIn: bottomDia,
      kind: 'bottom',
      points: [
        [leftEmbedX, bottomHookTopY, zPos],
        [leftEmbedX, bottomBarY, zPos],
        [rightEmbedX, bottomBarY, zPos],
        [rightEmbedX, bottomHookTopY, zPos],
      ],
    });
  });

  // R8 – Extra Bottom Bars (straight bars between column faces)
  // Evenly spaced in the same bottom layer between R7 bars
  const totalBottomBars = bottomCount + extraBottomCount;
  const bottomZStep = totalBottomBars > 1 ? (innerRightZ - innerLeftZ) / (totalBottomBars - 1) : 0;

  // Extra bars occupy the intermediate positions
  for (let eb = 0; eb < extraBottomCount; eb++) {
    const zPos = innerLeftZ + (eb + 1) * bottomZStep;
    bars.push({
      rowId: 'R8',
      markId: `beam-extra-bot-${eb}`,
      diaIn: extraBottomDia,
      kind: 'extra',
      points: [
        [0, bottomBarY, zPos],
        [clearSpanIn, bottomBarY, zPos],
      ],
    });
  }

  // R9 – Top longitudinal U-bars (2 bars)
  const topBarY = beamDepthIn - coverIn - stirrupDia - topDia / 2;
  const topHookBottomY = topBarY - hookLengthIn;

  const r9ZCoords = topCount === 2 ? [innerLeftZ, innerRightZ] : [-innerLeftZ / 2, innerLeftZ / 2];
  r9ZCoords.forEach((zPos, idx) => {
    bars.push({
      rowId: 'R9',
      markId: `beam-top-${idx}`,
      diaIn: topDia,
      kind: 'top',
      points: [
        [leftEmbedX, topHookBottomY, zPos],
        [leftEmbedX, topBarY, zPos],
        [rightEmbedX, topBarY, zPos],
        [rightEmbedX, topHookBottomY, zPos],
      ],
    });
  });

  // R10 & R11 Stirrups Splitting Rule:
  // End-zone count (R10, count 15) split as evenly as possible:
  // extra bar on left if odd -> 8 left, 7 right
  const leftStirrupCount = Math.ceil(stirrupEndCount / 2); // 8
  const rightStirrupCount = Math.floor(stirrupEndCount / 2); // 7

  const stirrupLoop = (xPos: number): [number, number, number][] => {
    const minZ = -beamWidthIn / 2 + coverIn;
    const maxZ = beamWidthIn / 2 - coverIn;
    const minY = coverIn;
    const maxY = beamDepthIn - coverIn;
    return [
      [xPos, minY, minZ],
      [xPos, maxY, minZ],
      [xPos, maxY, maxZ],
      [xPos, minY, maxZ],
      [xPos, minY, minZ],
    ];
  };

  // Left end zone stirrups: first at cover offset from beam face (0), then at row spacing
  const firstStirrupOffsetIn = coverIn + 1.5; // ~2.25 in
  for (let ls = 0; ls < leftStirrupCount; ls++) {
    const xPos = firstStirrupOffsetIn + ls * stirrupSpacingEndIn;
    bars.push({
      rowId: 'R10',
      markId: `beam-stirrup-left-${ls}`,
      diaIn: stirrupDia,
      kind: 'stirrup',
      points: stirrupLoop(xPos),
    });
  }

  // Right end zone stirrups: starting at cover offset from right beam face (clearSpanIn) backwards
  for (let rs = 0; rs < rightStirrupCount; rs++) {
    const xPos = clearSpanIn - firstStirrupOffsetIn - rs * stirrupSpacingEndIn;
    bars.push({
      rowId: 'R10',
      markId: `beam-stirrup-right-${rs}`,
      diaIn: stirrupDia,
      kind: 'stirrup',
      points: stirrupLoop(xPos),
    });
  }

  // Middle stirrups (R11, count 11): centered in span at middle row spacing (9" c/c)
  const midSpanX = clearSpanIn / 2;
  const midTotalSpan = (stirrupMidCount - 1) * stirrupSpacingMidIn;
  const midStartX = midSpanX - midTotalSpan / 2;

  for (let ms = 0; ms < stirrupMidCount; ms++) {
    const xPos = midStartX + ms * stirrupSpacingMidIn;
    bars.push({
      rowId: 'R11',
      markId: `beam-stirrup-mid-${ms}`,
      diaIn: stirrupDia,
      kind: 'stirrup',
      points: stirrupLoop(xPos),
    });
  }

  // 3. Annotations & Notes
  const notes: string[] = [];

  // Check clear spacing between bottom bars in 1 layer
  if (totalBottomBars > 1) {
    const clearSpaceIn = (stirrupInnerWidth - totalBottomBars * Math.max(bottomDia, extraBottomDia)) / (totalBottomBars - 1);
    const minRequired = Math.max(bottomDia, 1.0);
    if (clearSpaceIn < minRequired) {
      notes.push(
        `Clear bar spacing between bottom bars is ${clearSpaceIn.toFixed(2)} in, which is below standard minimum of ${minRequired.toFixed(2)} in.`,
      );
    }
  }

  const dimensions: LinearDimension3D[] = [];
  const leaders: LeaderAnnotation3D[] = [];
  const sectionMarkers: SectionMarker3D[] = [];

  // Top dimension line: Left column, Clear span, Right column, Overall span
  // Offset 22 in for first level, 32 in for overall
  dimensions.push({
    id: 'dim-left-col',
    p1: [-colWidthIn, beamDepthIn, 0],
    p2: [0, beamDepthIn, 0],
    text: fmtDimInches(colWidthIn),
    offsetIn: 22,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-clear-span',
    p1: [0, beamDepthIn, 0],
    p2: [clearSpanIn, beamDepthIn, 0],
    text: fmtDimInches(clearSpanIn),
    offsetIn: 22,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-right-col',
    p1: [clearSpanIn, beamDepthIn, 0],
    p2: [clearSpanIn + colWidthIn, beamDepthIn, 0],
    text: fmtDimInches(colWidthIn),
    offsetIn: 22,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-overall-span',
    p1: [-colWidthIn, beamDepthIn, 0],
    p2: [clearSpanIn + colWidthIn, beamDepthIn, 0],
    text: fmtDimInches(clearSpanIn + 2 * colWidthIn),
    offsetIn: 32,
    axis: 'x',
  });

  // Stirrup zone dimension lines under beam soffit matching Text_Book_Style_Drawing.pdf
  const lOver4In = clearSpanIn / 4;
  dimensions.push({
    id: 'dim-zone-left',
    p1: [0, 0, 0],
    p2: [lOver4In, 0, 0],
    text: `${fmtBarDia(stirrupBarNo)}"Ø@${stirrupSpacingEndIn}"C/C`,
    offsetIn: -10,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-zone-mid',
    p1: [lOver4In, 0, 0],
    p2: [clearSpanIn - lOver4In, 0, 0],
    text: `${fmtBarDia(stirrupBarNo)}"Ø@${stirrupSpacingMidIn}"C/C`,
    offsetIn: -10,
    axis: 'x',
  });

  dimensions.push({
    id: 'dim-zone-right',
    p1: [clearSpanIn - lOver4In, 0, 0],
    p2: [clearSpanIn, 0, 0],
    text: `${fmtBarDia(stirrupBarNo)}"Ø@${stirrupSpacingEndIn}"C/C`,
    offsetIn: -10,
    axis: 'x',
  });

  // Left hook dimension (12" TYP.)
  dimensions.push({
    id: 'dim-left-hook',
    p1: [leftEmbedX - 8, bottomBarY, 0],
    p2: [leftEmbedX - 8, bottomHookTopY, 0],
    text: '12"',
    subText: '(TYP.)',
    offsetIn: -6,
    axis: 'y',
  });

  // Dimensions for Section A-A: Beam width (8") and Beam depth (24")
  dimensions.push({
    id: 'dim-beam-width',
    p1: [0, 0, -beamWidthIn / 2],
    p2: [0, 0, beamWidthIn / 2],
    text: fmtDimInches(beamWidthIn),
    offsetIn: -6,
    axis: 'z',
  });

  dimensions.push({
    id: 'dim-beam-depth',
    p1: [0, 0, -beamWidthIn / 2],
    p2: [0, beamDepthIn, -beamWidthIn / 2],
    text: fmtDimInches(beamDepthIn),
    offsetIn: -6,
    axis: 'y',
  });

  // Stirrup zone leaders
  leaders.push({
    id: 'lead-stirrup-left',
    rowId: 'R10',
    target: [clearSpanIn * 0.12, 12, 0],
    text: fmtCalloutWithSpacing(stirrupBarNo, stirrupSpacingEndIn),
    preferredSide: 'left',
  });

  leaders.push({
    id: 'lead-stirrup-mid',
    rowId: 'R11',
    target: [clearSpanIn * 0.50, 6, 0],
    text: fmtCalloutWithSpacing(stirrupBarNo, stirrupSpacingMidIn),
    preferredSide: 'bottom',
  });

  leaders.push({
    id: 'lead-stirrup-right',
    rowId: 'R10',
    target: [clearSpanIn * 0.88, 12, 0],
    text: fmtCalloutWithSpacing(stirrupBarNo, stirrupSpacingEndIn),
    preferredSide: 'right',
  });

  // Longitudinal Leaders
  leaders.push({
    id: 'lead-top-bars',
    rowId: 'R9',
    target: [clearSpanIn * 0.70, topBarY, 0],
    text: fmtCalloutWithCount(topCount, topBarNo),
    preferredSide: 'top',
  });

  leaders.push({
    id: 'lead-bot-bars',
    rowId: 'R7',
    target: [clearSpanIn * 0.78, bottomBarY, 0],
    text: fmtCalloutWithCount(bottomCount, bottomBarNo),
    preferredSide: 'bottom',
  });

  leaders.push({
    id: 'lead-extra-bot',
    rowId: 'R8',
    target: [clearSpanIn * 0.32, bottomBarY, 0],
    text: fmtCalloutWithCount(extraBottomCount, extraBottomBarNo),
    preferredSide: 'bottom',
  });

  // Section cut marker A-A pointing left (shifted clear of 15'-6" center dimension text)
  sectionMarkers.push({
    id: 'sec-marker-A',
    p: [clearSpanIn * 0.35, beamDepthIn * 0.45, 0],
    label: 'A',
    direction: 'left',
  });

  return {
    solids,
    bars,
    dimensions,
    levelMarks: [],
    leaders,
    sectionMarkers,
    title: 'BEAM ELEVATION',
    subTitle: `(${beamWidthIn}"x${beamDepthIn}")`,
    notes,
  };
}
