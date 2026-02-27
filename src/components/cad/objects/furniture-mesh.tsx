'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { Edges, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { PlacedObject } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';
import { getFurniturePreset } from '../catalog/furniture-presets';

interface FurnitureMeshProps {
  object: PlacedObject;
}

const DEFAULT_DIMS = { x: 1, y: 1, z: 1 };
const DEFAULT_COLOR = '#999999';

export function FurnitureMesh({ object }: FurnitureMeshProps) {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const selectedId = useDrawingStore((s) => s.selectedId);
  const selectObject = useDrawingStore((s) => s.selectObject);

  const preset = getFurniturePreset(object.catalogId);
  const dims = preset?.dimensions ?? DEFAULT_DIMS;
  const color = preset?.color ?? DEFAULT_COLOR;
  const isSelected = selectedId === object.id;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    selectObject(object.id);
  }

  const scaledDims = {
    x: dims.x * object.scale.x,
    y: dims.y * object.scale.y,
    z: dims.z * object.scale.z,
  };

  return (
    <mesh
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      onClick={handleClick}
    >
      <boxGeometry args={[scaledDims.x, scaledDims.y, scaledDims.z]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? '#1565C0' : '#000000'}
        emissiveIntensity={isSelected ? 0.2 : 0}
      />
      <Edges color={isSelected ? '#1565C0' : '#666666'} />
      <Html position={[0, scaledDims.y / 2 + 0.3, 0]} center>
        <div className="text-xs bg-black/70 text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
          {object.name}
        </div>
      </Html>
    </mesh>
  );
}
