/**
 * Design Preferences Schema
 * Unified schema for the streamlined visualizer form
 * Combines room type, style, text preferences, and voice consultation data
 */

import { z } from 'zod';
import { roomTypeSchema, designStyleSchema } from './visualization';

// Extended room type that supports custom/other
export const roomTypeSelectionSchema = z.union([roomTypeSchema, z.literal('other')]);
export type RoomTypeSelection = z.infer<typeof roomTypeSelectionSchema>;

// Extended design style that supports custom/other
export const designStyleSelectionSchema = z.union([designStyleSchema, z.literal('other')]);
export type DesignStyleSelection = z.infer<typeof designStyleSelectionSchema>;

// Design intent (from text preferences)
export const designIntentSchema = z.object({
  desiredChanges: z.array(z.string()),
  constraintsToPreserve: z.array(z.string()),
  materialPreferences: z.array(z.string()),
});

export type DesignIntent = z.infer<typeof designIntentSchema>;

// Photo analysis reference (matches RoomAnalysis structure)
const photoAnalysisSchema = z.record(z.string(), z.unknown());

// Unified design preferences — the single source of truth for the form
export const designPreferencesSchema = z.object({
  // Room selection
  roomType: roomTypeSelectionSchema,
  customRoomType: z.string().max(100).optional(),

  // Style selection
  style: designStyleSelectionSchema,
  customStyle: z.string().max(100).optional(),

  // Text preferences (free-text input from the form)
  textPreferences: z.string().max(500).default(''),

  // Photo analysis (from GPT Vision, run async after upload)
  photoAnalysis: photoAnalysisSchema.optional(),

  // Merged design intent (computed from text + voice + photo analysis)
  designIntent: designIntentSchema.optional(),
});

export type DesignPreferences = z.infer<typeof designPreferencesSchema>;

/**
 * Merge text preferences, voice preferences, and photo analysis into a unified design intent
 */
export function mergeDesignIntent(prefs: DesignPreferences): DesignIntent {
  const desiredChanges: string[] = [];
  const constraintsToPreserve: string[] = [];
  const materialPreferences: string[] = [];

  // From text preferences
  if (prefs.textPreferences.trim()) {
    desiredChanges.push(prefs.textPreferences.trim());
  }

  // From existing design intent (if already partially built)
  if (prefs.designIntent) {
    desiredChanges.push(...prefs.designIntent.desiredChanges);
    constraintsToPreserve.push(...prefs.designIntent.constraintsToPreserve);
    materialPreferences.push(...prefs.designIntent.materialPreferences);
  }

  // Deduplicate
  return {
    desiredChanges: [...new Set(desiredChanges)],
    constraintsToPreserve: [...new Set(constraintsToPreserve)],
    materialPreferences: [...new Set(materialPreferences)],
  };
}

/**
 * Get the display-friendly room type label
 */
export function getRoomTypeLabel(prefs: DesignPreferences): string {
  if (prefs.roomType === 'other') {
    return prefs.customRoomType || 'Custom Room';
  }
  return prefs.roomType.replace(/_/g, ' ');
}

/**
 * Get the display-friendly style label
 */
export function getStyleLabel(prefs: DesignPreferences): string {
  if (prefs.style === 'other') {
    return prefs.customStyle || 'Custom Style';
  }
  return prefs.style.charAt(0).toUpperCase() + prefs.style.slice(1);
}
