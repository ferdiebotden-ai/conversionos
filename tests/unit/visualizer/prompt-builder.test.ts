/**
 * Prompt Builder Tests
 * Tests for the 6-part structured prompt construction
 */

import { describe, it, expect } from 'vitest';
import {
  buildRenovationPrompt,
  getDetailedStyleDescription,
  getMaterialSpecifications,
  buildQuickModePrompt,
} from '@/lib/ai/prompt-builder';
import type { RoomType, DesignStyle } from '@/lib/schemas/visualization';
import type { RoomAnalysis } from '@/lib/ai/photo-analyzer';

describe('Prompt Builder', () => {
  describe('buildRenovationPrompt', () => {
    it('generates 6-part structured prompt', () => {
      const prompt = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 0,
      });

      // Should contain all 6 core parts
      expect(prompt).toContain('SCENE DESCRIPTION');
      expect(prompt).toContain('STRUCTURAL PRESERVATION');
      expect(prompt).toContain('MATERIAL');
      expect(prompt).toContain('LIGHTING');
      expect(prompt).toContain('PERSPECTIVE');
      expect(prompt).toContain('QUALITY');
      expect(prompt).toContain('GENERATE');
    });

    it('includes room type in scene description', () => {
      const prompt = buildRenovationPrompt({
        roomType: 'bathroom',
        style: 'farmhouse',
      });

      expect(prompt).toContain('bathroom');
      expect(prompt).toContain('farmhouse');
    });

    it('includes photo analysis when provided', () => {
      const photoAnalysis: Partial<RoomAnalysis> = {
        layoutType: 'L-shaped',
        lightingConditions: 'natural light from left window',
        perspectiveNotes: 'wide angle from doorway entrance',
        structuralElements: ['load-bearing wall', 'ceiling beam'],
        preservationConstraints: ['plumbing locations'],
      };

      const prompt = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 0,
        photoAnalysis: photoAnalysis as RoomAnalysis,
      });

      // Note: layoutType is not directly included in the prompt, but other fields are
      expect(prompt).toContain('natural light from left window');
      expect(prompt).toContain('wide angle from doorway entrance');
      expect(prompt).toContain('load-bearing wall');
      expect(prompt).toContain('plumbing locations');
    });

    it('includes design intent when provided', () => {
      const prompt = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 0,
        designIntent: {
          desiredChanges: ['quartz countertops', 'subway tile backsplash'],
          constraintsToPreserve: ['existing cabinet boxes'],
          materialPreferences: ['brushed nickel hardware'],
        },
      });

      expect(prompt).toContain('quartz countertops');
      expect(prompt).toContain('subway tile backsplash');
      expect(prompt).toContain('existing cabinet boxes');
      expect(prompt).toContain('brushed nickel hardware');
    });

    it('includes user constraints when provided', () => {
      const prompt = buildRenovationPrompt({
        roomType: 'living_room',
        style: 'contemporary',
        constraints: 'Keep the existing hardwood floors and fireplace',
      });

      expect(prompt).toContain('USER PREFERENCES');
      expect(prompt).toContain('Keep the existing hardwood floors and fireplace');
    });

    it('varies prompt slightly by variationIndex', () => {
      const prompt0 = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 0,
      });
      const prompt1 = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 1,
      });
      const prompt2 = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
        variationIndex: 2,
      });

      // Prompts should be different for variations
      expect(prompt0).not.toBe(prompt1);
      expect(prompt1).not.toBe(prompt2);

      // Variation prompts should have variation section
      expect(prompt1).toContain('VARIATION');
      expect(prompt2).toContain('VARIATION');

      // But base prompt should not
      expect(prompt0).not.toContain('VARIATION');
    });

    it('generates prompts for all room types', () => {
      const roomTypes: RoomType[] = ['kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior'];

      roomTypes.forEach(roomType => {
        const prompt = buildRenovationPrompt({
          roomType,
          style: 'modern',
        });

        expect(prompt.length).toBeGreaterThan(500);
        expect(prompt).toContain('SCENE DESCRIPTION');
        expect(prompt).toContain('STRUCTURAL PRESERVATION');
      });
    });

    it('generates prompts for all design styles', () => {
      const styles: DesignStyle[] = ['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary', 'transitional', 'scandinavian', 'coastal', 'mid_century_modern'];

      styles.forEach(style => {
        const prompt = buildRenovationPrompt({
          roomType: 'kitchen',
          style,
        });

        expect(prompt.length).toBeGreaterThan(500);
        expect(prompt).toContain(style);
      });
    });
  });

  describe('getDetailedStyleDescription', () => {
    it('returns description for all valid styles', () => {
      const styles: DesignStyle[] = ['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary', 'transitional', 'scandinavian', 'coastal', 'mid_century_modern'];

      styles.forEach(style => {
        const description = getDetailedStyleDescription(style);
        expect(description).toBeTruthy();
        expect(description.length).toBeGreaterThan(100);
      });
    });

    it('includes materials in description', () => {
      const description = getDetailedStyleDescription('modern');
      expect(description).toContain('Material');
    });

    it('includes color palette in description', () => {
      const description = getDetailedStyleDescription('farmhouse');
      expect(description).toContain('Color');
    });

    it('includes lighting approach in description', () => {
      const description = getDetailedStyleDescription('industrial');
      expect(description).toContain('Lighting');
    });
  });

  describe('getMaterialSpecifications', () => {
    it('returns specifications for a style', () => {
      const specs = getMaterialSpecifications('modern');

      expect(specs).toContain('MATERIAL SPECIFICATIONS');
      expect(specs).toContain('MODERN');
      expect(specs).toContain('Primary Materials');
    });

    it('includes user-specified changes when provided', () => {
      const specs = getMaterialSpecifications('contemporary', ['marble countertops', 'brass fixtures']);

      expect(specs).toContain('User-Specified Changes');
      expect(specs).toContain('marble countertops');
      expect(specs).toContain('brass fixtures');
    });

    it('handles empty changes array', () => {
      const specs = getMaterialSpecifications('minimalist', []);

      expect(specs).toContain('MATERIAL SPECIFICATIONS');
      expect(specs).not.toContain('User-Specified Changes');
    });
  });

  describe('buildQuickModePrompt', () => {
    it('generates simpler prompt than buildRenovationPrompt', () => {
      const quickPrompt = buildQuickModePrompt('kitchen', 'modern');
      const fullPrompt = buildRenovationPrompt({
        roomType: 'kitchen',
        style: 'modern',
      });

      expect(quickPrompt.length).toBeLessThan(fullPrompt.length);
    });

    it('includes style characteristics', () => {
      const prompt = buildQuickModePrompt('kitchen', 'farmhouse');

      expect(prompt).toContain('STYLE CHARACTERISTICS');
      expect(prompt).toContain('ROOM FOCUS AREAS');
    });

    it('includes constraints when provided', () => {
      const prompt = buildQuickModePrompt('bathroom', 'modern', 'Keep existing tile');

      expect(prompt).toContain('USER PREFERENCES');
      expect(prompt).toContain('Keep existing tile');
    });

    it('adds variation hints for non-zero index', () => {
      const prompt0 = buildQuickModePrompt('kitchen', 'modern', undefined, 0);
      const prompt1 = buildQuickModePrompt('kitchen', 'modern', undefined, 1);

      expect(prompt0).not.toContain('VARIATION');
      expect(prompt1).toContain('VARIATION 2');
    });

    it('includes critical requirements section', () => {
      const prompt = buildQuickModePrompt('living_room', 'traditional');

      expect(prompt).toContain('CRITICAL REQUIREMENTS');
      expect(prompt).toContain('EXACT room dimensions');
      expect(prompt).toContain('camera perspective');
    });
  });
});
