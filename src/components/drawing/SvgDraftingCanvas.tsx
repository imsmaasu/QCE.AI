import React, { useId, useMemo } from 'react';
import { View2D, Point2D, Leader2D, DrawingStyle } from '../../geometry/types';
import { useProjectStore } from '../../store/projectStore';

interface SvgDraftingCanvasProps {
  view: View2D;
  highlightedRowId?: string | null;
  onHighlightRow?: (rowId: string | null) => void;
  drawingStyle?: DrawingStyle;
  showLabels?: boolean;
  isCompact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SvgDraftingCanvas({
  view,
  highlightedRowId,
  onHighlightRow,
  drawingStyle,
  showLabels = true,
  isCompact = false,
  className = '',
  style = {},
}: SvgDraftingCanvasProps) {
  const uid = useId().replace(/:/g, '');
  const globalDrawingStyle = useProjectStore((s) => s.drawingStyle);
  const activeStyle: DrawingStyle = drawingStyle || globalDrawingStyle || 'textbook';
  const isMonochrome = activeStyle === 'textbook' || activeStyle === 'simple';

  const { minU, minV, maxV, width, height } = view.bounds;

  // Proportion System:
  // H = 2.3% of the longer bounding box side in world inches
  const refDim = Math.max(width, height);
  const H = Math.max(0.4, 0.023 * refDim);

  // Line weights:
  const wLeader = 0.06 * H;
  const wDimLine = 0.08 * H;
  const wOutline = 0.085 * H;
  const wPrimaryMember = 0.12 * H;
  const wSecondaryBar = 0.10 * H;
  const wMainBar = 0.15 * H;
  const wStirrup = 0.06 * H;
  const rCutDot = 0.225 * H; // diameter = 0.45 H
  const arrowLen = 0.6 * H;
  const arrowHalfW = 0.2 * H;

  // Text sizes:
  const fontSizeTitle = 1.4 * H;
  const fontSizeSubtitle = 0.9 * H;
  const fontSizeAnnotation = 1.0 * H;

  // Transform Cartesian (u, v) (v up) into SVG (x, y) (y down)
  const toY = (v: number) => maxV + minV - v;

  const ptsToSvg = (pts: Point2D[]) =>
    pts.map(([u, v]) => `${u.toFixed(2)},${toY(v).toFixed(2)}`).join(' ');

  // Bar coloring helper (Monochrome for Textbook & Simple, Palette for Color)
  const getBarColor = (kind: string, isHighlighted: boolean) => {
    if (isHighlighted) return 'var(--accent-hover, #2563EB)';
    if (isMonochrome) return '#000000';
    switch (kind) {
      case 'main':
      case 'top':
        return '#3B4A8C';
      case 'dist':
      case 'stirrup':
        return '#0284C7';
      case 'dowel':
        return '#0D9488';
      case 'extra':
        return '#D97706';
      case 'tie':
        return '#4F46E5';
      default:
        return '#3B4A8C';
    }
  };

  const getBarStrokeWidth = (kind: string, isHighlighted: boolean) => {
    let baseW = wMainBar;
    if (kind === 'dist' || kind === 'tie') baseW = wSecondaryBar;
    if (kind === 'stirrup') baseW = wStirrup;
    return isHighlighted ? baseW * 1.5 : baseW;
  };

  const hasActiveHover = Boolean(highlightedRowId);
  const getBarOpacity = (rowId?: string) => {
    if (!hasActiveHover || !rowId) return 1;
    return highlightedRowId === rowId ? 1 : 0.35;
  };

  const hatchConcreteId = `hatch-concrete-${uid}`;
  const hatchLeanId = `hatch-lean-${uid}`;
  const hatchEarthId = `hatch-earth-${uid}`;

  const isElevation = view.viewId.includes('elevation');
  const textColor = isMonochrome ? '#000000' : 'currentColor';
  const paperBg = isMonochrome ? '#FFFFFF' : 'transparent';

  const shouldRenderLeaders = showLabels && !isCompact;

  // Staggered & Collision-Avoided Leaders
  const laidOutLeaders = useMemo(() => {
    if (!shouldRenderLeaders) return [];

    const lefts: Array<Leader2D & { tx: number; ty: number; isRight: boolean }> = [];
    const rights: Array<Leader2D & { tx: number; ty: number; isRight: boolean }> = [];
    const tops: Array<Leader2D & { tx: number; ty: number }> = [];
    const bottoms: Array<Leader2D & { tx: number; ty: number }> = [];

    const toYLocal = (v: number) => maxV + minV - v;

    for (const l of view.leaders) {
      const tx = l.target[0];
      const ty = toYLocal(l.target[1]);

      if (l.direction === 'top') {
        tops.push({ ...l, tx, ty });
      } else if (l.direction === 'bottom') {
        bottoms.push({ ...l, tx, ty });
      } else if (l.direction === 'left') {
        lefts.push({ ...l, tx, ty, isRight: false });
      } else {
        rights.push({ ...l, tx, ty, isRight: true });
      }
    }

    // Vertical stacking for left and right margins (min gap 1.6 * H)
    const processVertGroup = (group: typeof lefts, isRight: boolean) => {
      const sorted = [...group].sort((a, b) => a.ty - b.ty);
      const minGap = 1.6 * H;
      let lastKneeY = -Infinity;

      return sorted.map((l) => {
        let kneeY = l.ty - 1.2 * H;
        if (kneeY < lastKneeY + minGap) {
          kneeY = lastKneeY + minGap;
        }
        lastKneeY = kneeY;

        const kneeX = l.tx + (isRight ? 2.5 * H : -2.5 * H);
        const endX = kneeX + (isRight ? 5.5 * H : -5.5 * H);
        return { ...l, kneeY, kneeX, endX, isRight };
      });
    };

    // Horizontal stacking for top and bottom (min gap 4 * H)
    const processHorizGroup = (group: typeof tops, isTop: boolean) => {
      const sorted = [...group].sort((a, b) => a.tx - b.tx);
      const minGap = 4.0 * H;
      let lastKneeX = -Infinity;

      return sorted.map((l) => {
        let kneeX = l.tx + (isTop ? 1.5 * H : -1.5 * H);
        if (kneeX < lastKneeX + minGap) {
          kneeX = lastKneeX + minGap;
        }
        lastKneeX = kneeX;

        const kneeY = l.ty + (isTop ? -2.5 * H : 2.5 * H);
        const endX = kneeX + 5.0 * H;
        return { ...l, kneeY, kneeX, endX, isRight: true };
      });
    };

    return [
      ...processVertGroup(lefts, false),
      ...processVertGroup(rights, true),
      ...processHorizGroup(tops, true),
      ...processHorizGroup(bottoms, false),
    ];
  }, [view.leaders, H, maxV, minV, shouldRenderLeaders]);

  // Dimension Lines with Outward Bumping for Shared Offsets
  const laidOutDimensions = useMemo(() => {
    const seenHOffsets = new Map<number, number>();
    const seenVOffsets = new Map<number, number>();

    return view.dimensions.map((dim) => {
      let offset = dim.offset;
      if (dim.orientation === 'horizontal') {
        const count = seenHOffsets.get(offset) || 0;
        seenHOffsets.set(offset, count + 1);
        if (count > 0) {
          offset = offset > 0 ? offset + count * 2.0 * H : offset - count * 2.0 * H;
        }
      } else {
        const count = seenVOffsets.get(offset) || 0;
        seenVOffsets.set(offset, count + 1);
        if (count > 0) {
          offset = offset > 0 ? offset + count * 2.0 * H : offset - count * 2.0 * H;
        }
      }
      return { ...dim, offset };
    });
  }, [view.dimensions, H]);

  // Level Marks with Vertical Clearance Staggering
  const laidOutLevelMarks = useMemo(() => {
    const sorted = [...view.levelMarks].sort((a, b) => a.y - b.y);
    let lastY = -Infinity;
    let stagger = false;

    return sorted.map((lm) => {
      if (Math.abs(lm.y - lastY) < 2.0 * H) {
        stagger = !stagger;
      } else {
        stagger = false;
      }
      lastY = lm.y;
      const xShift = stagger ? -4.0 * H : 0;
      return { ...lm, xShift };
    });
  }, [view.levelMarks, H]);

  return (
    <div
      className={`svg-drafting-canvas-wrapper ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: paperBg,
        ...style,
      }}
    >
      <svg
        viewBox={`${minU} ${minV} ${width} ${height}`}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontVariantNumeric: 'tabular-nums',
          backgroundColor: paperBg,
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Concrete hatch: thin grey 45 deg diagonal lines */}
          <pattern
            id={hatchConcreteId}
            width={3 * H}
            height={3 * H}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={3 * H}
              stroke={isMonochrome ? '#000000' : 'currentColor'}
              strokeOpacity={isMonochrome ? 0.12 : 0.1}
              strokeWidth={wLeader}
            />
            <circle
              cx={1.5 * H}
              cy={1.5 * H}
              r={0.15 * H}
              fill={isMonochrome ? '#000000' : 'currentColor'}
              fillOpacity={isMonochrome ? 0.14 : 0.12}
            />
          </pattern>

          {/* Lean concrete hatch */}
          <pattern
            id={hatchLeanId}
            width={2.5 * H}
            height={2.5 * H}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={2.5 * H}
              stroke={isMonochrome ? '#000000' : 'currentColor'}
              strokeOpacity={isMonochrome ? 0.18 : 0.16}
              strokeWidth={wLeader}
              strokeDasharray={`${0.8 * H},${0.8 * H}`}
            />
          </pattern>

          {/* Earth ground hatch */}
          <pattern
            id={hatchEarthId}
            width={4 * H}
            height={4 * H}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2={4 * H}
              y2={4 * H}
              stroke={isMonochrome ? '#000000' : 'currentColor'}
              strokeOpacity={isMonochrome ? 0.2 : 0.18}
              strokeWidth={wLeader}
            />
            <line
              x1={4 * H}
              y1="0"
              x2="0"
              y2={4 * H}
              stroke={isMonochrome ? '#000000' : 'currentColor'}
              strokeOpacity={isMonochrome ? 0.2 : 0.18}
              strokeWidth={wLeader}
            />
          </pattern>
        </defs>

        {/* Paper White Background */}
        {isMonochrome && (
          <rect
            x={minU}
            y={minV}
            width={width}
            height={height}
            fill="#FFFFFF"
          />
        )}

        {/* 1. Concrete & Material Polygons */}
        {view.polygons.map((poly) => {
          let fill = isMonochrome ? '#FFFFFF' : 'none';
          if (poly.material === 'concrete') fill = `url(#${hatchConcreteId})`;
          else if (poly.material === 'lean_concrete') fill = `url(#${hatchLeanId})`;
          else if (poly.material === 'earth') fill = `url(#${hatchEarthId})`;
          else if (poly.material === 'column_support')
            fill = isMonochrome ? 'rgba(0, 0, 0, 0.04)' : 'rgba(120, 120, 140, 0.06)';

          return (
            <polygon
              key={poly.id}
              points={ptsToSvg(poly.points)}
              fill={fill}
              stroke={isMonochrome ? '#000000' : 'var(--hairline-dark, #76767E)'}
              strokeWidth={wPrimaryMember}
              strokeLinejoin="round"
            />
          );
        })}

        {/* 2. Reinforcement Bars (Lines) */}
        {view.lines.map((line) => {
          const isHighlighted = highlightedRowId === line.rowId;
          const color = getBarColor(line.kind, isHighlighted);
          const strokeWidth = getBarStrokeWidth(line.kind, isHighlighted);
          const opacity = getBarOpacity(line.rowId);

          return (
            <g
              key={line.id}
              className="bar-mark-group"
              style={{ cursor: 'pointer', opacity, transition: 'opacity 0.15s ease' }}
              onMouseEnter={() => onHighlightRow?.(line.rowId)}
              onMouseLeave={() => onHighlightRow?.(null)}
              onClick={() => onHighlightRow?.(line.rowId)}
            >
              {/* Invisible wider hit-target for clicking */}
              <polyline
                points={ptsToSvg(line.points)}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(14 * (H / 5), 8)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Visible bar line */}
              <polyline
                points={ptsToSvg(line.points)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* 3. Reinforcement Bars (Cut Bar Dots) */}
        {view.circles.map((c) => {
          const isHighlighted = highlightedRowId === c.rowId;
          const color = getBarColor(c.kind, isHighlighted);
          const r = isHighlighted ? rCutDot * 1.3 : rCutDot;
          const opacity = getBarOpacity(c.rowId);

          return (
            <g
              key={c.id}
              className="bar-mark-group"
              style={{ cursor: 'pointer', opacity, transition: 'opacity 0.15s ease' }}
              onMouseEnter={() => onHighlightRow?.(c.rowId)}
              onMouseLeave={() => onHighlightRow?.(null)}
              onClick={() => onHighlightRow?.(c.rowId)}
            >
              {/* Wider hit area */}
              <circle
                cx={c.center[0]}
                cy={toY(c.center[1])}
                r={Math.max(r * 2.5, 6)}
                fill="transparent"
              />
              {/* Bar circle */}
              <circle
                cx={c.center[0]}
                cy={toY(c.center[1])}
                r={r}
                fill={color}
                stroke={isHighlighted ? '#FFFFFF' : 'none'}
                strokeWidth={isHighlighted ? 0.08 * H : 0}
              />
            </g>
          );
        })}

        {/* 4. Linear Dimensions (Always Rendered) */}
        {laidOutDimensions
          .filter((dim) => {
            if (isCompact && (dim.id.includes('zone') || dim.id.includes('lean-proj'))) {
              return false;
            }
            return true;
          })
          .map((dim) => {
            const isHoriz = dim.orientation === 'horizontal';
            const p1x = dim.p1[0];
            const p1y = toY(dim.p1[1]);
            const p2x = dim.p2[0];
            const p2y = toY(dim.p2[1]);

            const offsetDist = dim.offset;
            const offX = isHoriz ? 0 : offsetDist;
            const offY = isHoriz ? -offsetDist : 0;

            const d1x = p1x + offX;
            const d1y = p1y + offY;
            const d2x = p2x + offX;
            const d2y = p2y + offY;

            const midX = (d1x + d2x) / 2;
            const midY = (d1y + d2y) / 2;

            const textLen = dim.text.length + (dim.subText ? 3 : 0);
            const rw = Math.max(2.5 * H, textLen * 0.65 * H);
            const rh = dim.subText ? 2.0 * H : 1.3 * H;

            return (
              <g key={dim.id} className="drafting-dim">
                {/* Extension lines */}
                <line
                  x1={p1x}
                  y1={p1y}
                  x2={d1x + (isHoriz ? 0 : (dim.offset > 0 ? 0.4 * H : -0.4 * H))}
                  y2={d1y + (isHoriz ? (dim.offset > 0 ? -0.4 * H : 0.4 * H) : 0)}
                  stroke={textColor}
                  strokeWidth={wLeader}
                  strokeDasharray={`${0.6 * H},${0.6 * H}`}
                />
                <line
                  x1={p2x}
                  y1={p2y}
                  x2={d2x + (isHoriz ? 0 : (dim.offset > 0 ? 0.4 * H : -0.4 * H))}
                  y2={d2y + (isHoriz ? (dim.offset > 0 ? -0.4 * H : 0.4 * H) : 0)}
                  stroke={textColor}
                  strokeWidth={wLeader}
                  strokeDasharray={`${0.6 * H},${0.6 * H}`}
                />

                {/* Main dimension line */}
                <line
                  x1={d1x}
                  y1={d1y}
                  x2={d2x}
                  y2={d2y}
                  stroke={textColor}
                  strokeWidth={wDimLine}
                />

                {/* Arrowheads */}
                {isHoriz ? (
                  <>
                    <polygon
                      points={`${d1x},${d1y} ${d1x + arrowLen},${d1y - arrowHalfW} ${d1x + arrowLen},${d1y + arrowHalfW}`}
                      fill={textColor}
                    />
                    <polygon
                      points={`${d2x},${d2y} ${d2x - arrowLen},${d2y - arrowHalfW} ${d2x - arrowLen},${d2y + arrowHalfW}`}
                      fill={textColor}
                    />
                  </>
                ) : (
                  <>
                    <polygon
                      points={`${d1x},${d1y} ${d1x - arrowHalfW},${d1y - arrowLen} ${d1x + arrowHalfW},${d1y - arrowLen}`}
                      fill={textColor}
                    />
                    <polygon
                      points={`${d2x},${d2y} ${d2x - arrowHalfW},${d2y + arrowLen} ${d2x + arrowHalfW},${d2y + arrowLen}`}
                      fill={textColor}
                    />
                  </>
                )}

                {/* Dimension label with 0.2H knockout */}
                <g transform={`translate(${midX}, ${midY}) ${!isHoriz ? 'rotate(-90)' : ''}`}>
                  <rect
                    x={-rw / 2 - 0.2 * H}
                    y={-rh * 0.75 - 0.2 * H}
                    width={rw + 0.4 * H}
                    height={rh + 0.4 * H}
                    fill={isMonochrome ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)'}
                  />
                  <text
                    x={0}
                    y={-0.35 * H}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize={fontSizeAnnotation}
                    fontWeight="normal"
                  >
                    {dim.text}
                  </text>
                  {dim.subText && (
                    <text
                      x={0}
                      y={0.65 * H}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isMonochrome ? '#555555' : 'var(--text-muted, #76767E)'}
                      fontSize={fontSizeSubtitle}
                      fontWeight="normal"
                    >
                      {dim.subText}
                    </text>
                  )}
                </g>
              </g>
            );
          })}

        {/* 5. Level Marks (EL. PLINTH, GL) */}
        {laidOutLevelMarks.map((lm) => {
          const sy = toY(lm.y);
          const sx = lm.x + (lm.xShift || 0);
          const datumLen = 8 * H;
          const triH = 1.0 * H;
          const triW = 0.8 * H;

          return (
            <g key={lm.id} className="drafting-level-mark">
              {/* Horizontal level datum line */}
              <line
                x1={sx - datumLen}
                y1={sy}
                x2={sx + 3 * H}
                y2={sy}
                stroke={textColor}
                strokeWidth={wDimLine}
              />
              <polygon
                points={`${sx - triW / 2},${sy - triH} ${sx},${sy - triH} ${sx},${sy}`}
                fill={textColor}
                stroke={textColor}
                strokeWidth={wOutline}
              />
              <polygon
                points={`${sx},${sy - triH} ${sx + triW / 2},${sy - triH} ${sx},${sy}`}
                fill={isMonochrome ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)'}
                stroke={textColor}
                strokeWidth={wOutline}
              />
              {/* Ground hatch strip under GL */}
              {lm.hasEarthHatch && (
                <g className="ground-hatch-strip">
                  {[-6, -4.5, -3, -1.5, 0, 1.5].map((offset, i) => (
                    <line
                      key={i}
                      x1={sx + offset * H}
                      y1={sy + 0.1 * H}
                      x2={sx + (offset - 0.7) * H}
                      y2={sy + 0.8 * H}
                      stroke={textColor}
                      strokeWidth={wLeader}
                    />
                  ))}
                </g>
              )}
              {/* Level label text: rendered only when showLabels and not compact */}
              {showLabels && !isCompact && (
                <>
                  <text
                    x={sx - 1.2 * H}
                    y={sy - 1.4 * H}
                    textAnchor="end"
                    fontSize={fontSizeAnnotation}
                    fontWeight="normal"
                    fill={textColor}
                  >
                    {lm.text}
                  </text>
                  <text
                    x={sx - 1.2 * H}
                    y={sy - 0.3 * H}
                    textAnchor="end"
                    fontSize={fontSizeSubtitle}
                    fontWeight="normal"
                    fill={isMonochrome ? '#404040' : 'var(--text-muted, #76767E)'}
                  >
                    {lm.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 6. Leaders & Callouts (Shown when showLabels === true) */}
        {shouldRenderLeaders &&
          laidOutLeaders.map((lead) => {
            const isHighlighted = highlightedRowId && lead.rowId === highlightedRowId;
            const opacity = getBarOpacity(lead.rowId);
            const leaderColor = isHighlighted ? 'var(--accent-hover, #2563EB)' : textColor;

            const lines = lead.text.split('\n');
            const lineSpacing = 1.35 * H;

            return (
              <g
                key={lead.id}
                className="drafting-leader"
                style={{
                  cursor: lead.rowId ? 'pointer' : 'default',
                  opacity,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={() => lead.rowId && onHighlightRow?.(lead.rowId)}
                onMouseLeave={() => lead.rowId && onHighlightRow?.(null)}
                onClick={() => lead.rowId && onHighlightRow?.(lead.rowId)}
              >
                {/* Target dot */}
                <circle
                  cx={lead.tx}
                  cy={lead.ty}
                  r={rCutDot * 0.9}
                  fill={leaderColor}
                />
                {/* Leader dogleg line */}
                <polyline
                  points={`${lead.tx},${lead.ty} ${lead.kneeX},${lead.kneeY} ${lead.endX},${lead.kneeY}`}
                  fill="none"
                  stroke={leaderColor}
                  strokeWidth={isHighlighted ? wLeader * 1.8 : wLeader}
                />
                {/* Multiline text callout */}
                {lines.map((lineText, lidx) => (
                  <text
                    key={lidx}
                    data-kind="leader-text"
                    x={lead.kneeX + (lead.isRight ? 0.6 * H : -0.6 * H)}
                    y={lead.kneeY - 0.4 * H - (lines.length - 1 - lidx) * lineSpacing}
                    textAnchor={lead.isRight ? 'start' : 'end'}
                    fontSize={fontSizeAnnotation}
                    fontWeight={isHighlighted ? '600' : 'normal'}
                    fill={leaderColor}
                  >
                    {lineText}
                  </text>
                ))}
              </g>
            );
          })}

        {/* 7. Section Markers */}
        {view.sectionMarkers.map((sm) => {
          const sx = sm.p[0];
          const sy = toY(sm.p[1]);
          const rMarker = 1.2 * H;

          return (
            <g key={sm.id} className="drafting-section-marker">
              <line
                x1={sx}
                y1={sy - 2.5 * H}
                x2={sx}
                y2={sy + 2.5 * H}
                stroke={textColor}
                strokeWidth={wOutline}
                strokeDasharray={`${1.0 * H},${0.6 * H}`}
              />
              <circle
                cx={sx}
                cy={sy - 3.8 * H}
                r={rMarker}
                fill={isMonochrome ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)'}
                stroke={textColor}
                strokeWidth={wOutline}
              />
              {showLabels && (
                <text
                  x={sx}
                  y={sy - 3.4 * H}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSizeAnnotation}
                  fontWeight="normal"
                  fill={textColor}
                >
                  {sm.label}
                </text>
              )}
              <polygon
                points={`${sx},${sy - 2.6 * H} ${sx + 0.6 * H},${sy - 2.6 * H} ${sx},${sy - 1.8 * H}`}
                fill={textColor}
              />
            </g>
          );
        })}

        {/* 8. Dedicated Title Zone (Rendered when showLabels === true and not siteView) */}
        {showLabels && !view.siteView && (
          isElevation ? (
            <g className="drafting-title-elevation">
              <text
                x={minU + width / 2}
                y={maxV - 2.8 * H}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSizeTitle}
                fontWeight="normal"
                fill={textColor}
              >
                {view.title.toUpperCase()} {view.subTitle ? view.subTitle.toUpperCase() : ''}
              </text>
              <line
                x1={minU + width / 2 - Math.min(width * 0.32, 14 * H)}
                y1={maxV - 1.9 * H}
                x2={minU + width / 2 + Math.min(width * 0.32, 14 * H)}
                y2={maxV - 1.9 * H}
                stroke={textColor}
                strokeWidth={wDimLine}
              />
              <line
                x1={minU + width / 2 - Math.min(width * 0.32, 14 * H)}
                y1={maxV - 1.5 * H}
                x2={minU + width / 2 + Math.min(width * 0.32, 14 * H)}
                y2={maxV - 1.5 * H}
                stroke={textColor}
                strokeWidth={wDimLine}
              />
            </g>
          ) : (
            <g className="drafting-title-box">
              {(() => {
                const centerX = minU + width / 2;
                const titleText = view.title.toUpperCase();
                const approxLen = Math.max(titleText.length, view.subTitle?.length || 0);
                const boxW = Math.max(14 * H, Math.min(width - 4 * H, approxLen * 0.85 * H + 3 * H));
                const boxH = view.subTitle ? 3.4 * H : 2.5 * H;
                const boxX = centerX - boxW / 2;
                const boxY = maxV - boxH - 1.2 * H;

                return (
                  <>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      fill={isMonochrome ? '#FFFFFF' : 'var(--bg-surface, #FFFFFF)'}
                      stroke={textColor}
                      strokeWidth={wOutline}
                    />
                    <text
                      x={centerX}
                      y={view.subTitle ? boxY + 1.3 * H : boxY + boxH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSizeTitle}
                      fontWeight="normal"
                      fill={textColor}
                    >
                      {titleText}
                    </text>
                    {view.subTitle && (
                      <text
                        x={centerX}
                        y={boxY + 2.5 * H}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSizeSubtitle}
                        fontWeight="normal"
                        fill={isMonochrome ? '#555555' : 'var(--text-muted, #76767E)'}
                      >
                        {view.subTitle}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          )
        )}
      </svg>
    </div>
  );
}
