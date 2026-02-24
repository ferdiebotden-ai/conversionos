/**
 * Advanced Prompt Builder for AI Visualizations
 * 6-part structured prompts for high-quality renovation renders
 */

import {
  type RoomType,
  type DesignStyle,
  STYLE_DESCRIPTIONS,
  ROOM_CONTEXTS,
} from '@/lib/schemas/visualization';
import type { RoomAnalysis } from './photo-analyzer';

/**
 * Input data for building renovation prompts
 */
export interface RenovationPromptData {
  roomType: RoomType;
  style: DesignStyle;
  constraints?: string;
  variationIndex?: number;
  /** Photo analysis from GPT Vision (optional but improves quality) */
  photoAnalysis?: RoomAnalysis;
  /** Extracted design intent from conversation (optional) */
  designIntent?: {
    desiredChanges: string[];
    constraintsToPreserve: string[];
    materialPreferences?: string[];
  };
  /** Whether a depth map is included in reference images (Phase 2) */
  hasDepthMap?: boolean;
  /** Whether an edge map is included in reference images (Phase 2) */
  hasEdgeMap?: boolean;
  /** Depth range from depth estimation (Phase 2) */
  depthRange?: { min: number; max: number };
  /** Custom room type description when user selected 'other' */
  customRoomType?: string;
  /** Custom style description when user selected 'other' */
  customStyle?: string;
  /** AI-generated summary of voice consultation with Emma */
  voicePreferencesSummary?: string;
}

/**
 * Detailed style descriptions with specific material and finish recommendations
 */
const DETAILED_STYLE_DESCRIPTIONS: Record<DesignStyle, {
  narrative: string;
  materials: string[];
  colors: string[];
  finishes: string[];
  fixtures: string[];
  lighting: string;
}> = {
  modern: {
    narrative: 'A sophisticated modern aesthetic featuring clean horizontal lines, open floor plans, and a seamless blend of indoor-outdoor living. The space emphasizes geometric precision with flat surfaces and minimal ornamentation.',
    materials: ['polished concrete', 'tempered glass', 'brushed stainless steel', 'engineered quartz', 'porcelain tiles'],
    colors: ['crisp white', 'warm gray', 'charcoal', 'black accents', 'occasional navy or forest green'],
    finishes: ['matte lacquer', 'high-gloss paint', 'brushed metal', 'honed stone'],
    fixtures: ['frameless cabinets', 'handleless drawers', 'integrated appliances', 'waterfall countertops'],
    lighting: 'recessed LED lighting, linear pendant fixtures, and strategic accent lighting',
  },
  traditional: {
    narrative: 'A timeless traditional aesthetic rooted in classical European design principles. The space features elegant symmetry, rich woodwork, and refined details that create a sense of established comfort and sophistication.',
    materials: ['solid hardwood', 'natural stone', 'ceramic tile', 'crown molding', 'wainscoting panels'],
    colors: ['warm cream', 'rich burgundy', 'forest green', 'navy blue', 'warm gold accents'],
    finishes: ['stained wood', 'glazed ceramics', 'polished brass', 'antique bronze'],
    fixtures: ['raised panel cabinets', 'decorative hardware', 'apron-front sinks', 'ornate faucets'],
    lighting: 'crystal chandeliers, brass sconces, and under-cabinet task lighting',
  },
  farmhouse: {
    narrative: 'A warm farmhouse aesthetic that blends rustic charm with modern comfort. The space celebrates natural imperfections, handcrafted elements, and a connection to simpler times while maintaining functional practicality.',
    materials: ['reclaimed wood', 'shiplap planks', 'subway tile', 'butcher block', 'cast iron'],
    colors: ['antique white', 'soft sage green', 'barn red accents', 'natural wood tones', 'muted blue'],
    finishes: ['distressed wood', 'matte paint', 'oil-rubbed bronze', 'galvanized metal'],
    fixtures: ['farmhouse sinks', 'open shelving', 'barn door hardware', 'vintage-style faucets'],
    lighting: 'mason jar pendants, wrought iron chandeliers, and Edison bulb fixtures',
  },
  industrial: {
    narrative: 'A bold industrial aesthetic inspired by converted warehouses and urban lofts. The space proudly exposes structural elements and celebrates raw materials, creating an edgy yet sophisticated atmosphere.',
    materials: ['exposed brick', 'raw concrete', 'blackened steel', 'reclaimed timber', 'weathered metal'],
    colors: ['charcoal gray', 'rust orange accents', 'matte black', 'warm wood tones', 'cement gray'],
    finishes: ['raw steel', 'brushed concrete', 'oxidized metal', 'sealed brick'],
    fixtures: ['metal-frame cabinets', 'pipe shelving', 'commercial-style faucets', 'wire mesh accents'],
    lighting: 'exposed Edison bulbs, metal cage pendants, and track lighting on exposed conduit',
  },
  minimalist: {
    narrative: 'A serene minimalist aesthetic that elevates simplicity to an art form. Every element serves a purpose, with clutter-free surfaces, hidden storage, and a focus on quality over quantity creating a calming sanctuary.',
    materials: ['white oak', 'seamless quartz', 'frosted glass', 'ultra-matte surfaces', 'invisible hinges'],
    colors: ['pure white', 'warm greige', 'soft black', 'natural wood', 'single accent color'],
    finishes: ['ultra-matte paint', 'satin wood', 'finger-pull cabinets', 'seamless transitions'],
    fixtures: ['handleless cabinets', 'integrated appliances', 'wall-mounted fixtures', 'hidden storage'],
    lighting: 'concealed LED strips, minimal downlights, and large windows for natural light',
  },
  contemporary: {
    narrative: 'A dynamic contemporary aesthetic that embraces current design trends while maintaining timeless appeal. The space features bold statements, artistic elements, and a curated mix of textures and materials.',
    materials: ['mixed metals', 'textured tiles', 'statement stone', 'velvet fabrics', 'sculptural elements'],
    colors: ['bold jewel tones', 'dramatic black', 'warm metallics', 'deep teal', 'terracotta accents'],
    finishes: ['high-gloss lacquer', 'hammered metal', 'textured wallcovering', 'mixed sheens'],
    fixtures: ['sculptural hardware', 'statement faucets', 'artistic light fixtures', 'custom built-ins'],
    lighting: 'statement pendant clusters, sculptural chandeliers, and dramatic accent lighting',
  },
};

/**
 * Room-specific renovation focus areas with detailed guidance
 */
const DETAILED_ROOM_CONTEXTS: Record<RoomType, {
  primary: string[];
  secondary: string[];
  preservationPriority: string[];
}> = {
  kitchen: {
    primary: ['cabinet doors and drawer fronts', 'countertop material and edge profile', 'backsplash tile pattern and grout color', 'lighting fixtures above island and work areas'],
    secondary: ['hardware and pulls', 'faucet style', 'open shelving content', 'decorative accessories'],
    preservationPriority: ['cabinet box locations', 'appliance positions', 'window placement', 'ceiling height'],
  },
  bathroom: {
    primary: ['vanity cabinet and countertop', 'wall and floor tile pattern', 'shower enclosure and fixtures', 'mirror and lighting'],
    secondary: ['hardware and accessories', 'towel storage', 'decorative elements', 'plant life'],
    preservationPriority: ['plumbing fixture locations', 'window position', 'shower/tub footprint', 'door swing'],
  },
  living_room: {
    primary: ['seating arrangement and upholstery', 'accent wall treatment', 'area rug pattern and placement', 'window treatments'],
    secondary: ['coffee table styling', 'artwork and wall decor', 'throw pillows and textiles', 'plants and accessories'],
    preservationPriority: ['room dimensions', 'window locations', 'fireplace position', 'ceiling features'],
  },
  bedroom: {
    primary: ['headboard and bed frame style', 'bedding and linens', 'nightstand and dresser design', 'window treatments'],
    secondary: ['accent lighting', 'artwork', 'throw pillows', 'decorative accessories'],
    preservationPriority: ['room layout', 'closet doors', 'window positions', 'ceiling height'],
  },
  basement: {
    primary: ['flooring material and pattern', 'ceiling treatment', 'lighting strategy', 'wall finish'],
    secondary: ['built-in storage', 'entertainment area', 'seating arrangement', 'accent decor'],
    preservationPriority: ['ceiling height', 'column locations', 'window wells', 'stairway position'],
  },
  dining_room: {
    primary: ['dining table and chairs', 'chandelier or pendant fixture', 'wall treatment', 'sideboard or buffet'],
    secondary: ['table centerpiece', 'wall art', 'window treatments', 'decorative accessories'],
    preservationPriority: ['room dimensions', 'window placement', 'door locations', 'ceiling height'],
  },
  exterior: {
    primary: ['siding and facade treatment', 'front door and entry', 'windows and trim', 'roofing materials'],
    secondary: ['landscaping', 'lighting fixtures', 'deck or patio', 'railings and fencing'],
    preservationPriority: ['building footprint', 'roof line', 'window positions', 'structural elements'],
  },
};

/**
 * Get detailed style description with materials
 */
export function getDetailedStyleDescription(style: DesignStyle): string {
  const details = DETAILED_STYLE_DESCRIPTIONS[style];
  return `${details.narrative}

Key Materials: ${details.materials.join(', ')}
Color Palette: ${details.colors.join(', ')}
Signature Finishes: ${details.finishes.join(', ')}
Fixture Style: ${details.fixtures.join(', ')}
Lighting Approach: ${details.lighting}`;
}

/**
 * Get material specifications based on changes requested
 */
export function getMaterialSpecifications(
  style: DesignStyle,
  desiredChanges?: string[]
): string {
  const styleDetails = DETAILED_STYLE_DESCRIPTIONS[style];

  let specs = `MATERIAL SPECIFICATIONS for ${style.toUpperCase()} style:

Primary Materials: ${styleDetails.materials.slice(0, 3).join(', ')}
Accent Materials: ${styleDetails.materials.slice(3).join(', ')}
Finish Quality: Professional-grade, photorealistic`;

  if (desiredChanges && desiredChanges.length > 0) {
    specs += `

User-Specified Changes:
${desiredChanges.map(c => `- ${c}`).join('\n')}`;
  }

  return specs;
}

/**
 * Build a comprehensive 6-part renovation prompt
 */
export function buildRenovationPrompt(data: RenovationPromptData): string {
  const {
    roomType,
    style,
    constraints,
    variationIndex = 0,
    photoAnalysis,
    designIntent,
  } = data;

  // Handle custom room/style types — use lookup tables only for known types
  const isCustomRoom = !!data.customRoomType;
  const isCustomStyle = !!data.customStyle;
  const styleDetails = isCustomStyle ? null : DETAILED_STYLE_DESCRIPTIONS[style];
  const roomDetails = isCustomRoom ? null : DETAILED_ROOM_CONTEXTS[roomType];
  const basicStyleDesc = isCustomStyle ? data.customStyle! : STYLE_DESCRIPTIONS[style];
  const basicRoomContext = isCustomRoom ? data.customRoomType! : ROOM_CONTEXTS[roomType];

  const displayRoomType = isCustomRoom ? data.customRoomType! : roomType.replace('_', ' ');
  const displayStyle = isCustomStyle ? data.customStyle! : style;

  // Build the 6-part structured prompt
  const promptParts: string[] = [];

  // PART 1: Scene Description (narrative, not keyword list)
  if (isCustomStyle && styleDetails === null) {
    promptParts.push(`=== SCENE DESCRIPTION ===
Transform this ${displayRoomType} into a ${displayStyle} design renovation.
The user has described a custom style: "${data.customStyle}". Interpret this style description creatively and apply it consistently throughout the space.

The renovation should feel like a professional interior design transformation, maintaining the soul of the original space while expressing the "${displayStyle}" aesthetic. Focus on: ${basicRoomContext}`);
  } else {
    promptParts.push(`=== SCENE DESCRIPTION ===
Transform this ${displayRoomType} into a ${displayStyle} design renovation.
${styleDetails!.narrative}

The renovation should feel like a professional interior design transformation, maintaining the soul of the original space while elevating it to ${displayStyle} sophistication. Focus on: ${basicRoomContext}`);
  }

  // PART 2: Structural Preservation (CRITICAL)
  let structuralSection = `=== STRUCTURAL PRESERVATION (CRITICAL) ===
ABSOLUTE REQUIREMENTS - These MUST remain UNCHANGED:
- Room dimensions, walls, and ceiling height
- All window and door positions
- Camera angle and perspective from original photo
- Floor plan and traffic flow patterns`;

  if (photoAnalysis) {
    if (photoAnalysis.structuralElements.length > 0) {
      structuralSection += `\n\nIdentified Structural Elements to Preserve:
${photoAnalysis.structuralElements.map(e => `- ${e}`).join('\n')}`;
    }
    if (photoAnalysis.preservationConstraints.length > 0) {
      structuralSection += `\n\nPhoto Analysis Preservation Notes:
${photoAnalysis.preservationConstraints.map(c => `- ${c}`).join('\n')}`;
    }
  }

  if (roomDetails) {
    structuralSection += `\n\nRoom-Specific Preservation Priority:
${roomDetails.preservationPriority.map(p => `- ${p}`).join('\n')}`;
  } else {
    structuralSection += `\n\nGeneral Preservation Priority:
- Room dimensions and layout
- Window and door positions
- Ceiling height and features
- Structural elements`;
  }

  // Add spatial analysis data when available
  if (photoAnalysis) {
    if (photoAnalysis.wallCount != null && photoAnalysis.wallDimensions?.length) {
      structuralSection += `\n\nWall Dimensions (${photoAnalysis.wallCount} walls visible):
${photoAnalysis.wallDimensions.map(w => `- ${w.wall}: ~${w.estimatedLength}${w.hasWindow ? ' [has window]' : ''}${w.hasDoor ? ' [has door]' : ''}`).join('\n')}`;
    }

    if (photoAnalysis.openings?.length) {
      structuralSection += `\n\nDoor/Window Positions:
${photoAnalysis.openings.map(o => `- ${o.type} on ${o.wall}: ${o.approximateSize}, ${o.approximatePosition}`).join('\n')}`;
    }

    if (photoAnalysis.spatialZones?.length) {
      structuralSection += `\n\nSpatial Zone Arrangement:
${photoAnalysis.spatialZones.map(z => `- ${z.name} (${z.approximateLocation}): ${z.description}`).join('\n')}`;
    }

    if (photoAnalysis.architecturalLines) {
      const lines = photoAnalysis.architecturalLines;
      structuralSection += `\n\nArchitectural Line Guidance:
- Dominant lines: ${lines.dominantDirection}
- Vanishing point: ${lines.vanishingPointDescription}`;
      if (lines.symmetryAxis) {
        structuralSection += `\n- Symmetry axis: ${lines.symmetryAxis}`;
      }
    }

    if (photoAnalysis.estimatedCeilingHeight) {
      structuralSection += `\n- Ceiling height: ${photoAnalysis.estimatedCeilingHeight}`;
    }
  }

  promptParts.push(structuralSection);

  // PART 2.5: Structural Conditioning (when depth/edge maps are provided)
  if (data.hasDepthMap || data.hasEdgeMap) {
    let conditioningSection = `=== STRUCTURAL CONDITIONING ===`;
    if (data.hasDepthMap) {
      conditioningSection += `\nDEPTH MAP: Lighter areas = closer to camera, darker areas = farther away. Preserve these depth relationships exactly in the generated image.`;
      if (data.depthRange) {
        conditioningSection += ` Depth range: ${data.depthRange.min.toFixed(1)}m to ${data.depthRange.max.toFixed(1)}m.`;
      }
    }
    if (data.hasEdgeMap) {
      conditioningSection += `\nEDGE MAP: Lines represent architectural features (walls, counters, windows, doors). ALL major edges must appear in the same positions in the output.`;
    }
    conditioningSection += `\nCRITICAL: The structural conditioning maps take precedence over text descriptions for spatial accuracy.`;
    promptParts.push(conditioningSection);
  }

  // PART 3: Material & Finish Specifications
  let materialsSection: string;
  if (styleDetails) {
    materialsSection = `=== MATERIAL & FINISH SPECIFICATIONS ===
Style: ${displayStyle.toUpperCase()}

Primary Materials:
${styleDetails.materials.map(m => `- ${m}`).join('\n')}

Color Palette:
${styleDetails.colors.map(c => `- ${c}`).join('\n')}

Finish Types:
${styleDetails.finishes.map(f => `- ${f}`).join('\n')}

Fixture Styles:
${styleDetails.fixtures.map(f => `- ${f}`).join('\n')}`;
  } else {
    materialsSection = `=== MATERIAL & FINISH SPECIFICATIONS ===
Custom Style: "${data.customStyle}"

Select materials, colors, finishes, and fixtures that best express the "${data.customStyle}" aesthetic described by the homeowner. Use your knowledge of interior design to choose cohesive, professional-grade options.`;
  }

  if (designIntent?.materialPreferences && designIntent.materialPreferences.length > 0) {
    materialsSection += `\n\nUser Material Preferences:
${designIntent.materialPreferences.map(m => `- ${m}`).join('\n')}`;
  }

  promptParts.push(materialsSection);

  // PART 4: Lighting Instructions
  let lightingSection = `=== LIGHTING INSTRUCTIONS ===
${styleDetails ? styleDetails.lighting : `Select lighting appropriate for a "${data.customStyle}" design aesthetic.`}`;

  if (photoAnalysis?.lightingConditions) {
    lightingSection += `\n\nOriginal Photo Lighting Analysis:
${photoAnalysis.lightingConditions}
IMPORTANT: Match the direction, intensity, and color temperature of the original lighting.`;
  } else {
    lightingSection += `\n\nMatch the original photo's natural lighting direction and intensity.
Preserve existing shadow patterns and light sources.`;
  }

  promptParts.push(lightingSection);

  // PART 5: Perspective Instructions
  let perspectiveSection = `=== PERSPECTIVE INSTRUCTIONS ===
Maintain the EXACT camera position and viewing angle from the original photograph.`;

  if (photoAnalysis?.perspectiveNotes) {
    perspectiveSection += `\n\nPhoto Perspective Analysis:
${photoAnalysis.perspectiveNotes}`;
  }

  perspectiveSection += `\n\nThe viewer should feel they are standing in the same position, seeing the same room after a professional renovation - not a different room entirely.`;

  promptParts.push(perspectiveSection);

  // PART 6: Quality Modifiers
  let qualitySection = `=== OUTPUT QUALITY REQUIREMENTS ===
- Photorealistic rendering quality suitable for client presentation
- 2048x2048 resolution output
- Professional interior photography aesthetic
- Crisp details on materials and textures
- Natural color reproduction
- No artifacts, distortions, or AI-typical inconsistencies
- Publication-ready image quality`;

  promptParts.push(qualitySection);

  // Add user constraints if provided
  if (constraints && constraints.trim()) {
    promptParts.push(`=== USER PREFERENCES ===
${constraints}`);
  }

  // Add design intent from conversation if provided
  if (designIntent) {
    let intentSection = `=== DESIGN INTENT (from consultation) ===`;

    if (designIntent.desiredChanges.length > 0) {
      intentSection += `\n\nDesired Changes:
${designIntent.desiredChanges.map(c => `- ${c}`).join('\n')}`;
    }

    if (designIntent.constraintsToPreserve.length > 0) {
      intentSection += `\n\nElements to Preserve:
${designIntent.constraintsToPreserve.map(c => `- ${c}`).join('\n')}`;
    }

    promptParts.push(intentSection);
  }

  // Add voice consultation context if available
  if (data.voicePreferencesSummary) {
    promptParts.push(`=== VOICE CONSULTATION CONTEXT ===
The homeowner had a voice consultation with Emma. Here is a summary of their preferences:
${data.voicePreferencesSummary}

Incorporate these voiced preferences into the design, giving them equal weight to any text-based preferences above.`);
  }

  // Add variation hints for multiple concepts
  if (variationIndex > 0) {
    const variations = [
      'Explore a warmer color temperature while maintaining the core style. Emphasize cozy, inviting textures.',
      'Feature natural textures and organic materials prominently. Bring in subtle biophilic elements.',
      'Take a more streamlined approach with extra emphasis on clean lines and negative space.',
      'Incorporate subtle accent colors and decorative details that add personality without overwhelming.',
    ];
    const variationHint = variations[variationIndex % variations.length];
    promptParts.push(`=== VARIATION ${variationIndex + 1} ===
${variationHint}`);
  }

  // Final instruction
  promptParts.push(`=== GENERATE ===
Create a single photorealistic visualization showing this ${displayRoomType} after a professional ${displayStyle} renovation. Output an image.`);

  return promptParts.join('\n\n');
}

/**
 * Build a simpler prompt for quick mode (maintains compatibility)
 */
export function buildQuickModePrompt(
  roomType: RoomType,
  style: DesignStyle,
  constraints?: string,
  variationIndex: number = 0
): string {
  const styleDesc = STYLE_DESCRIPTIONS[style];
  const roomContext = ROOM_CONTEXTS[roomType];

  let prompt = `TASK: Transform this ${roomType.replace('_', ' ')} into a ${style} design renovation.

STYLE CHARACTERISTICS:
${styleDesc}

ROOM FOCUS AREAS:
${roomContext}`;

  if (constraints && constraints.trim()) {
    prompt += `

USER PREFERENCES:
${constraints}`;
  }

  prompt += `

CRITICAL REQUIREMENTS:
- Maintain the EXACT room dimensions, layout, and architecture
- Preserve window/door positions exactly as shown
- Keep the SAME camera perspective and angle
- Apply ${style} aesthetic to surfaces, fixtures, and decor
- Ensure photorealistic quality suitable for client presentation
- Lighting should match the original room's natural light sources`;

  if (variationIndex > 0) {
    const variations = [
      'Explore a slightly warmer color temperature while staying true to the style.',
      'Emphasize natural textures and organic materials in this variation.',
      'Focus on clean lines and a more streamlined approach.',
      'Incorporate subtle accent colors and decorative details.',
    ];
    const variationHint = variations[variationIndex % variations.length];
    prompt += `

VARIATION ${variationIndex + 1}: ${variationHint}`;
  }

  prompt += `

Generate a single photorealistic visualization showing this room after a professional ${style} renovation. Output an image.`;

  return prompt;
}
