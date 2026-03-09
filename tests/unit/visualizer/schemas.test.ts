/**
 * Visualization Schema Tests
 * Tests for Zod schemas used in AI visualization feature
 */

import { describe, it, expect } from 'vitest';
import {
  visualizationRequestSchema,
  roomTypeSchema,
  designStyleSchema,
} from '@/lib/schemas/visualization';
import { VisualizationRoomAnalysisSchema } from '@/lib/ai/photo-analyzer';
import { DesignIntentSchema, VisualizationContextSchema } from '@/lib/schemas/visualizer-extraction';

describe('Visualization Schemas', () => {
  describe('roomTypeSchema', () => {
    it('accepts all valid room types', () => {
      const validTypes = ['kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior'];
      validTypes.forEach(type => {
        expect(() => roomTypeSchema.parse(type)).not.toThrow();
      });
    });

    it('rejects invalid room types', () => {
      expect(() => roomTypeSchema.parse('garage')).toThrow();
      expect(() => roomTypeSchema.parse('')).toThrow();
      expect(() => roomTypeSchema.parse('office')).toThrow();
    });
  });

  describe('designStyleSchema', () => {
    it('accepts all valid design styles', () => {
      const validStyles = ['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary'];
      validStyles.forEach(style => {
        expect(() => designStyleSchema.parse(style)).not.toThrow();
      });
    });

    it('rejects invalid design styles', () => {
      expect(() => designStyleSchema.parse('victorian')).toThrow();
      expect(() => designStyleSchema.parse('')).toThrow();
      expect(() => designStyleSchema.parse('bohemian')).toThrow();
    });
  });

  describe('visualizationRequestSchema', () => {
    it('validates complete request', () => {
      const validRequest = {
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
        roomType: 'kitchen',
        style: 'modern',
        constraints: 'Keep existing cabinets',
        count: 4,
      };
      expect(() => visualizationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('requires image', () => {
      expect(() => visualizationRequestSchema.parse({
        roomType: 'kitchen',
        style: 'modern',
      })).toThrow();
    });

    it('requires roomType', () => {
      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        style: 'modern',
      })).toThrow();
    });

    it('requires style', () => {
      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
      })).toThrow();
    });

    it('defaults count to 4', () => {
      const result = visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
        style: 'modern',
      });
      expect(result.count).toBe(4);
    });

    it('accepts count between 1 and 4', () => {
      [1, 2, 3, 4].forEach(count => {
        const result = visualizationRequestSchema.parse({
          image: 'data:image/png;base64,test',
          roomType: 'kitchen',
          style: 'modern',
          count,
        });
        expect(result.count).toBe(count);
      });
    });

    it('rejects count outside 1-4 range', () => {
      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
        style: 'modern',
        count: 0,
      })).toThrow();

      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
        style: 'modern',
        count: 5,
      })).toThrow();
    });

    it('validates constraints max length', () => {
      const longConstraints = 'a'.repeat(501);
      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
        style: 'modern',
        constraints: longConstraints,
      })).toThrow();
    });

    it('accepts constraints at max length', () => {
      const maxConstraints = 'a'.repeat(500);
      expect(() => visualizationRequestSchema.parse({
        image: 'data:image/png;base64,test',
        roomType: 'kitchen',
        style: 'modern',
        constraints: maxConstraints,
      })).not.toThrow();
    });
  });

  describe('VisualizationRoomAnalysisSchema', () => {
    it('validates complete photo analysis output', () => {
      const validAnalysis = {
        roomType: 'kitchen',
        currentCondition: 'dated',
        structuralElements: ['load-bearing wall on left', 'window on north wall'],
        identifiedFixtures: ['island with seating', 'corner sink', 'gas range'],
        layoutType: 'L-shaped',
        lightingConditions: 'natural light from window on right, afternoon sun',
        perspectiveNotes: 'wide angle from doorway, standing height',
        preservationConstraints: ['window positions', 'plumbing rough-in'],
        confidenceScore: 0.85,
        currentStyle: null,
        estimatedDimensions: null,
        potentialFocalPoints: null,
        wallCount: null,
        wallDimensions: null,
        estimatedCeilingHeight: null,
        spatialZones: null,
        openings: null,
        architecturalLines: null,
        furnishingLevel: null,
        furnitureInventory: null,
      };
      expect(() => VisualizationRoomAnalysisSchema.parse(validAnalysis)).not.toThrow();
    });

    it('accepts optional fields', () => {
      const withOptionals = {
        roomType: 'kitchen',
        currentCondition: 'good',
        structuralElements: ['wall'],
        identifiedFixtures: ['sink'],
        layoutType: 'open',
        lightingConditions: 'bright',
        perspectiveNotes: 'front view',
        preservationConstraints: [],
        confidenceScore: 0.9,
        currentStyle: 'traditional',
        estimatedDimensions: '12x14 feet',
        potentialFocalPoints: ['island', 'bay window'],
        wallCount: 3,
        wallDimensions: [{ wall: 'left wall', estimatedLength: '~12 feet', hasWindow: true, hasDoor: false }],
        estimatedCeilingHeight: '~9 feet',
        spatialZones: [{ name: 'cooking zone', description: 'stove and prep area', approximateLocation: 'left third' }],
        openings: [{ type: 'window' as const, wall: 'left wall', approximateSize: '36x48 inches', approximatePosition: 'centered' }],
        architecturalLines: { dominantDirection: 'horizontal', vanishingPointDescription: 'centered', symmetryAxis: null },
        furnishingLevel: 'moderate' as const,
        furnitureInventory: [
          { item: 'oak dining table', location: 'centre of room', condition: 'good' as const, isBuiltIn: false, suitability: 'replace' as const, reason: 'dated style' },
        ],
      };
      expect(() => VisualizationRoomAnalysisSchema.parse(withOptionals)).not.toThrow();
    });

    it('requires confidence between 0 and 1', () => {
      const invalid = {
        roomType: 'kitchen',
        currentCondition: 'good',
        structuralElements: [],
        identifiedFixtures: [],
        layoutType: 'open',
        lightingConditions: 'bright',
        perspectiveNotes: 'front view',
        preservationConstraints: [],
        confidenceScore: 1.5,
        currentStyle: null,
        estimatedDimensions: null,
        potentialFocalPoints: null,
        wallCount: null,
        wallDimensions: null,
        estimatedCeilingHeight: null,
        spatialZones: null,
        openings: null,
        architecturalLines: null,
      };
      expect(() => VisualizationRoomAnalysisSchema.parse(invalid)).toThrow();

      const negative = { ...invalid, confidenceScore: -0.1 };
      expect(() => VisualizationRoomAnalysisSchema.parse(negative)).toThrow();
    });

    it('validates currentCondition enum', () => {
      const baseAnalysis = {
        roomType: 'kitchen',
        structuralElements: [],
        identifiedFixtures: [],
        layoutType: 'open',
        lightingConditions: 'bright',
        perspectiveNotes: 'front view',
        preservationConstraints: [],
        confidenceScore: 0.8,
        currentStyle: null,
        estimatedDimensions: null,
        potentialFocalPoints: null,
        wallCount: null,
        wallDimensions: null,
        estimatedCeilingHeight: null,
        spatialZones: null,
        openings: null,
        architecturalLines: null,
        furnishingLevel: null,
        furnitureInventory: null,
      };

      ['excellent', 'good', 'dated', 'needs_renovation'].forEach(condition => {
        expect(() => VisualizationRoomAnalysisSchema.parse({
          ...baseAnalysis,
          currentCondition: condition,
        })).not.toThrow();
      });

      expect(() => VisualizationRoomAnalysisSchema.parse({
        ...baseAnalysis,
        currentCondition: 'terrible',
      })).toThrow();
    });
  });

  describe('DesignIntentSchema', () => {
    it('validates design intent from conversation', () => {
      const validIntent = {
        desiredChanges: ['new quartz countertops', 'modern backsplash', 'updated lighting'],
        constraintsToPreserve: ['existing cabinet boxes', 'appliance locations'],
        materialPreferences: ['quartz', 'subway tile', 'brushed nickel'],
      };
      expect(() => DesignIntentSchema.parse(validIntent)).not.toThrow();
    });

    it('requires desiredChanges and constraintsToPreserve arrays', () => {
      expect(() => DesignIntentSchema.parse({
        constraintsToPreserve: [],
      })).toThrow();

      expect(() => DesignIntentSchema.parse({
        desiredChanges: [],
      })).toThrow();
    });

    it('accepts empty arrays for required fields', () => {
      expect(() => DesignIntentSchema.parse({
        desiredChanges: [],
        constraintsToPreserve: [],
      })).not.toThrow();
    });

    it('accepts all optional fields', () => {
      const fullIntent = {
        desiredChanges: ['new counters'],
        constraintsToPreserve: ['cabinets'],
        stylePreference: 'modern',
        materialPreferences: ['marble'],
        budgetIndicators: ['mid-range'],
        timelineIndicators: ['spring project'],
        priorities: ['countertops', 'lighting'],
        confidenceScore: 0.75,
      };
      expect(() => DesignIntentSchema.parse(fullIntent)).not.toThrow();
    });
  });

  describe('VisualizationContextSchema', () => {
    it('validates complete visualization context', () => {
      const validContext = {
        roomType: 'kitchen',
        style: 'modern',
        designIntent: {
          desiredChanges: ['new counters'],
          constraintsToPreserve: ['cabinets'],
        },
        conversationMode: 'quick',
      };
      expect(() => VisualizationContextSchema.parse(validContext)).not.toThrow();
    });

    it('validates conversation mode enum', () => {
      const baseContext = {
        roomType: 'kitchen',
        style: 'modern',
        designIntent: {
          desiredChanges: [],
          constraintsToPreserve: [],
        },
      };

      expect(() => VisualizationContextSchema.parse({
        ...baseContext,
        conversationMode: 'quick',
      })).not.toThrow();

      expect(() => VisualizationContextSchema.parse({
        ...baseContext,
        conversationMode: 'conversation',
      })).not.toThrow();

      expect(() => VisualizationContextSchema.parse({
        ...baseContext,
        conversationMode: 'chat', // invalid
      })).toThrow();
    });

    it('defaults conversationMode to quick', () => {
      const result = VisualizationContextSchema.parse({
        roomType: 'bathroom',
        style: 'farmhouse',
        designIntent: {
          desiredChanges: [],
          constraintsToPreserve: [],
        },
      });
      expect(result.conversationMode).toBe('quick');
    });
  });
});
