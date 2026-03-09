import type { ComponentType } from 'react';
import type { SectionBaseProps, SectionId } from './section-types';

export type SectionComponent = ComponentType<SectionBaseProps & Record<string, unknown>>;

const REGISTRY = new Map<string, SectionComponent>();

export function registerSection(id: SectionId, component: SectionComponent) {
  REGISTRY.set(id, component);
}

export function getSection(id: SectionId): SectionComponent | null {
  return REGISTRY.get(id) ?? null;
}

export function listSections(): SectionId[] {
  return Array.from(REGISTRY.keys()) as SectionId[];
}
