import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Scene3D, BarPath3D, Solid3D } from '../../geometry/types';
import { useProjectStore } from '../../store/projectStore';

interface ThreeDViewerProps {
  scene: Scene3D;
  className?: string;
  style?: React.CSSProperties;
}

// ── Color Map ────────────────────────────────────────────────────────────────
function getBarColor(kind: string): string {
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
}

// ── Concrete Solid Mesh ──────────────────────────────────────────────────────
function SolidMesh({ solid }: { solid: Solid3D }) {
  const { min, max, material } = solid;
  const width = Math.max(0.1, max[0] - min[0]);
  const height = Math.max(0.1, max[1] - min[1]);
  const depth = Math.max(0.1, max[2] - min[2]);
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  const color = material === 'lean_concrete' ? '#78716C' : '#94A3B8';
  const opacity = material === 'lean_concrete' ? 0.22 : 0.16;

  return (
    <group position={center}>
      {/* Transparent solid body */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.8}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      {/* Crisp wireframe boundary edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color={material === 'lean_concrete' ? '#57534E' : '#64748B'} opacity={0.4} transparent />
      </lineSegments>
    </group>
  );
}

// ── 3D Rebar Tube Mesh ───────────────────────────────────────────────────────
function RebarTube({
  bar,
  isHighlighted,
  onHover,
}: {
  bar: BarPath3D;
  isHighlighted: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const { points, diaIn, kind } = bar;
  const radius = Math.max(0.12, diaIn / 2);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = new THREE.Vector3(points[i][0], points[i][1], points[i][2]);
      const p2 = new THREE.Vector3(points[i + 1][0], points[i + 1][1], points[i + 1][2]);
      if (p1.distanceTo(p2) > 0.001) {
        path.add(new THREE.LineCurve3(p1, p2));
      }
    }
    if (path.curves.length === 0) return null;
    const segments = Math.max(16, points.length * 12);
    return new THREE.TubeGeometry(path, segments, radius, 8, false);
  }, [points, radius]);

  if (!geometry) return null;

  const baseColor = getBarColor(kind);
  const color = isHighlighted ? '#2563EB' : baseColor;

  return (
    <mesh
      geometry={geometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.35}
        metalness={0.65}
        emissive={isHighlighted ? '#1D4ED8' : '#000000'}
        emissiveIntensity={isHighlighted ? 0.35 : 0}
      />
    </mesh>
  );
}

// ── Camera Controller & Presets ──────────────────────────────────────────────
type PresetView = 'iso' | 'top' | 'front' | 'side';

function SceneContent({
  scene,
  presetView,
  onResetPreset,
}: {
  scene: Scene3D;
  presetView: PresetView | null;
  onResetPreset: () => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const hoveredRowId = useProjectStore((s) => s.hoveredRowId);
  const setHoveredRowId = useProjectStore((s) => s.setHoveredRowId);

  // Compute scene bounding box & center
  const { center, maxDim } = useMemo(() => {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const s of scene.solids) {
      minX = Math.min(minX, s.min[0]);
      minY = Math.min(minY, s.min[1]);
      minZ = Math.min(minZ, s.min[2]);
      maxX = Math.max(maxX, s.max[0]);
      maxY = Math.max(maxY, s.max[1]);
      maxZ = Math.max(maxZ, s.max[2]);
    }

    for (const b of scene.bars) {
      for (const p of b.points) {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        minZ = Math.min(minZ, p[2]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
        maxZ = Math.max(maxZ, p[2]);
      }
    }

    if (minX === Infinity) {
      return { center: new THREE.Vector3(0, 0, 0), maxDim: 50 };
    }

    const c = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    const d = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 20);
    return { center: c, maxDim: d };
  }, [scene]);

  // Adjust camera when presetView changes
  useEffect(() => {
    if (!controlsRef.current || !presetView) return;
    const dist = maxDim * 1.6;
    const ctrl = controlsRef.current;
    ctrl.target.copy(center);

    switch (presetView) {
      case 'iso':
        ctrl.object.position.set(center.x + dist * 0.7, center.y + dist * 0.7, center.z + dist * 0.7);
        ctrl.object.up.set(0, 1, 0);
        break;
      case 'top':
        ctrl.object.position.set(center.x, center.y + dist * 1.5, center.z);
        ctrl.object.up.set(0, 0, -1);
        break;
      case 'front':
        ctrl.object.position.set(center.x, center.y, center.z + dist * 1.5);
        ctrl.object.up.set(0, 1, 0);
        break;
      case 'side':
        ctrl.object.position.set(center.x + dist * 1.5, center.y, center.z);
        ctrl.object.up.set(0, 1, 0);
        break;
    }
    ctrl.update();
    onResetPreset();
  }, [presetView, center, maxDim, onResetPreset]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={center}
      />

      <ambientLight intensity={0.75} />
      <directionalLight position={[center.x + 50, center.y + 80, center.z + 60]} intensity={0.9} />
      <directionalLight position={[center.x - 40, center.y - 30, center.z - 40]} intensity={0.35} />

      {/* Solids */}
      {scene.solids.map((s) => (
        <SolidMesh key={s.id} solid={s} />
      ))}

      {/* Reinforcement Rebar Tubes */}
      {scene.bars.map((b) => (
        <RebarTube
          key={b.markId}
          bar={b}
          isHighlighted={hoveredRowId === b.rowId}
          onHover={(hovered) => setHoveredRowId(hovered ? b.rowId : null)}
        />
      ))}
    </>
  );
}

// ── Default Export ThreeDViewer ──────────────────────────────────────────────
export default function ThreeDViewer({ scene, className = '', style = {} }: ThreeDViewerProps) {
  const [presetView, setPresetView] = useState<PresetView | null>('iso');

  return (
    <div
      className={`threed-viewer-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-surface, #FAFAFB)',
        overflow: 'hidden',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Preset View Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          display: 'flex',
          gap: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--hairline, #E2E8F0)',
          borderRadius: '6px',
          padding: '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {(['iso', 'top', 'front', 'side'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPresetView(mode)}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 500,
              fontFamily: 'inherit',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: presetView === mode ? 'var(--bg-field, #E2E8F0)' : 'transparent',
              color: 'var(--text-primary, #1E293B)',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Orbit Helper Cue */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          zIndex: 10,
          fontSize: '10px',
          color: 'var(--text-muted, #94A3B8)',
          pointerEvents: 'none',
        }}
      >
        Left click + drag to rotate • Scroll to zoom • Right click to pan
      </div>

      <Canvas
        camera={{ position: [60, 60, 60], fov: 45, near: 0.1, far: 2000 }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent
          scene={scene}
          presetView={presetView}
          onResetPreset={() => setPresetView(null)}
        />
      </Canvas>
    </div>
  );
}
