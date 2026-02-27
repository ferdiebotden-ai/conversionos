'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { useState, useCallback, useRef } from 'react';
import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec2 } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';
import { snapVec2 } from './tool-types';

const GROUND_NORMAL = new THREE.Vector3(0, 1, 0);
const GROUND_PLANE = new THREE.Plane(GROUND_NORMAL, 0);

interface WallToolProps {
  isActive: boolean;
}

export function WallTool({ isActive }: WallToolProps) {
  const [startPoint, setStartPoint] = useState<Vec2 | null>(null);
  const [previewEnd, setPreviewEnd] = useState<Vec2 | null>(null);
  const addWall = useDrawingStore((s) => s.addWall);
  const { camera, raycaster, pointer } = useThree();
  const intersectPoint = useRef(new THREE.Vector3());

  const getGroundPoint = useCallback((): Vec2 | null => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(GROUND_PLANE, intersectPoint.current);
    if (!hit) return null;
    return snapVec2({ x: hit.x, z: hit.z });
  }, [camera, raycaster, pointer]);

  const handlePointerDown = useCallback(() => {
    if (!isActive) return;
    const point = getGroundPoint();
    if (!point) return;

    if (!startPoint) {
      setStartPoint(point);
      setPreviewEnd(point);
    } else {
      addWall({
        id: crypto.randomUUID(),
        start: startPoint,
        end: point,
        height: 2.7,
        thickness: 0.15,
      });
      setStartPoint(null);
      setPreviewEnd(null);
    }
  }, [isActive, startPoint, getGroundPoint, addWall]);

  const handlePointerMove = useCallback(() => {
    if (!isActive || !startPoint) return;
    const point = getGroundPoint();
    if (point) setPreviewEnd(point);
  }, [isActive, startPoint, getGroundPoint]);

  if (!isActive) return null;

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {/* Invisible ground plane for raycasting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      {/* Start point marker */}
      {startPoint && (
        <mesh position={[startPoint.x, 0.05, startPoint.z]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#1565C0" />
        </mesh>
      )}

      {/* Preview line */}
      {startPoint && previewEnd && (
        <Line
          points={[
            [startPoint.x, 0.05, startPoint.z],
            [previewEnd.x, 0.05, previewEnd.z],
          ]}
          color="#1565C0"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
    </group>
  );
}
