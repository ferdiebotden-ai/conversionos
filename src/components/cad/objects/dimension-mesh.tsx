'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { useMemo } from 'react';
import { Line, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Dimension } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';
import { distance } from '../tools/tool-types';

interface DimensionMeshProps {
  dimension: Dimension;
}

export function DimensionMesh({ dimension }: DimensionMeshProps) {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const selectedId = useDrawingStore((s) => s.selectedId);
  const selectObject = useDrawingStore((s) => s.selectObject);
  const units = useDrawingStore((s) => s.units);

  const isSelected = selectedId === dimension.id;
  const len = distance(dimension.start, dimension.end);

  // Compute perpendicular offset direction
  const { offsetDir, midX, midZ, label } = useMemo(() => {
    const dx = dimension.end.x - dimension.start.x;
    const dz = dimension.end.z - dimension.start.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    // Perpendicular direction (rotated 90 degrees)
    const perpX = -dz / d;
    const perpZ = dx / d;
    const off = dimension.offset;

    const mx = (dimension.start.x + dimension.end.x) / 2 + perpX * off;
    const mz = (dimension.start.z + dimension.end.z) / 2 + perpZ * off;

    // Format label
    let lbl = dimension.label;
    if (!lbl) {
      if (units === 'imperial') {
        const totalInches = len * 39.3701;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        lbl = `${feet}'-${inches}"`;
      } else {
        lbl = `${len.toFixed(2)} m`;
      }
    }

    return {
      offsetDir: { x: perpX, z: perpZ },
      midX: mx,
      midZ: mz,
      label: lbl,
    };
  }, [dimension, len, units]);

  const off = dimension.offset;
  const color = isSelected ? '#1565C0' : '#444444';

  // Extension line endpoints (from geometry to dimension line)
  const ext1Start: [number, number, number] = [dimension.start.x, 0.02, dimension.start.z];
  const ext1End: [number, number, number] = [
    dimension.start.x + offsetDir.x * off,
    0.02,
    dimension.start.z + offsetDir.z * off,
  ];
  const ext2Start: [number, number, number] = [dimension.end.x, 0.02, dimension.end.z];
  const ext2End: [number, number, number] = [
    dimension.end.x + offsetDir.x * off,
    0.02,
    dimension.end.z + offsetDir.z * off,
  ];

  // Dimension line (connecting offset endpoints)
  const dimLineStart: [number, number, number] = ext1End;
  const dimLineEnd: [number, number, number] = ext2End;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    selectObject(dimension.id);
  }

  return (
    <group onClick={handleClick}>
      {/* Extension lines */}
      <Line points={[ext1Start, ext1End]} color={color} lineWidth={1} />
      <Line points={[ext2Start, ext2End]} color={color} lineWidth={1} />

      {/* Dimension line */}
      <Line points={[dimLineStart, dimLineEnd]} color={color} lineWidth={1.5} />

      {/* Arrowhead ticks at endpoints */}
      <Line
        points={[
          [ext1End[0] - offsetDir.x * 0.1, 0.02, ext1End[2] - offsetDir.z * 0.1],
          ext1End,
          [ext1End[0] + offsetDir.x * 0.1, 0.02, ext1End[2] + offsetDir.z * 0.1],
        ]}
        color={color}
        lineWidth={1}
      />
      <Line
        points={[
          [ext2End[0] - offsetDir.x * 0.1, 0.02, ext2End[2] - offsetDir.z * 0.1],
          ext2End,
          [ext2End[0] + offsetDir.x * 0.1, 0.02, ext2End[2] + offsetDir.z * 0.1],
        ]}
        color={color}
        lineWidth={1}
      />

      {/* Label */}
      <Html position={[midX, 0.1, midZ]} center>
        <div
          className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none font-mono ${
            isSelected
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-white text-gray-800 border border-gray-300'
          }`}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
