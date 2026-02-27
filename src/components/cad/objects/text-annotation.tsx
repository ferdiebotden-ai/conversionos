'use client';
// Hardcoded #1565C0 colours in this file are intentional 3D rendering colours, not brand colours.

import { Line, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { TextAnnotation } from '../state/drawing-types';
import { useDrawingStore } from '../state/drawing-store';

interface TextAnnotationMeshProps {
  annotation: TextAnnotation;
}

export function TextAnnotationMesh({ annotation }: TextAnnotationMeshProps) {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const selectedId = useDrawingStore((s) => s.selectedId);
  const selectObject = useDrawingStore((s) => s.selectObject);

  const isSelected = selectedId === annotation.id;

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    selectObject(annotation.id);
  }

  const leaderColor = isSelected ? '#1565C0' : '#666666';

  return (
    <group onClick={handleClick}>
      {/* Leader line */}
      {annotation.hasLeader && annotation.leaderTarget && (
        <Line
          points={[
            [annotation.position.x, 0.02, annotation.position.z],
            [annotation.leaderTarget.x, 0.02, annotation.leaderTarget.z],
          ]}
          color={leaderColor}
          lineWidth={1}
          dashed
          dashSize={0.1}
          gapSize={0.05}
        />
      )}

      {/* Text label */}
      <Html position={[annotation.position.x, 0.1, annotation.position.z]} center>
        <div
          className={`text-xs px-2 py-1 rounded whitespace-pre-wrap pointer-events-auto cursor-pointer max-w-[200px] ${
            isSelected
              ? 'bg-red-50 border border-red-300 text-red-800'
              : 'bg-yellow-50 border border-yellow-300 text-gray-800'
          }`}
        >
          {annotation.text}
        </div>
      </Html>
    </group>
  );
}
