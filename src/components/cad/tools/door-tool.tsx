'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { useState, useCallback, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec2 } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';
import { distance } from './tool-types';

const DOOR_WIDTH = 0.9;
const DOOR_HEIGHT = 2.1;
const DOOR_SILL = 0;

interface DoorToolProps {
  isActive: boolean;
}

type HoverState = {
  wallId: string;
  position: number;
  worldPos: Vec2;
  angle: number;
  wallHeight: number;
  valid: boolean;
};

export function DoorTool({ isActive }: DoorToolProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const walls = useDrawingStore((s) => s.walls);
  const openings = useDrawingStore((s) => s.openings);
  const addOpening = useDrawingStore((s) => s.addOpening);
  const { camera, raycaster, pointer, scene } = useThree();

  const wallData = useMemo(() => {
    return walls.map((wall) => {
      const len = distance(wall.start, wall.end);
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.z - wall.start.z;
      const angle = Math.atan2(dz, dx);
      return { wall, len, dx, dz, angle };
    });
  }, [walls]);

  const findWallHit = useCallback((): HoverState | null => {
    raycaster.setFromCamera(pointer, camera);

    // Collect wall meshes from the scene
    const wallMeshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.geometry instanceof THREE.BoxGeometry &&
        obj.userData?.['type'] !== 'ground'
      ) {
        wallMeshes.push(obj);
      }
    });

    const intersects = raycaster.intersectObjects(wallMeshes, false);
    const hit = intersects[0];
    if (!hit) return null;

    const hitPoint = hit.point;

    // Find which wall this mesh belongs to by checking proximity to wall midpoints
    let bestWall = wallData[0];
    let bestDist = Infinity;
    for (const wd of wallData) {
      const midX = (wd.wall.start.x + wd.wall.end.x) / 2;
      const midZ = (wd.wall.start.z + wd.wall.end.z) / 2;
      const d = Math.sqrt(
        (hitPoint.x - midX) ** 2 + (hitPoint.z - midZ) ** 2
      );
      if (d < bestDist) {
        bestDist = d;
        bestWall = wd;
      }
    }

    if (!bestWall) return null;

    // Project hit point onto wall line to get position (0-1)
    const { wall, len } = bestWall;
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const px = hitPoint.x - wall.start.x;
    const pz = hitPoint.z - wall.start.z;
    const t = Math.max(0, Math.min(1, (px * dx + pz * dz) / (len * len)));

    // Clamp so the door doesn't extend past wall ends
    const halfFrac = DOOR_WIDTH / len / 2;
    const clampedT = Math.max(halfFrac, Math.min(1 - halfFrac, t));

    // World position at this t
    const worldX = wall.start.x + dx * clampedT;
    const worldZ = wall.start.z + dz * clampedT;

    // Check overlap with existing openings on this wall
    const wallOpenings = openings.filter((o) => o.wallId === wall.id);
    const newStart = clampedT - halfFrac;
    const newEnd = clampedT + halfFrac;
    let valid = true;
    for (const existing of wallOpenings) {
      const existHalfFrac = existing.width / len / 2;
      const existStart = existing.position - existHalfFrac;
      const existEnd = existing.position + existHalfFrac;
      if (newStart < existEnd && newEnd > existStart) {
        valid = false;
        break;
      }
    }

    return {
      wallId: wall.id,
      position: clampedT,
      worldPos: { x: worldX, z: worldZ },
      angle: bestWall.angle,
      wallHeight: wall.height,
      valid,
    };
  }, [raycaster, pointer, camera, scene, wallData, openings]);

  const handlePointerMove = useCallback(() => {
    if (!isActive) return;
    setHover(findWallHit());
  }, [isActive, findWallHit]);

  const handlePointerDown = useCallback(() => {
    if (!isActive || !hover || !hover.valid) return;
    addOpening({
      id: crypto.randomUUID(),
      wallId: hover.wallId,
      type: 'door',
      position: hover.position,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      sillHeight: DOOR_SILL,
    });
    setHover(null);
  }, [isActive, hover, addOpening]);

  if (!isActive) return null;

  return (
    <group onPointerMove={handlePointerMove} onPointerDown={handlePointerDown}>
      {/* Invisible ground plane for raycasting fallback */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      {/* Preview box at hover position */}
      {hover && (
        <mesh
          position={[
            hover.worldPos.x,
            DOOR_SILL + DOOR_HEIGHT / 2,
            hover.worldPos.z,
          ]}
          rotation={[0, -hover.angle, 0]}
        >
          <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.08]} />
          <meshStandardMaterial
            color={hover.valid ? '#1565C0' : '#999999'}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
