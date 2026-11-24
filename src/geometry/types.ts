// Pure TypeScript 3D Scene & 2D Projection Types for Engineering Drawings.
// Units: All 3D coordinates and dimensions are in decimal inches.
// Coordinate system:
//   x: along length (horizontal in elevation and plan)
//   y: vertical up (elevation and section)
//   z: across width (depth/thickness in plan and cross-section)

export type Point3D = [number, number, number]; // [x, y, z] in inches
export type Point2D = [number, number];         // [u, v] in inches (u: horizontal, v: vertical up)

export type MaterialTag = 'concrete' | 'lean_concrete' | 'earth' | 'column_support';

export interface Solid3D {
  id: string;
  label: string;
  material: MaterialTag;
  min: Point3D; // [minX, minY, minZ]
  max: Point3D; // [maxX, maxY, maxZ]
}

export type BarKind = 'main' | 'dist' | 'dowel' | 'tie' | 'top' | 'bottom' | 'extra' | 'stirrup';

export interface BarPath3D {
  rowId: string;
  markId: string;       // Unique ID per physical bar or mark (e.g. "R1-0", "R10-left-2")
  diaIn: number;        // Bar diameter in inches
  kind: BarKind;
  points: Point3D[];    // Polyline points in 3D space
}

export interface LinearDimension3D {
  id: string;
  p1: Point3D;
  p2: Point3D;
  text: string;
  offsetIn: number;     // Offset distance perpendicular to dimension axis
  axis: 'x' | 'y' | 'z';
  subText?: string;     // e.g. "(TYP.)"
}

export interface LevelMark3D {
  id: string;
  p: Point3D;           // Position of the level mark
  elevationFt: number;  // Elevation relative to datum in feet (e.g. 0 for plinth, -2 for GL)
  text: string;         // e.g. "EL.±0'-0\""
  label: string;        // e.g. "PLINTH LEVEL"
  hasEarthHatch?: boolean; // Earth hatching block adjacent to level line
}

export interface LeaderAnnotation3D {
  id: string;
  rowId?: string;
  target: Point3D;      // Point the arrow points to
  text: string;         // Callout text e.g. "2-5/8\"Ø", "1/2\"Ø@4\"C/C"
  preferredSide?: 'left' | 'right' | 'top' | 'bottom';
}

export interface SectionMarker3D {
  id: string;
  p: Point3D;
  label: string;        // e.g. "A"
  direction: 'left' | 'right' | 'up' | 'down';
}

export interface Scene3D {
  solids: Solid3D[];
  bars: BarPath3D[];
  dimensions: LinearDimension3D[];
  levelMarks: LevelMark3D[];
  leaders: LeaderAnnotation3D[];
  sectionMarkers: SectionMarker3D[];
  title: string;
  subTitle?: string;
  notes: string[];
}

// ─── 2D Projected View Types ──────────────────────────────────────────────────

export interface Polygon2D {
  id: string;
  material: MaterialTag;
  points: Point2D[];
}

export interface Line2D {
  id: string;
  rowId: string;
  markId: string;
  diaIn: number;
  kind: BarKind;
  points: Point2D[];
}

export interface Circle2D {
  id: string;
  rowId: string;
  markId: string;
  center: Point2D;
  radiusIn: number;
  kind: BarKind;
}

export interface Dimension2D {
  id: string;
  p1: Point2D;
  p2: Point2D;
  text: string;
  subText?: string;
  offset: number;       // In inches
  orientation: 'horizontal' | 'vertical';
}

export interface LevelMark2D {
  id: string;
  y: number;            // Vertical position
  x: number;            // Reference horizontal anchor
  text: string;         // "EL.±0'-0\""
  label: string;        // "PLINTH LEVEL"
  hasEarthHatch?: boolean;
}

export interface Leader2D {
  id: string;
  rowId?: string;
  target: Point2D;
  text: string;
  direction: 'left' | 'right' | 'top' | 'bottom';
}

export interface SectionMarker2D {
  id: string;
  p: Point2D;
  label: string;
  direction: 'left' | 'right' | 'up' | 'down';
}

export type DrawingStyle = 'textbook' | 'simple' | 'color';

export interface View2D {
  viewId: string;       // e.g. "section", "plan", "elevation"
  title: string;
  subTitle?: string;
  siteView?: boolean;
  bounds: {
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
    width: number;
    height: number;
  };
  polygons: Polygon2D[];
  lines: Line2D[];
  circles: Circle2D[];
  dimensions: Dimension2D[];
  levelMarks: LevelMark2D[];
  leaders: Leader2D[];
  sectionMarkers: SectionMarker2D[];
  notes: string[];
}
