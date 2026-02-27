'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { useState, useCallback } from 'react';
import { Line, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec2 } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';
import { snapVec2, distance } from './tool-types';

interface DimensionToolProps {
  isActive: boolean;
}

export function DimensionTool({ isActive }: DimensionToolProps) {
  const [startPoint, setStartPoint] = useState<Vec2 | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Vec2 | null>(null);
  const addDimension = useDrawingStore((s) => s.addDimension);
  const walls = useDrawingStore((s) => s.walls);

  // Find nearest snap point to cursor (wall endpoints, midpoints, opening edges)
  const findSnapPoint = useCallback(
    (point: Vec2): Vec2 => {
      const SNAP_THRESHOLD = 0.3;
      let closest = point;
      let closestDist = SNAP_THRESHOLD;

      for (const wall of walls) {
        // Wall start
        const ds = distance(point, wall.start);
        if (ds < closestDist) {
          closest = wall.start;
          closestDist = ds;
        }
        // Wall end
        const de = distance(point, wall.end);
        if (de < closestDist) {
          closest = wall.end;
          closestDist = de;
        }
        // Wall midpoint
        const mid: Vec2 = {
          x: (wall.start.x + wall.end.x) / 2,
          z: (wall.start.z + wall.end.z) / 2,
        };
        const dm = distance(point, mid);
        if (dm < closestDist) {
          closest = mid;
          closestDist = dm;
        }
      }

      return closestDist < SNAP_THRESHOLD ? closest : snapVec2(point);
    },
    [walls]
  );

  if (!isActive) {
    if (startPoint) setStartPoint(null);
    return null;
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    const pt = { x: e.point.x, z: e.point.z };
    setPreviewPoint(findSnapPoint(pt));
  }

  function handleClick(e: ThreeEvent<MouseEvent>) {
    const pt = findSnapPoint({ x: e.point.x, z: e.point.z });

    if (!startPoint) {
      setStartPoint(pt);
    } else {
      const len = distance(startPoint, pt);
      if (len > 0.05) {
        addDimension({
          id: crypto.randomUUID(),
          start: startPoint,
          end: pt,
          offset: 0.5,
        });
      }
      setStartPoint(null);
      setPreviewPoint(null);
    }
  }

  return (
    <>
      {/* Invisible click plane */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Start point marker */}
      {startPoint && (
        <mesh position={[startPoint.x, 0.05, startPoint.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#1565C0" />
        </mesh>
      )}

      {/* Preview line */}
      {startPoint && previewPoint && (
        <>
          <Line
            points={[
              [startPoint.x, 0.02, startPoint.z],
              [previewPoint.x, 0.02, previewPoint.z],
            ]}
            color="#1565C0"
            lineWidth={1}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
          <Html position={[
            (startPoint.x + previewPoint.x) / 2,
            0.15,
            (startPoint.z + previewPoint.z) / 2
          ]} center>
            <div className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded font-mono pointer-events-none">
              {distance(startPoint, previewPoint).toFixed(2)} m
            </div>
          </Html>
        </>
      )}

      {/* Preview point marker */}
      {previewPoint && (
        <mesh position={[previewPoint.x, 0.05, previewPoint.z]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#1565C0" opacity={0.5} transparent />
        </mesh>
      )}
    </>
  );
}
