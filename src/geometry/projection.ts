import {
  Scene3D,
  View2D,
  Polygon2D,
  Line2D,
  Circle2D,
  Dimension2D,
  LevelMark2D,
  Leader2D,
  SectionMarker2D,
  Point2D,
  DrawingStyle,
} from './types';

export type ViewType =
  | 'footing-section'
  | 'footing-plan'
  | 'column-section'
  | 'column-elevation'
  | 'beam-elevation'
  | 'beam-section'
  | 'site';

/**
 * Projects a 3D scene into a 2D View specification based on the requested view type.
 * Follows standard engineering drafting conventions:
 * - Orthographic projection or section cut
 * - Bars crossing the cut plane are circles; bars lying in the plane are lines
 * - Bounding box calculated with margin for annotations
 */
export function projectScene(
  scene: Scene3D,
  viewType: ViewType,
  drawingStyle: DrawingStyle = 'textbook',
): View2D {
  const polygons: Polygon2D[] = [];
  const lines: Line2D[] = [];
  const circles: Circle2D[] = [];
  const dimensions: Dimension2D[] = [];
  const levelMarks: LevelMark2D[] = [];
  const leaders: Leader2D[] = [];
  const sectionMarkers: SectionMarker2D[] = [];
  const notes: string[] = [...scene.notes];

  let title = scene.title;
  const subTitle = scene.subTitle;

  switch (viewType) {
    case 'footing-section': {
      title = 'Column Footing Section';
      // Axis mapping: u = x (along length), v = y (vertical elevation)
      // Solids:
      for (const s of scene.solids) {
        if (s.material === 'concrete' || s.material === 'lean_concrete' || s.material === 'earth') {
          polygons.push({
            id: s.id,
            material: s.material,
            points: [
              [s.min[0], s.min[1]],
              [s.max[0], s.min[1]],
              [s.max[0], s.max[1]],
              [s.min[0], s.max[1]],
            ],
          });
        }
      }

      // Main bars (R1): run along x. Representative U-profile line
      const r1Bars = scene.bars.filter((b) => b.rowId === 'R1');
      if (r1Bars.length > 0) {
        const rep = r1Bars[0];
        lines.push({
          id: 'proj-R1',
          rowId: 'R1',
          markId: rep.markId,
          diaIn: rep.diaIn,
          kind: rep.kind,
          points: rep.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      // Dist bars (R2): run along z, spaced along x. Each bar intersects section as a circle
      const r2Bars = scene.bars.filter((b) => b.rowId === 'R2');
      for (const b of r2Bars) {
        // Find x coordinate from first point, and bottom y from horizontal segment
        const cx = b.points[0][0];
        const cy = b.points[1][1];
        circles.push({
          id: `proj-${b.markId}`,
          rowId: 'R2',
          markId: b.markId,
          center: [cx, cy],
          radiusIn: b.diaIn / 2,
          kind: b.kind,
        });
      }

      // Column dowels (R3 if linked)
      const r3Bars = scene.bars.filter((b) => b.rowId === 'R3');
      for (const b of r3Bars) {
        lines.push({
          id: `proj-${b.markId}`,
          rowId: 'R3',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: b.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      // Column ties (R4 if linked)
      const r4Bars = scene.bars.filter((b) => b.rowId === 'R4');
      for (const b of r4Bars) {
        // Horizontal line across column width
        const minX = Math.min(...b.points.map((p) => p[0]));
        const maxX = Math.max(...b.points.map((p) => p[0]));
        const y = b.points[0][1];
        lines.push({
          id: `proj-${b.markId}`,
          rowId: 'R4',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: [
            [minX, y],
            [maxX, y],
          ],
        });
      }

      // Dimensions: along x and y
      for (const d of scene.dimensions) {
        if (d.axis === 'x' || d.axis === 'y' || d.axis === 'z') {
          // If axis is z (footing width B), map to horizontal dimension for section
          if (d.axis === 'z' || d.axis === 'x') {
            const p1u = d.axis === 'z' ? d.p1[2] : d.p1[0];
            const p2u = d.axis === 'z' ? d.p2[2] : d.p2[0];
            // Add horizontal width dimensions for section
            if (
              d.id === 'dim-B' ||
              d.id === 'dim-lean-proj-left' ||
              d.id === 'dim-lean-proj-right' ||
              d.id === 'dim-lean-total' ||
              d.id === 'dim-col-width'
            ) {
              dimensions.push({
                id: d.id,
                p1: [p1u, d.p1[1]],
                p2: [p2u, d.p2[1]],
                text: d.text,
                subText: d.subText,
                offset: d.offsetIn,
                orientation: 'horizontal',
              });
            }
          } else if (d.axis === 'y') {
            dimensions.push({
              id: d.id,
              p1: [d.p1[0], d.p1[1]],
              p2: [d.p2[0], d.p2[1]],
              text: d.text,
              subText: d.subText,
              offset: d.offsetIn,
              orientation: 'vertical',
            });
          }
        }
      }

      // Level marks
      for (const lm of scene.levelMarks) {
        levelMarks.push({
          id: lm.id,
          y: lm.p[1],
          x: lm.p[0],
          text: lm.text,
          label: lm.label,
          hasEarthHatch: lm.hasEarthHatch,
        });
      }

      // Leaders: map target to (x, y)
      for (const l of scene.leaders) {
        leaders.push({
          id: l.id,
          rowId: l.rowId,
          target: [l.target[0], l.target[1]],
          text: l.text,
          direction: l.preferredSide || 'right',
        });
      }

      break;
    }

    case 'footing-plan': {
      title = 'Column Footing Plan';
      // Axis mapping: u = x (length), v = z (width)
      for (const s of scene.solids) {
        if (s.material === 'concrete' || s.material === 'lean_concrete') {
          polygons.push({
            id: `plan-${s.id}`,
            material: s.material,
            points: [
              [s.min[0], s.min[2]],
              [s.max[0], s.min[2]],
              [s.max[0], s.max[2]],
              [s.min[0], s.max[2]],
            ],
          });
        }
      }

      // Main bars (R1): horizontal lines along x at each z
      const r1Bars = scene.bars.filter((b) => b.rowId === 'R1');
      const midMainIdx = Math.floor(r1Bars.length / 2);
      const r1ToDraw = drawingStyle === 'textbook' ? (r1Bars.length > 0 ? [r1Bars[midMainIdx]] : []) : r1Bars;
      for (const b of r1ToDraw) {
        const z = b.points[0][2];
        const minX = b.points[1][0];
        const maxX = b.points[2][0];
        lines.push({
          id: `proj-plan-${b.markId}`,
          rowId: 'R1',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: [
            [minX, z],
            [maxX, z],
          ],
        });
      }

      // Dist bars (R2): vertical lines along z at each x
      const r2Bars = scene.bars.filter((b) => b.rowId === 'R2');
      const midDistIdx = Math.floor(r2Bars.length / 2);
      const r2ToDraw = drawingStyle === 'textbook' ? (r2Bars.length > 0 ? [r2Bars[midDistIdx]] : []) : r2Bars;
      for (const b of r2ToDraw) {
        const x = b.points[0][0];
        const minZ = b.points[1][2];
        const maxZ = b.points[2][2];
        lines.push({
          id: `proj-plan-${b.markId}`,
          rowId: 'R2',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: [
            [x, minZ],
            [x, maxZ],
          ],
        });
      }

      // Column dowels (R3 if linked) -> circles in plan
      const r3Bars = scene.bars.filter((b) => b.rowId === 'R3');
      for (const b of r3Bars) {
        // Second point is the vertical dowel shaft coordinate (x, z)
        const pt = b.points[1];
        circles.push({
          id: `proj-plan-${b.markId}`,
          rowId: 'R3',
          markId: b.markId,
          center: [pt[0], pt[2]],
          radiusIn: b.diaIn / 2,
          kind: b.kind,
        });
      }

      // Dimensions in plan: dim-L (along x) and dim-B (along z)
      // Must sit completely outside the plan and outside all reinforcement bars
      const footingPad = scene.solids.find((s) => s.id === 'footing-solid' || s.id === 'footing-pad');
      const leanSolid = scene.solids.find((s) => s.id === 'lean-concrete-solid' || s.id === 'footing-lean');
      const bottomZ = leanSolid ? leanSolid.min[2] : (footingPad ? footingPad.min[2] : -24);
      const leftX = leanSolid ? leanSolid.min[0] : (footingPad ? footingPad.min[0] : -24);

      const dimL = scene.dimensions.find((d) => d.id === 'dim-L');
      if (dimL && footingPad) {
        dimensions.push({
          id: 'plan-dim-L',
          p1: [footingPad.min[0], bottomZ],
          p2: [footingPad.max[0], bottomZ],
          text: dimL.text,
          offset: -8,
          orientation: 'horizontal',
        });
      }

      const dimB = scene.dimensions.find((d) => d.id === 'dim-B');
      if (dimB && footingPad) {
        dimensions.push({
          id: 'plan-dim-B',
          p1: [leftX, footingPad.min[2]],
          p2: [leftX, footingPad.max[2]],
          text: dimB.text,
          offset: -8,
          orientation: 'vertical',
        });
      }

      // Leaders for Main and Dist
      const leadMain = scene.leaders.find((l) => l.rowId === 'R1');
      if (leadMain) {
        const zMid = r1Bars[midMainIdx]?.points[0][2] ?? 0;
        leaders.push({
          id: 'plan-lead-main',
          rowId: 'R1',
          target: [0, zMid],
          text: leadMain.text,
          direction: 'right',
        });
      }

      const leadDist = scene.leaders.find((l) => l.rowId === 'R2');
      if (leadDist) {
        const xMid = r2Bars[midDistIdx]?.points[0][0] ?? 0;
        leaders.push({
          id: 'plan-lead-dist',
          rowId: 'R2',
          target: [xMid, 0],
          text: leadDist.text,
          direction: 'top',
        });
      }

      break;
    }

    case 'column-section': {
      title = 'Column Cross Section';
      // Axis mapping: u = x (width), v = z (depth)
      const colSolid = scene.solids.find((s) => s.id === 'column-shaft');
      if (colSolid) {
        polygons.push({
          id: 'proj-col-section',
          material: 'concrete',
          points: [
            [colSolid.min[0], colSolid.min[2]],
            [colSolid.max[0], colSolid.min[2]],
            [colSolid.max[0], colSolid.max[2]],
            [colSolid.min[0], colSolid.max[2]],
          ],
        });
      }

      // Tie loop (R4 or R6): representative closed rectangle
      const tieBar = scene.bars.find((b) => b.kind === 'tie');
      if (tieBar) {
        lines.push({
          id: 'proj-tie-loop',
          rowId: tieBar.rowId,
          markId: tieBar.markId,
          diaIn: tieBar.diaIn,
          kind: 'tie',
          points: tieBar.points.map((p) => [p[0], p[2]] as Point2D),
        });
      }

      // Dowels (R3 / R5): 8 circles at (x, z)
      // Pick dowels below or above plinth
      const dowelBars = scene.bars.filter((b) => b.rowId === 'R3');
      for (const d of dowelBars) {
        const pt = d.points[1];
        circles.push({
          id: `proj-sec-${d.markId}`,
          rowId: d.rowId,
          markId: d.markId,
          center: [pt[0], pt[2]],
          radiusIn: d.diaIn / 2,
          kind: 'dowel',
        });
      }

      // Dimensions: Width & Depth
      for (const dim of scene.dimensions) {
        if (dim.id === 'dim-col-width') {
          dimensions.push({
            id: 'sec-dim-width',
            p1: [dim.p1[0], dim.p1[2]],
            p2: [dim.p2[0], dim.p2[2]],
            text: dim.text,
            offset: -8,
            orientation: 'horizontal',
          });
        } else if (dim.id === 'dim-col-depth') {
          dimensions.push({
            id: 'sec-dim-depth',
            p1: [dim.p1[0], dim.p1[2]],
            p2: [dim.p2[0], dim.p2[2]],
            text: dim.text,
            offset: -8,
            orientation: 'vertical',
          });
        }
      }

      // Leaders: dowels & ties
      const leadDowels = scene.leaders.find((l) => l.rowId === 'R3' || l.rowId === 'R5');
      if (leadDowels) {
        leaders.push({
          id: 'sec-lead-dowels',
          rowId: leadDowels.rowId,
          target: [4.5, 7.5],
          text: leadDowels.text,
          direction: 'right',
        });
      }

      const leadTies = scene.leaders.find((l) => l.rowId === 'R4' || l.rowId === 'R6');
      if (leadTies) {
        leaders.push({
          id: 'sec-lead-ties',
          rowId: leadTies.rowId,
          target: [-4.5, -5.5],
          text: leadTies.text,
          direction: 'left',
        });
      }

      break;
    }

    case 'column-elevation': {
      title = 'Column Elevation';
      // Axis mapping: u = x (width), v = y (vertical height)
      for (const s of scene.solids) {
        if (s.material === 'concrete' || s.material === 'earth') {
          polygons.push({
            id: `elev-${s.id}`,
            material: s.material,
            points: [
              [s.min[0], s.min[1]],
              [s.max[0], s.min[1]],
              [s.max[0], s.max[1]],
              [s.min[0], s.max[1]],
            ],
          });
        }
      }

      // Dowels below plinth (R3): vertical lines
      const r3Bars = scene.bars.filter((b) => b.rowId === 'R3');
      for (const b of r3Bars) {
        lines.push({
          id: `elev-${b.markId}`,
          rowId: 'R3',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: b.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      // Dowels above plinth (R5): vertical lines
      const r5Bars = scene.bars.filter((b) => b.rowId === 'R5');
      for (const b of r5Bars) {
        lines.push({
          id: `elev-${b.markId}`,
          rowId: 'R5',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: b.kind,
          points: b.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      // Ties below plinth (R4): closed rectangular loops
      const r4Bars = scene.bars.filter((b) => b.rowId === 'R4');
      const r4ToDraw = drawingStyle === 'textbook' ? (r4Bars.length > 0 ? [r4Bars[0]] : []) : r4Bars;
      for (const b of r4ToDraw) {
        const minX = Math.min(...b.points.map((p) => p[0]));
        const maxX = Math.max(...b.points.map((p) => p[0]));
        const y = b.points[0][1];
        const inward = 0.25;
        const leftX = minX + inward;
        const rightX = maxX - inward;
        const tieH = Math.max(b.diaIn, 1.0);
        lines.push({
          id: `elev-${b.markId}`,
          rowId: 'R4',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: 'tie',
          points: [
            [leftX, y - tieH / 2],
            [rightX, y - tieH / 2],
            [rightX, y + tieH / 2],
            [leftX, y + tieH / 2],
            [leftX, y - tieH / 2],
          ],
        });
      }

      // Ties above plinth (R6): closed rectangular loops
      const r6Bars = scene.bars.filter((b) => b.rowId === 'R6');
      const r6ToDraw = drawingStyle === 'textbook' ? (r6Bars.length > 0 ? [r6Bars[0]] : []) : r6Bars;
      for (const b of r6ToDraw) {
        const minX = Math.min(...b.points.map((p) => p[0]));
        const maxX = Math.max(...b.points.map((p) => p[0]));
        const y = b.points[0][1];
        const inward = 0.25;
        const leftX = minX + inward;
        const rightX = maxX - inward;
        const tieH = Math.max(b.diaIn, 1.0);
        lines.push({
          id: `elev-${b.markId}`,
          rowId: 'R6',
          markId: b.markId,
          diaIn: b.diaIn,
          kind: 'tie',
          points: [
            [leftX, y - tieH / 2],
            [rightX, y - tieH / 2],
            [rightX, y + tieH / 2],
            [leftX, y + tieH / 2],
            [leftX, y - tieH / 2],
          ],
        });
      }

      // Dimensions along y
      for (const dim of scene.dimensions) {
        if (dim.axis === 'y') {
          dimensions.push({
            id: `elev-${dim.id}`,
            p1: [dim.p1[0], dim.p1[1]],
            p2: [dim.p2[0], dim.p2[1]],
            text: dim.text,
            subText: dim.subText,
            offset: dim.offsetIn,
            orientation: 'vertical',
          });
        }
      }

      // Level marks
      for (const lm of scene.levelMarks) {
        levelMarks.push({
          id: `elev-${lm.id}`,
          y: lm.p[1],
          x: lm.p[0],
          text: lm.text,
          label: lm.label,
          hasEarthHatch: lm.hasEarthHatch,
        });
      }

      // Leaders: Dowels, Ties below, Ties above
      for (const l of scene.leaders) {
        leaders.push({
          id: `elev-${l.id}`,
          rowId: l.rowId,
          target: [l.target[0], l.target[1]],
          text: l.text,
          direction: l.preferredSide || 'right',
        });
      }

      break;
    }

    case 'beam-elevation': {
      title = 'Beam Longitudinal Elevation';
      // Axis mapping: u = x (length), v = y (vertical depth)
      for (const s of scene.solids) {
        polygons.push({
          id: `elev-${s.id}`,
          material: s.material,
          points: [
            [s.min[0], s.min[1]],
            [s.max[0], s.min[1]],
            [s.max[0], s.max[1]],
            [s.min[0], s.max[1]],
          ],
        });
      }

      // Longitudinal bars: Top (R9), Bottom (R7), Extra (R8)
      // Since bars are at multiple z positions, take representative lines
      const topBars = scene.bars.filter((b) => b.rowId === 'R9');
      if (topBars.length > 0) {
        const rep = topBars[0];
        lines.push({
          id: 'elev-R9',
          rowId: 'R9',
          markId: rep.markId,
          diaIn: rep.diaIn,
          kind: 'top',
          points: rep.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      const botBars = scene.bars.filter((b) => b.rowId === 'R7');
      if (botBars.length > 0) {
        const rep = botBars[0];
        lines.push({
          id: 'elev-R7',
          rowId: 'R7',
          markId: rep.markId,
          diaIn: rep.diaIn,
          kind: 'bottom',
          points: rep.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      const extraBars = scene.bars.filter((b) => b.rowId === 'R8');
      if (extraBars.length > 0) {
        const rep = extraBars[0];
        lines.push({
          id: 'elev-R8',
          rowId: 'R8',
          markId: rep.markId,
          diaIn: rep.diaIn,
          kind: 'extra',
          points: rep.points.map((p) => [p[0], p[1]] as Point2D),
        });
      }

      // Stirrups (R10 end, R11 mid): vertical lines
      const stirrupBars = scene.bars.filter((b) => b.kind === 'stirrup');
      let stirrupsToDraw = stirrupBars;
      if (drawingStyle === 'textbook') {
        const leftEnd = stirrupBars.find((s) => s.markId.includes('left'));
        const mid = stirrupBars.find((s) => s.markId.includes('mid'));
        const rightEnd = stirrupBars.find((s) => s.markId.includes('right'));
        stirrupsToDraw = [leftEnd, mid, rightEnd].filter((s): s is NonNullable<typeof s> => Boolean(s));
      }
      for (const s of stirrupsToDraw) {
        const x = s.points[0][0];
        const minY = Math.min(...s.points.map((p) => p[1]));
        const maxY = Math.max(...s.points.map((p) => p[1]));
        lines.push({
          id: `elev-${s.markId}`,
          rowId: s.rowId,
          markId: s.markId,
          diaIn: s.diaIn,
          kind: 'stirrup',
          points: [
            [x, minY],
            [x, maxY],
          ],
        });
      }

      // Dimensions along x and y
      for (const dim of scene.dimensions) {
        if (dim.axis === 'x') {
          dimensions.push({
            id: `elev-${dim.id}`,
            p1: [dim.p1[0], dim.p1[1]],
            p2: [dim.p2[0], dim.p2[1]],
            text: dim.text,
            subText: dim.subText,
            offset: dim.offsetIn,
            orientation: 'horizontal',
          });
        } else if (dim.axis === 'y') {
          dimensions.push({
            id: `elev-${dim.id}`,
            p1: [dim.p1[0], dim.p1[1]],
            p2: [dim.p2[0], dim.p2[1]],
            text: dim.text,
            subText: dim.subText,
            offset: dim.offsetIn,
            orientation: 'vertical',
          });
        }
      }

      // Leaders: Top, Bottom, Extra, Stirrup Ends, Stirrup Mid
      for (const l of scene.leaders) {
        leaders.push({
          id: `elev-${l.id}`,
          rowId: l.rowId,
          target: [l.target[0], l.target[1]],
          text: l.text,
          direction: l.preferredSide || 'top',
        });
      }

      // Section markers
      for (const sm of scene.sectionMarkers) {
        sectionMarkers.push({
          id: `elev-${sm.id}`,
          p: [sm.p[0], sm.p[1]],
          label: sm.label,
          direction: sm.direction,
        });
      }

      break;
    }

    case 'beam-section': {
      title = 'Beam Section A-A';
      // Axis mapping: u = z (beam width), v = y (beam depth)
      // Section cut at midspan
      const beamSolid = scene.solids.find((s) => s.id === 'beam-span');
      if (beamSolid) {
        polygons.push({
          id: 'proj-beam-section',
          material: 'concrete',
          points: [
            [beamSolid.min[2], beamSolid.min[1]],
            [beamSolid.max[2], beamSolid.min[1]],
            [beamSolid.max[2], beamSolid.max[1]],
            [beamSolid.min[2], beamSolid.max[1]],
          ],
        });
      }

      // Stirrup loop (R11 mid-span stirrup): closed rectangular loop in (z, y)
      const midStirrup = scene.bars.find((b) => b.rowId === 'R11');
      if (midStirrup) {
        lines.push({
          id: 'sec-stirrup-loop',
          rowId: 'R11',
          markId: midStirrup.markId,
          diaIn: midStirrup.diaIn,
          kind: 'stirrup',
          points: midStirrup.points.map((p) => [p[2], p[1]] as Point2D),
        });
      }

      // Top longitudinal bars (R9) crossing cut plane: 2 circles
      const topBars = scene.bars.filter((b) => b.rowId === 'R9');
      for (const b of topBars) {
        const cz = b.points[0][2];
        const cy = b.points[0][1];
        circles.push({
          id: `sec-${b.markId}`,
          rowId: 'R9',
          markId: b.markId,
          center: [cz, cy],
          radiusIn: b.diaIn / 2,
          kind: 'top',
        });
      }

      // Bottom continuous bars (R7) crossing cut plane: 2 circles
      const botBars = scene.bars.filter((b) => b.rowId === 'R7');
      for (const b of botBars) {
        const cz = b.points[0][2];
        const cy = b.points[0][1];
        circles.push({
          id: `sec-${b.markId}`,
          rowId: 'R7',
          markId: b.markId,
          center: [cz, cy],
          radiusIn: b.diaIn / 2,
          kind: 'bottom',
        });
      }

      // Extra bottom bars (R8) crossing cut plane: 2 circles
      const extraBars = scene.bars.filter((b) => b.rowId === 'R8');
      for (const b of extraBars) {
        const cz = b.points[0][2];
        const cy = b.points[0][1];
        circles.push({
          id: `sec-${b.markId}`,
          rowId: 'R8',
          markId: b.markId,
          center: [cz, cy],
          radiusIn: b.diaIn / 2,
          kind: 'extra',
        });
      }

      // Dimensions: Beam Width & Beam Depth
      const dimW = scene.dimensions.find((d) => d.id === 'dim-beam-width');
      if (dimW) {
        dimensions.push({
          id: 'sec-dim-width',
          p1: [dimW.p1[2], dimW.p1[1]],
          p2: [dimW.p2[2], dimW.p2[1]],
          text: dimW.text,
          offset: -6,
          orientation: 'horizontal',
        });
      }

      const dimD = scene.dimensions.find((d) => d.id === 'dim-beam-depth');
      if (dimD) {
        dimensions.push({
          id: 'sec-dim-depth',
          p1: [dimD.p1[2], dimD.p1[1]],
          p2: [dimD.p2[2], dimD.p2[1]],
          text: dimD.text,
          offset: -6,
          orientation: 'vertical',
        });
      }

      // Leaders: Top bars, Bottom bars (cont + extra), Stirrup
      const topLead = scene.leaders.find((l) => l.rowId === 'R9');
      if (topLead) {
        leaders.push({
          id: 'sec-lead-top',
          rowId: 'R9',
          target: [2.5, 22.5],
          text: topLead.text,
          direction: 'right',
        });
      }

      const botLead = scene.leaders.find((l) => l.rowId === 'R7');
      if (botLead) {
        leaders.push({
          id: 'sec-lead-bot',
          rowId: 'R7',
          target: [2.5, 1.5],
          text: `${botBars.length + extraBars.length}-5/8"Ø\n(${botBars.length} CONT. + ${extraBars.length} EXTRA)`,
          direction: 'right',
        });
      }

      const stirrupLead = scene.leaders.find((l) => l.rowId === 'R10' || l.rowId === 'R11');
      if (stirrupLead) {
        leaders.push({
          id: 'sec-lead-stirrup',
          rowId: 'R11',
          target: [-3.25, 12],
          text: stirrupLead.text.split('@')[0], // just bar size e.g. "3/8\"Ø"
          direction: 'left',
        });
      }

      break;
    }

    case 'site': {
      title = `${scene.title} — Site Working Drawing`;
      // Solids:
      for (const s of scene.solids) {
        if (s.material === 'concrete' || s.material === 'lean_concrete' || s.material === 'earth') {
          polygons.push({
            id: `site-${s.id}`,
            material: s.material,
            points: [
              [s.min[0], s.min[1]],
              [s.max[0], s.min[1]],
              [s.max[0], s.max[1]],
              [s.min[0], s.max[1]],
            ],
          });
        }
      }

      // 1-rep bars per rowId
      const seenRowIds = new Set<string>();
      for (const b of scene.bars) {
        if (!seenRowIds.has(b.rowId)) {
          seenRowIds.add(b.rowId);
          lines.push({
            id: `site-${b.markId}`,
            rowId: b.rowId,
            markId: b.markId,
            diaIn: b.diaIn,
            kind: b.kind,
            points: b.points.map((p) => [p[0], p[1]] as Point2D),
          });
        }
      }

      // Dimensions
      for (const dim of scene.dimensions) {
        if (dim.axis === 'x' || dim.axis === 'y') {
          dimensions.push({
            id: `site-${dim.id}`,
            p1: [dim.p1[0], dim.p1[1]],
            p2: [dim.p2[0], dim.p2[1]],
            text: dim.text,
            subText: dim.subText,
            offset: dim.offsetIn,
            orientation: dim.axis === 'x' ? 'horizontal' : 'vertical',
          });
        }
      }

      // Level marks
      for (const lm of scene.levelMarks) {
        levelMarks.push({
          id: `site-${lm.id}`,
          y: lm.p[1],
          x: lm.p[0],
          text: lm.text,
          label: lm.label,
          hasEarthHatch: lm.hasEarthHatch,
        });
      }

      // Leaders: bar mark tags [N] #barNo (description)
      let tagNo = 1;
      for (const l of lines) {
        const midIdx = Math.floor(l.points.length / 2);
        leaders.push({
          id: `site-lead-${l.rowId}`,
          rowId: l.rowId,
          target: l.points[midIdx] || l.points[0],
          text: `[${tagNo++}] #${Math.round(l.diaIn * 8)} (${l.kind})`,
          direction: 'right',
        });
      }

      // Section markers
      for (const sm of scene.sectionMarkers) {
        sectionMarkers.push({
          id: `site-${sm.id}`,
          p: [sm.p[0], sm.p[1]],
          label: sm.label,
          direction: sm.direction,
        });
      }

      break;
    }
  }

  // Calculate tight bounding box covering all geometry
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  function updateBounds(u: number, v: number) {
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  for (const p of polygons) {
    for (const pt of p.points) {
      updateBounds(pt[0], pt[1]);
    }
  }

  for (const l of lines) {
    for (const pt of l.points) {
      updateBounds(pt[0], pt[1]);
    }
  }

  for (const c of circles) {
    updateBounds(c.center[0] - c.radiusIn, c.center[1] - c.radiusIn);
    updateBounds(c.center[0] + c.radiusIn, c.center[1] + c.radiusIn);
  }

  for (const d of dimensions) {
    updateBounds(d.p1[0], d.p1[1]);
    updateBounds(d.p2[0], d.p2[1]);
    if (d.orientation === 'horizontal') {
      updateBounds(d.p1[0], d.p1[1] + d.offset);
      updateBounds(d.p2[0], d.p2[1] + d.offset);
    } else {
      updateBounds(d.p1[0] + d.offset, d.p1[1]);
      updateBounds(d.p2[0] + d.offset, d.p2[1]);
    }
  }

  const rawSpan = Math.max(maxU - minU, maxV - minV, 20);
  const H_est = Math.max(0.4, 0.023 * rawSpan);

  for (const lm of levelMarks) {
    const textLen = lm.text.length + lm.label.length;
    const wEst = Math.max(8 * H_est, textLen * 0.65 * H_est);
    updateBounds(lm.x - wEst, lm.y - 2 * H_est);
    updateBounds(lm.x + 3 * H_est, lm.y + 2 * H_est);
  }

  for (const lead of leaders) {
    const lines = lead.text.split('\n');
    const maxLineLen = Math.max(...lines.map((l) => l.length));
    const textWidth = Math.max(5 * H_est, maxLineLen * 0.7 * H_est);
    const totalH = lines.length * 1.5 * H_est;
    const isRight = lead.direction !== 'left';
    const endX = lead.target[0] + (isRight ? 2.5 * H_est + textWidth : -2.5 * H_est - textWidth);
    updateBounds(lead.target[0], lead.target[1]);
    updateBounds(endX, lead.target[1] + totalH);
    updateBounds(endX, lead.target[1] - totalH);
  }

  for (const sm of sectionMarkers) {
    updateBounds(sm.p[0] - 2 * H_est, sm.p[1] - 5 * H_est);
    updateBounds(sm.p[0] + 2 * H_est, sm.p[1] + 5 * H_est);
  }

  // Safety fallback if scene empty
  if (minU === Infinity) {
    minU = -50;
    maxU = 50;
    minV = -50;
    maxV = 50;
  }

  // Fixed layout zones inside viewBox:
  // - Margin Left: level marks + left callouts
  // - Margin Right: right callouts
  // - Margin Top: top dimensions + section markers
  // - Margin Bottom: dedicated title zone (geometry never enters this zone)
  const widthSpan = maxU - minU;
  const heightSpan = maxV - minV;
  const ZONE_MARGIN_LEFT = Math.max(6, Math.max(widthSpan * 0.08, 6 * H_est));
  const ZONE_MARGIN_RIGHT = Math.max(8, Math.max(widthSpan * 0.10, 8 * H_est));
  const ZONE_MARGIN_TOP = Math.max(4, Math.max(heightSpan * 0.06, 4 * H_est));
  const ZONE_MARGIN_BOTTOM = Math.max(10, Math.max(heightSpan * 0.16, 9 * H_est));

  minU -= ZONE_MARGIN_LEFT;
  maxU += ZONE_MARGIN_RIGHT;
  minV -= ZONE_MARGIN_BOTTOM;
  maxV += ZONE_MARGIN_TOP;

  return {
    viewId: viewType,
    title,
    subTitle,
    siteView: viewType === 'site',
    bounds: {
      minU,
      maxU,
      minV,
      maxV,
      width: maxU - minU,
      height: maxV - minV,
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
