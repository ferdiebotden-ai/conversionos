/**
 * Interior Design Staging Recommendations
 * Style-specific furniture and accessory recommendations for each room type.
 * Used by the prompt builder to guide furniture replacement in AI visualizations.
 *
 * Pattern follows pricing-data.ts — pure data + helper functions, client-safe.
 */

import type { RoomType, DesignStyle } from '@/lib/schemas/visualization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StagingRecommendation {
  /** Must-have furniture pieces for the staging */
  primaryFurniture: string[];
  /** Styling elements and accessories */
  accentPieces: string[];
  /** How to arrange for optimal visual flow */
  layoutGuidance: string;
  /** What NOT to include */
  avoidList: string[];
}

// ---------------------------------------------------------------------------
// Staging Recommendations — 70 combinations (7 rooms x 10 styles)
// ---------------------------------------------------------------------------

const STAGING_RECOMMENDATIONS: Record<string, StagingRecommendation> = {
  // ===== LIVING ROOM =====
  living_room_modern: {
    primaryFurniture: [
      'low-profile sectional sofa in neutral performance fabric',
      'sculptural accent chair with slim metal legs',
      'glass-and-metal coffee table with clean geometry',
      'minimal media console in matte lacquer',
      'geometric side table in brushed steel',
    ],
    accentPieces: ['large-scale abstract wall art', 'textured area rug in neutral tones', 'architectural floor lamp', 'single statement vase'],
    layoutGuidance: 'Float the sofa away from the wall. Create a defined conversation zone centred on the coffee table. Leave ample negative space around furniture groupings.',
    avoidList: ['bulky recliners', 'heavy drapes', 'cluttered shelving', 'mismatched wood tones', 'excessive throw pillows'],
  },
  living_room_traditional: {
    primaryFurniture: [
      'rolled-arm sofa in rich upholstery fabric',
      'tufted wingback accent chair',
      'carved wood coffee table with cabriole legs',
      'antique-style console table',
      'upholstered ottoman or bench',
    ],
    accentPieces: ['framed landscape or portrait artwork', 'Persian or oriental area rug', 'table lamps with fabric shades', 'decorative bookends and leather-bound books'],
    layoutGuidance: 'Symmetrical arrangement with sofa and matching chairs flanking the coffee table. Place console table against the main wall with a table lamp on each end.',
    avoidList: ['ultra-modern pieces', 'industrial metal', 'plastic or acrylic furniture', 'neon accents', 'bare minimalism'],
  },
  living_room_farmhouse: {
    primaryFurniture: [
      'linen-slipcovered sofa in natural oatmeal',
      'distressed wood coffee table with turned legs',
      'woven accent chair in rattan or cane',
      'vintage storage bench or blanket ladder',
      'reclaimed wood console or sideboard',
    ],
    accentPieces: ['woven jute area rug', 'galvanized metal planters with greenery', 'cotton throw blankets', 'mason jar arrangement on coffee table'],
    layoutGuidance: 'Relaxed, approachable arrangement. Mix textures freely — linen, wood, metal, woven. Leave the layout slightly asymmetric for an effortless feel.',
    avoidList: ['high-gloss surfaces', 'chrome or stainless accents', 'overly formal pieces', 'synthetic materials', 'dark/heavy drapes'],
  },
  living_room_industrial: {
    primaryFurniture: [
      'deep-seated leather sofa in aged cognac or black',
      'metal-frame accent chair with canvas seat',
      'reclaimed wood coffee table on iron pipe legs',
      'metal-and-wood bookshelf unit',
      'steel-frame side table',
    ],
    accentPieces: ['vintage factory clock', 'exposed-filament floor lamp', 'distressed leather pouffe', 'abstract metal wall sculpture'],
    layoutGuidance: 'Open layout that exposes structural elements. Place heavy pieces centrally and leave perimeter clear. Use height variation — low coffee table, tall bookshelf.',
    avoidList: ['delicate fabrics', 'ornate carvings', 'pastel colours', 'overly curated accessories', 'formal drapes'],
  },
  living_room_minimalist: {
    primaryFurniture: [
      'low-profile sofa in solid neutral fabric',
      'single sculptural lounge chair',
      'simple round coffee table in white oak or marble',
      'wall-mounted media console',
      'slim nesting side tables',
    ],
    accentPieces: ['single large piece of abstract art', 'textured wool area rug', 'one statement plant in a ceramic pot', 'single floor lamp with clean silhouette'],
    layoutGuidance: 'Fewer pieces with ample breathing room. Every item must earn its place. Favour wall-mounted storage to keep floor clear. Achieve visual calm through restraint.',
    avoidList: ['cluttered surfaces', 'excessive throw pillows', 'pattern mixing', 'ornate details', 'visible storage or media equipment'],
  },
  living_room_contemporary: {
    primaryFurniture: [
      'curved modular sofa in a jewel-tone velvet',
      'sculptural accent chair in contrasting material',
      'mixed-material coffee table (stone and metal)',
      'lacquered media console with brass hardware',
      'asymmetric side table with metallic finish',
    ],
    accentPieces: ['gallery-style art grouping', 'textured area rug with bold pattern', 'sculptural pendant or arc floor lamp', 'curated object vignette on console'],
    layoutGuidance: 'Dynamic arrangement with a focal statement piece. Mix curves and angles. Layer textures and materials for depth. Balance bold pieces with quieter elements.',
    avoidList: ['matching furniture sets', 'country or rustic elements', 'generic mass-market decor', 'dated floral patterns', 'uniform wood tones throughout'],
  },

  // ===== BEDROOM =====
  bedroom_modern: {
    primaryFurniture: [
      'platform bed with upholstered headboard in charcoal',
      'floating nightstands in matte lacquer',
      'sleek low dresser with handleless drawers',
      'accent bench at foot of bed in leather or fabric',
    ],
    accentPieces: ['pendant or sconce bedside lighting', 'oversized abstract art above bed', 'textured bedding in tonal layers', 'single large-leaf plant'],
    layoutGuidance: 'Bed centred on the main wall. Symmetrical nightstands with matching lighting. Keep surfaces minimal with just one or two objects per surface.',
    avoidList: ['ornate bed frames', 'heavy curtain valances', 'mismatched bedside lamps', 'excessive decorative pillows', 'visible clutter on dresser'],
  },
  bedroom_traditional: {
    primaryFurniture: [
      'four-poster or sleigh bed in rich wood finish',
      'matching wood nightstands with drawer pulls',
      'tall dresser with decorative mirror above',
      'upholstered bench or trunk at foot of bed',
    ],
    accentPieces: ['table lamps with fabric shades', 'layered bedding with accent pillows', 'framed artwork above nightstands', 'plush area rug beside bed'],
    layoutGuidance: 'Formal, symmetrical layout. Bed as the centrepiece with matching furniture flanking. Rich fabrics and coordinated textiles throughout.',
    avoidList: ['chrome or industrial metals', 'floating/wall-mounted furniture', 'bare minimalism', 'neon or electric colours', 'exposed tech or cables'],
  },
  bedroom_farmhouse: {
    primaryFurniture: [
      'reclaimed wood bed frame with simple headboard',
      'mismatched vintage nightstands',
      'distressed white dresser',
      'woven bench or natural-fibre ottoman at foot of bed',
    ],
    accentPieces: ['cotton and linen layered bedding in soft whites', 'woven wall hanging or botanical print', 'vintage table lamp or lantern', 'dried flower arrangement'],
    layoutGuidance: 'Relaxed and inviting. Mix finishes — white painted with natural wood. Layer natural textiles for warmth. Allow slight imperfection in arrangement.',
    avoidList: ['glossy surfaces', 'chrome hardware', 'overly coordinated matching sets', 'synthetic fabrics', 'heavy dark furniture'],
  },
  bedroom_industrial: {
    primaryFurniture: [
      'metal-frame platform bed with wood-plank headboard',
      'pipe-leg nightstands with wood tops',
      'metal locker-style dresser or open shelving',
      'leather bench at foot of bed',
    ],
    accentPieces: ['exposed-filament pendant lights', 'weathered metal wall art', 'raw linen bedding in charcoal', 'concrete or metal desk lamp'],
    layoutGuidance: 'Expose structural elements. Combine raw materials — steel, reclaimed wood, weathered metal. Keep accessories sparse and utilitarian.',
    avoidList: ['soft pastels', 'floral patterns', 'ornate furniture', 'excessive fabric draping', 'delicate decorative objects'],
  },
  bedroom_minimalist: {
    primaryFurniture: [
      'low platform bed with integrated headboard',
      'simple floating nightshelf or slim nightstand',
      'concealed wardrobe with flush doors',
      'single reading chair with ottoman',
    ],
    accentPieces: ['one framed art piece above bed', 'linen bedding in white or soft grey', 'single bedside pendant light', 'one potted plant'],
    layoutGuidance: 'Absolute restraint. Bed as the only visual anchor. Hide storage behind clean doors. One accent colour maximum. Empty floor space is intentional.',
    avoidList: ['visible storage', 'pattern mixing', 'decorative pillows beyond two', 'open shelving with objects', 'multiple light sources'],
  },
  bedroom_contemporary: {
    primaryFurniture: [
      'upholstered bed with statement headboard in bold fabric',
      'asymmetric nightstands in mixed materials',
      'sculptural dresser with unique hardware',
      'accent chair in a contrasting pattern or colour',
    ],
    accentPieces: ['oversized art or tapestry behind bed', 'layered textured bedding with jewel tones', 'sculptural table lamp', 'patterned area rug'],
    layoutGuidance: 'One statement piece (headboard or art) as the focal point. Balance bold elements with neutral supporting pieces. Mix materials confidently — velvet, metal, glass.',
    avoidList: ['matching furniture sets', 'country or traditional pieces', 'generic decor', 'all-white palette', 'dated floral prints'],
  },

  // ===== DINING ROOM =====
  dining_room_modern: {
    primaryFurniture: [
      'glass or stone-top dining table with metal base',
      'upholstered dining chairs in neutral fabric',
      'sleek sideboard in matte lacquer',
    ],
    accentPieces: ['linear pendant or chandelier above table', 'large-scale wall art', 'single sculptural centrepiece', 'simple table runner'],
    layoutGuidance: 'Table centred under pendant light. Chairs evenly spaced with room to pull out. Sideboard against the longest wall with minimal styled objects.',
    avoidList: ['heavy carved wood', 'cluttered centrepieces', 'mismatched chair styles', 'table cloths', 'excessive place settings'],
  },
  dining_room_traditional: {
    primaryFurniture: [
      'solid wood dining table with turned or carved legs',
      'upholstered dining chairs with nailhead trim',
      'china cabinet or glass-front hutch',
    ],
    accentPieces: ['crystal chandelier', 'table centrepiece with fresh flowers', 'framed art flanking the sideboard', 'candlestick holders'],
    layoutGuidance: 'Symmetrical seating arrangement. Chandelier centred directly above the table. China cabinet showcasing select pieces — not overcrowded.',
    avoidList: ['plastic chairs', 'industrial metals', 'bare minimalism', 'modern art styles', 'mismatched dinnerware'],
  },
  dining_room_farmhouse: {
    primaryFurniture: [
      'reclaimed wood trestle dining table',
      'mix of ladder-back chairs and a bench on one side',
      'distressed wood buffet or sideboard',
    ],
    accentPieces: ['wrought iron chandelier or pendant', 'mason jar centrepiece with greenery', 'woven placemats', 'stoneware serving pieces on display'],
    layoutGuidance: 'Bench on one side creates a casual, communal feel. Mix chair types slightly for collected character. Greenery and natural textures throughout.',
    avoidList: ['formal place settings', 'crystal or glass', 'high-gloss surfaces', 'metal or acrylic chairs', 'monochrome colour schemes'],
  },
  dining_room_industrial: {
    primaryFurniture: [
      'heavy steel-and-wood dining table',
      'metal café chairs or vintage school chairs',
      'metal shelving unit or bar cart',
    ],
    accentPieces: ['exposed-filament pendant cluster', 'concrete or metal planter centrepiece', 'vintage signage on wall', 'raw canvas table runner'],
    layoutGuidance: 'Raw and unpolished aesthetic. Mix seating types. Allow structural elements (pipes, brick) to act as decor. Keep accessories sparse and functional.',
    avoidList: ['delicate china', 'formal table linens', 'ornate light fixtures', 'soft pastels', 'decorative cushions on chairs'],
  },
  dining_room_minimalist: {
    primaryFurniture: [
      'simple solid-surface dining table in white or light wood',
      'matching slim chairs with clean profiles',
      'wall-mounted credenza or floating shelf',
    ],
    accentPieces: ['single pendant light with clean form', 'one ceramic vase as centrepiece', 'neutral linen napkins', 'one piece of wall art'],
    layoutGuidance: 'Maximum simplicity. Only essential pieces. Empty wall space is intentional. Monochromatic palette with one subtle accent.',
    avoidList: ['elaborate centrepieces', 'patterned textiles', 'decorative objects', 'multiple light sources', 'contrasting materials'],
  },
  dining_room_contemporary: {
    primaryFurniture: [
      'sculptural dining table with mixed-material base',
      'statement dining chairs in bold upholstery',
      'modern bar cabinet or credenza with brass accents',
    ],
    accentPieces: ['dramatic chandelier or pendant cluster', 'bold patterned rug under table', 'curated art gallery on one wall', 'decorative objects on credenza'],
    layoutGuidance: 'The chandelier and table are co-stars. Choose chairs that contrast the table material. Layer lighting — pendant plus sconces. One bold pattern element.',
    avoidList: ['matching suites', 'country/rustic elements', 'plain overhead lighting', 'all-neutral palette', 'dated wallpaper borders'],
  },

  // ===== BASEMENT =====
  basement_modern: {
    primaryFurniture: [
      'modular sectional in performance fabric',
      'media console with integrated cable management',
      'low-profile coffee table',
      'built-in or floating shelving',
    ],
    accentPieces: ['recessed LED lighting throughout', 'large-format wall art', 'acoustic panels in neutral fabric', 'textured area rug'],
    layoutGuidance: 'Define zones clearly — lounge area, entertainment area. Use floating furniture to create spatial separation. Maximise light in a typically dark space.',
    avoidList: ['heavy dark drapes', 'bulky entertainment centres', 'exposed utility pipes as decor', 'cluttered game areas', 'mismatched furniture'],
  },
  basement_traditional: {
    primaryFurniture: [
      'overstuffed sofa in rich fabric',
      'leather club chairs',
      'solid wood entertainment centre',
      'bar with wood panelling',
    ],
    accentPieces: ['brass sconces or table lamps', 'traditional area rug', 'framed prints or family photos', 'leather-bound books on shelving'],
    layoutGuidance: 'Create a warm den atmosphere. Rich fabrics and warm wood tones offset the below-grade feel. Ample soft lighting from multiple sources.',
    avoidList: ['industrial elements', 'exposed concrete', 'bright overhead fluorescents', 'plastic storage', 'unfinished surfaces'],
  },
  basement_farmhouse: {
    primaryFurniture: [
      'deep comfortable sofa in natural linen',
      'distressed wood entertainment console',
      'vintage trunk as coffee table',
      'woven storage baskets',
    ],
    accentPieces: ['shiplap feature wall', 'lantern-style light fixtures', 'plaid throw blankets', 'potted plants in galvanized containers'],
    layoutGuidance: 'Casual and inviting. Light-coloured walls to brighten the space. Mix vintage and new pieces for collected character.',
    avoidList: ['high-tech media setups', 'glossy surfaces', 'ultra-modern lighting', 'formal furniture', 'monochrome schemes'],
  },
  basement_industrial: {
    primaryFurniture: [
      'worn leather sofa or futon',
      'metal-and-wood coffee table',
      'wire shelving unit',
      'steel bar stools at counter area',
    ],
    accentPieces: ['exposed ductwork and pipes (featured, not hidden)', 'vintage factory lighting', 'concrete accent wall', 'metal artwork or signage'],
    layoutGuidance: 'Lean into the basement rawness. Exposed infrastructure becomes a feature. Define zones with area rugs rather than walls.',
    avoidList: ['dropped ceiling tiles', 'floral patterns', 'formal furniture', 'excessive decoration', 'matching furniture sets'],
  },
  basement_minimalist: {
    primaryFurniture: [
      'streamlined sofa in light neutral',
      'simple media wall with concealed equipment',
      'minimal coffee table',
      'built-in storage with flush doors',
    ],
    accentPieces: ['concealed lighting in ceiling and coves', 'single large plant', 'one focal art piece', 'plain area rug'],
    layoutGuidance: 'Hide all utilities and services. Create a clean, bright space that doesn\'t feel like a basement. Conceal media equipment behind panels.',
    avoidList: ['visible clutter', 'exposed pipes/ducts', 'multiple furniture zones', 'pattern or colour mixing', 'open storage'],
  },
  basement_contemporary: {
    primaryFurniture: [
      'large L-shaped sofa in bold fabric',
      'statement media wall with fireplace insert',
      'mixed-material bar area',
      'gaming or pool table as feature',
    ],
    accentPieces: ['colour-changing LED accent lighting', 'bold graphic art', 'textured wall panels', 'sculptural accessories'],
    layoutGuidance: 'Create an entertainment destination. Use dramatic lighting to define zones. Bold colour accents against neutral base.',
    avoidList: ['plain overhead lights', 'boring neutral-only palette', 'mismatched hand-me-downs', 'dated wood panelling', 'low-budget finishes'],
  },

  // ===== KITCHEN (surface-focused — lighter staging) =====
  kitchen_modern: {
    primaryFurniture: ['sleek bar stools at island in metal or leather', 'minimal open shelving display'],
    accentPieces: ['single herb planter on countertop', 'geometric fruit bowl', 'designer kettle or espresso machine', 'single cookbook display'],
    layoutGuidance: 'Clear all countertop clutter. Stage with 2-3 curated items only. Bar stools should complement the cabinet hardware finish.',
    avoidList: ['countertop appliance collection', 'paper towel holders', 'cluttered knife blocks', 'visible dish racks', 'mismatched containers'],
  },
  kitchen_traditional: {
    primaryFurniture: ['carved wood bar stools with upholstered seats', 'plate rail or dish display on open shelving'],
    accentPieces: ['fresh flowers in classic vase', 'stoneware crock with wooden utensils', 'vintage-style canisters', 'cookbook on stand'],
    layoutGuidance: 'Warm and welcoming countertop styling. Display select pieces on open shelving. Keep surfaces inviting but not crowded.',
    avoidList: ['modern metallic appliances on display', 'plastic containers', 'cluttered countertops', 'generic decor', 'bare open shelving'],
  },
  kitchen_farmhouse: {
    primaryFurniture: ['rustic wood bar stools or saddle stools', 'open shelving with curated dishware display'],
    accentPieces: ['fresh herbs in terracotta pots', 'vintage bread box or scale', 'linen tea towels on oven handle', 'mason jar utensil holder'],
    layoutGuidance: 'Collected, lived-in feel. Mix old and new on open shelves. Fresh greenery is essential. Keep counters mostly clear with 3-4 styled vignettes.',
    avoidList: ['ultra-modern appliances on display', 'chrome finishes', 'matching container sets', 'plastic or synthetic elements', 'bare/sterile surfaces'],
  },
  kitchen_industrial: {
    primaryFurniture: ['metal bar stools with footrests', 'pipe-mounted open shelving'],
    accentPieces: ['commercial-style utensil rail', 'concrete or metal planters', 'vintage tin containers', 'exposed-filament pendant over island'],
    layoutGuidance: 'Utilitarian styling. Function is decoration. Display professional-grade tools and quality ingredients. Raw materials as accents.',
    avoidList: ['delicate decorative items', 'matching sets', 'country decor', 'soft pastel accessories', 'tablecloths or decorative linens'],
  },
  kitchen_minimalist: {
    primaryFurniture: ['slim-profile bar stools with clean lines', 'minimal floating shelf (one)'],
    accentPieces: ['single ceramic vase with one branch', 'one cutting board leaning against wall', 'designer faucet as focal point'],
    layoutGuidance: 'Nearly empty countertops. One curated item per surface maximum. Let the material quality and craftsmanship speak. Hidden storage for everything.',
    avoidList: ['any countertop clutter', 'visible appliances', 'decorative objects', 'patterned textiles', 'multiple display items'],
  },
  kitchen_contemporary: {
    primaryFurniture: ['statement bar stools in bold colour or material', 'styled open shelving with curated pieces'],
    accentPieces: ['artisanal pottery on display', 'bold-coloured small appliance as accent', 'sculptural fruit bowl', 'art piece on counter or wall'],
    layoutGuidance: 'One bold statement piece on the counter. Mix materials on shelving — ceramics, wood, metal. Counter styling should feel gallery-curated.',
    avoidList: ['generic mass-market decor', 'matching appliance sets on display', 'country or rustic accessories', 'cluttered surfaces', 'dated patterns'],
  },

  // ===== BATHROOM (surface-focused — lighter staging) =====
  bathroom_modern: {
    primaryFurniture: [],
    accentPieces: ['folded white towels on open shelf or stool', 'single potted orchid or succulent', 'minimalist soap dispenser set', 'frameless mirror (or LED-backlit)'],
    layoutGuidance: 'Spa-like minimalism. White or neutral towels folded neatly. One plant accent. Clear all personal toiletries from view.',
    avoidList: ['cluttered countertop products', 'visible toothbrush holders', 'bath mats', 'shower caddies', 'dated accessories'],
  },
  bathroom_traditional: {
    primaryFurniture: [],
    accentPieces: ['plush towels on polished towel bar', 'classic apothecary jars', 'framed mirror with decorative frame', 'fresh flowers in small vase', 'decorative tray with curated items'],
    layoutGuidance: 'Elegant and composed. Display towels as decorative elements. Tray on vanity with 2-3 coordinated items. Classical symmetry.',
    avoidList: ['plastic accessories', 'visible toiletries', 'mismatched hardware', 'cluttered surfaces', 'cheap bath mats'],
  },
  bathroom_farmhouse: {
    primaryFurniture: [],
    accentPieces: ['woven basket with rolled towels', 'vintage mirror or window frame as mirror surround', 'small potted plant or eucalyptus sprig', 'mason jar soap dispenser', 'white cotton bath mat'],
    layoutGuidance: 'Simple and charming. Natural textures — woven, wood, cotton. One vintage accent piece. Greenery adds life.',
    avoidList: ['chrome accessories', 'modern geometric patterns', 'plastic dispensers', 'matching acrylic sets', 'dark/heavy surfaces'],
  },
  bathroom_industrial: {
    primaryFurniture: [],
    accentPieces: ['pipe-mounted towel rack', 'concrete soap dish', 'metal-frame mirror', 'Edison-bulb vanity lights'],
    layoutGuidance: 'Raw materials as decoration. Pipe fittings as towel holders. Concrete or metal accessories. Dark grout in tile work.',
    avoidList: ['soft pastels', 'floral patterns', 'decorative soaps', 'delicate accessories', 'ornate mirrors'],
  },
  bathroom_minimalist: {
    primaryFurniture: [],
    accentPieces: ['single white towel on heated rail', 'one architectural soap dispenser', 'frameless mirror with concealed lighting'],
    layoutGuidance: 'Near-empty surfaces. Recessed niches for shower products. Wall-mounted everything. Counter should have at most one object.',
    avoidList: ['any visible toiletries', 'decorative items', 'patterned tiles', 'multiple accessories', 'bath mats or rugs'],
  },
  bathroom_contemporary: {
    primaryFurniture: [],
    accentPieces: ['statement vessel sink as focal point', 'artisanal soap and lotion set', 'dramatic mirror with unique frame', 'textured towels in accent colour', 'sculptural candle or object'],
    layoutGuidance: 'One statement element — vessel sink, dramatic mirror, or unique tub. Style surfaces with 2-3 curated items in coordinated materials.',
    avoidList: ['generic chrome accessories', 'matching acrylic sets', 'dated vanity lighting', 'plain white towels', 'cluttered counters'],
  },

  // ===== EXTERIOR =====
  exterior_modern: {
    primaryFurniture: ['low-profile outdoor sectional in weather-resistant fabric', 'concrete or metal planter boxes', 'slim-profile outdoor dining set'],
    accentPieces: ['architectural landscape lighting', 'geometric outdoor rug', 'single large planter with ornamental grass', 'clean-line house numbers'],
    layoutGuidance: 'Clean, horizontal lines echoing the architecture. Structured plantings in geometric beds. Pathway lighting at regular intervals.',
    avoidList: ['rustic wooden furniture', 'garden gnomes or figurines', 'cluttered patio items', 'mismatched planters', 'visible garden hoses'],
  },
  exterior_traditional: {
    primaryFurniture: ['classic Adirondack chairs or rocking chairs', 'wrought-iron patio set', 'wooden garden bench'],
    accentPieces: ['hanging flower baskets', 'classic lantern-style lighting', 'boxwood or hedge plantings', 'brick pathway edging'],
    layoutGuidance: 'Symmetrical plantings framing the entry. Classic seating arrangements on porch or patio. Well-manicured landscaping.',
    avoidList: ['ultra-modern furniture', 'industrial materials', 'sparse/minimal landscaping', 'concrete planters', 'avant-garde lighting'],
  },
  exterior_farmhouse: {
    primaryFurniture: ['painted wood rocking chairs', 'rustic farm table on porch', 'vintage metal glider or swing'],
    accentPieces: ['window boxes with seasonal flowers', 'galvanized planters', 'string lights on porch', 'vintage door mat', 'potted herbs by entry'],
    layoutGuidance: 'Welcoming porch as outdoor living room. Mix of planted containers at varying heights. Casual, lived-in charm. Seasonal wreath on door.',
    avoidList: ['modern minimalist furniture', 'chrome or glass', 'formal symmetry', 'bare/sterile entryway', 'synthetic turf'],
  },
  exterior_industrial: {
    primaryFurniture: ['metal-frame outdoor seating', 'concrete bench or planter', 'corten steel fire pit or planter'],
    accentPieces: ['commercial-style wall sconces', 'metal house numbers', 'gravel or concrete pathways', 'architectural plants (agave, grasses)'],
    layoutGuidance: 'Hard materials softened by architectural plantings. Corten steel and concrete as accents. Minimal but impactful.',
    avoidList: ['cottage-style plantings', 'painted wicker', 'floral cushions', 'ornate railings', 'excessive garden decor'],
  },
  exterior_minimalist: {
    primaryFurniture: ['single built-in bench or minimal seating', 'one large-scale planter'],
    accentPieces: ['recessed pathway lighting', 'clean-line address plaque', 'single specimen tree or plant'],
    layoutGuidance: 'Less is more. One material for hardscaping. Restrained plantings — one species per bed. Negative space is essential.',
    avoidList: ['multiple seating areas', 'colourful flower beds', 'decorative garden items', 'varied materials', 'cluttered porch'],
  },
  exterior_contemporary: {
    primaryFurniture: ['designer outdoor lounge set', 'sculptural fire table', 'modern planters in mixed sizes'],
    accentPieces: ['LED landscape uplighting', 'water feature', 'outdoor art piece', 'statement front door colour'],
    layoutGuidance: 'Create an outdoor room with intentional zones. Mix textures — wood deck, stone, plantings. Evening lighting should be dramatic.',
    avoidList: ['dated patio furniture', 'plastic chairs', 'generic garden centre decor', 'uniform plantings', 'bright overhead flood lights'],
  },

  // ===== TRANSITIONAL =====
  living_room_transitional: {
    primaryFurniture: [
      'shelter-arm sofa in neutral performance linen',
      'parsons-style accent chair with tapered wood legs',
      'oval marble-top coffee table',
      'clean-profile sideboard in warm oak',
      'upholstered bench with turned legs',
    ],
    accentPieces: ['linen drum pendant shade', 'layered neutral area rug', 'framed abstract art in muted tones', 'ceramic table lamp with linen shade'],
    layoutGuidance: 'Symmetrical but not rigid. Pair classic shapes with clean lines. Neutral palette with warmth through texture — linen, wool, wood grain. One curated focal wall.',
    avoidList: ['ornate carvings', 'ultra-modern chrome', 'heavy drapes with valances', 'cluttered shelving', 'stark minimalism'],
  },
  bedroom_transitional: {
    primaryFurniture: [
      'upholstered bed with clean wingback headboard',
      'warm oak nightstands with simple pulls',
      'dresser in painted soft grey with brass knobs',
      'upholstered end-of-bed bench',
    ],
    accentPieces: ['linen bedding in warm white layers', 'brushed-nickel sconces', 'soft abstract art above bed', 'textured area rug in greige'],
    layoutGuidance: 'Centred bed with symmetrical nightstands. Keep palette warm and neutral. Mix painted and natural wood finishes. Subtle pattern in textiles only.',
    avoidList: ['heavy carved wood', 'ultra-modern floating furniture', 'bright accent colours', 'excessive pillows', 'matching furniture suites'],
  },
  dining_room_transitional: {
    primaryFurniture: [
      'oval or rectangular oak dining table',
      'upholstered dining chairs with slim wood frames',
      'sideboard in warm finish with simple hardware',
    ],
    accentPieces: ['linen drum chandelier', 'simple centrepiece with greenery', 'framed artwork flanking sideboard', 'neutral table runner'],
    layoutGuidance: 'Classic table-and-chairs arrangement with updated profiles. Warm wood tones, neutral upholstery, one statement light fixture overhead.',
    avoidList: ['heavy formal china cabinets', 'industrial metals', 'matching furniture sets', 'ultra-modern glass tables', 'ornate chandeliers'],
  },
  basement_transitional: {
    primaryFurniture: [
      'comfortable sectional in neutral performance fabric',
      'clean-profile media console in warm wood',
      'round coffee table with turned legs',
      'built-in shelving with simple moulding',
    ],
    accentPieces: ['recessed lighting with warm bulbs', 'textured area rug', 'framed prints in coordinated frames', 'linen throw blankets'],
    layoutGuidance: 'Warm and inviting without being dated. Light walls to brighten below-grade space. Classic shapes with streamlined details.',
    avoidList: ['heavy dark panelling', 'industrial pipe shelving', 'ultra-modern furniture', 'dated bar setups', 'excessive built-in entertainment centres'],
  },
  kitchen_transitional: {
    primaryFurniture: ['upholstered counter stools with low backs', 'open shelving with simple bracket supports'],
    accentPieces: ['ceramic vase with greenery', 'marble cutting board on display', 'linen tea towel on oven handle', 'classic canisters in muted tones'],
    layoutGuidance: 'Shaker-style cabinets with simple hardware. Warm wood and stone surfaces. 2-3 curated countertop items maximum. Bridge between traditional and modern.',
    avoidList: ['ornate cabinet details', 'ultra-modern handleless cabinets', 'rustic farmhouse accessories', 'cluttered countertops', 'mismatched metals'],
  },
  bathroom_transitional: {
    primaryFurniture: [],
    accentPieces: ['framed mirror with simple moulding', 'brushed-nickel fixtures', 'white marble tray with soap dispenser', 'folded neutral towels on open shelf'],
    layoutGuidance: 'Classic subway tile or marble with updated fixtures. Warm neutral palette. One elegant accent — framed mirror or pendant light.',
    avoidList: ['ornate gilded mirrors', 'ultra-modern vessel sinks', 'industrial pipe fittings', 'heavy stone everywhere', 'dated brass'],
  },
  exterior_transitional: {
    primaryFurniture: ['classic wicker or rattan seating with clean cushions', 'simple wood dining table on porch', 'clean-profile planter boxes'],
    accentPieces: ['lantern-style outdoor sconces', 'boxwood or hydrangea plantings', 'simple doormat', 'classic house numbers'],
    layoutGuidance: 'Traditional architectural elements (columns, mouldings) paired with updated landscaping and furnishings. Symmetrical but relaxed.',
    avoidList: ['ultra-modern furniture', 'rustic/distressed finishes', 'ornate iron railings', 'avant-garde lighting', 'overly formal symmetry'],
  },

  // ===== SCANDINAVIAN =====
  living_room_scandinavian: {
    primaryFurniture: [
      'low-profile sofa in light bouclé or linen',
      'moulded plywood lounge chair',
      'round white-oak coffee table',
      'slim open bookshelf in birch',
      'woven paper-cord side chair',
    ],
    accentPieces: ['sheepskin throw over chair arm', 'single large ceramic vase', 'woven wool area rug in cream', 'one framed botanical print'],
    layoutGuidance: 'Light, airy, and uncluttered. Furniture floated away from walls. Warm textures — wool, linen, sheepskin — against white backdrop. One or two statement plants.',
    avoidList: ['heavy dark furniture', 'ornate details', 'bold patterns', 'chrome or brass metals', 'cluttered surfaces'],
  },
  bedroom_scandinavian: {
    primaryFurniture: [
      'simple platform bed in light ash or birch',
      'slim nightstands with open shelf',
      'low dresser in white or light wood',
      'single accent chair in bouclé fabric',
    ],
    accentPieces: ['layered linen bedding in white and oatmeal', 'paper pendant lamp', 'single potted plant', 'knitted throw at foot of bed'],
    layoutGuidance: 'Restful and light. All-white or warm-white walls. Light wood furniture. Texture through textiles — linen, wool, knit. Minimal accessories.',
    avoidList: ['dark wood', 'heavy curtains', 'ornate bed frames', 'bright accent colours', 'excessive decorative pillows'],
  },
  dining_room_scandinavian: {
    primaryFurniture: [
      'light oak or ash dining table with slim legs',
      'moulded wood or paper-cord dining chairs',
      'simple open shelf or low credenza in birch',
    ],
    accentPieces: ['sculptural paper pendant above table', 'single ceramic pitcher as centrepiece', 'linen napkins in neutral tones', 'one piece of minimal wall art'],
    layoutGuidance: 'Simple, functional arrangement. Light wood palette. Let natural light dominate. One sculptural light fixture as the statement.',
    avoidList: ['heavy carved furniture', 'dark finishes', 'elaborate centrepieces', 'formal table settings', 'matching furniture suites'],
  },
  basement_scandinavian: {
    primaryFurniture: [
      'light-coloured sofa in washable linen',
      'birch plywood media console',
      'round coffee table in white laminate',
      'wall-mounted shelving in light wood',
    ],
    accentPieces: ['warm-white LED lighting throughout', 'sheepskin throw on sofa', 'potted plants to bring life', 'woven basket storage'],
    layoutGuidance: 'Bright and warm despite being below grade. White walls and light wood to maximise perceived light. Cosy textiles offset the coolness.',
    avoidList: ['dark heavy furniture', 'exposed industrial elements', 'bold colours', 'cluttered media setups', 'synthetic materials'],
  },
  kitchen_scandinavian: {
    primaryFurniture: ['light wood bar stools with simple backs', 'open shelving in birch or white'],
    accentPieces: ['ceramic crock with wooden utensils', 'small herb pot on windowsill', 'linen tea towel', 'single ceramic bowl on counter'],
    layoutGuidance: 'White or pale cabinets with light wood accents. Minimal countertop items. Open shelving with curated dishware. Let the wood grain and white space breathe.',
    avoidList: ['dark cabinets', 'ornate hardware', 'cluttered countertops', 'heavy stone surfaces', 'bold patterned tiles'],
  },
  bathroom_scandinavian: {
    primaryFurniture: [],
    accentPieces: ['light wood vanity shelf or stool', 'white ceramic soap dispenser', 'single eucalyptus sprig in glass vase', 'woven basket with rolled towels'],
    layoutGuidance: 'White tile, light wood, minimal accessories. Spa-like calm with Nordic warmth. One natural accent — wood tray, plant, or woven basket.',
    avoidList: ['dark tile', 'ornate mirrors', 'multiple accessories', 'heavy stone surfaces', 'chrome fixtures'],
  },
  exterior_scandinavian: {
    primaryFurniture: ['simple wood bench or Adirondack chairs in light finish', 'birch or painted white planter boxes'],
    accentPieces: ['simple pathway lighting', 'native grasses and perennials', 'clean-line house numbers', 'simple woven doormat'],
    layoutGuidance: 'Clean and natural. Pale wood or painted white elements. Native plantings over formal gardens. Warm, welcoming entry with minimal decor.',
    avoidList: ['ornate iron railings', 'bold coloured furniture', 'heavy stone features', 'cluttered porch', 'formal landscaping'],
  },

  // ===== COASTAL =====
  living_room_coastal: {
    primaryFurniture: [
      'slipcovered sofa in white or natural linen',
      'rattan accent chair with linen cushion',
      'driftwood or whitewashed wood coffee table',
      'woven seagrass console table',
      'cane-back occasional chair',
    ],
    accentPieces: ['jute area rug', 'blue-and-white throw pillows', 'coral or shell decorative object', 'large potted palm or fiddle leaf fig'],
    layoutGuidance: 'Relaxed and breezy. Light, airy arrangement with space to breathe. Layer natural textures — jute, rattan, linen. Blues and whites against sandy neutrals.',
    avoidList: ['heavy dark furniture', 'industrial metals', 'formal upholstery', 'themed nautical kitsch (anchors, ship wheels)', 'synthetic materials'],
  },
  bedroom_coastal: {
    primaryFurniture: [
      'whitewashed wood bed frame with simple headboard',
      'rattan nightstands',
      'white or light blue painted dresser',
      'woven bench at foot of bed',
    ],
    accentPieces: ['layered white linen bedding with blue accents', 'woven pendant light', 'framed coastal landscape', 'blue-and-white ceramic lamp'],
    layoutGuidance: 'Light and airy. White and blue palette with sandy neutral accents. Natural textures throughout — rattan, woven, linen. Ocean-inspired without being themed.',
    avoidList: ['heavy dark wood', 'industrial metals', 'bold non-coastal colours', 'themed nautical decor', 'formal traditional pieces'],
  },
  dining_room_coastal: {
    primaryFurniture: [
      'whitewashed or driftwood dining table',
      'woven rattan or cane dining chairs',
      'white painted sideboard with rope or shell pulls',
    ],
    accentPieces: ['woven pendant or lantern chandelier', 'blue glass vase with greenery', 'natural linen table runner', 'coral or shell centrepiece'],
    layoutGuidance: 'Casual and inviting. Light wood and white dominate. Natural textures on chairs and accessories. Blue accents through glass, ceramics, or textiles.',
    avoidList: ['heavy formal furniture', 'dark wood', 'industrial elements', 'themed nautical kitsch', 'chrome or stainless finishes'],
  },
  basement_coastal: {
    primaryFurniture: [
      'slipcovered sofa in light fabric',
      'whitewashed media console',
      'woven trunk as coffee table',
      'rattan storage baskets',
    ],
    accentPieces: ['shiplap feature wall in white', 'blue-and-white throw pillows', 'rope-frame mirror', 'potted palm or tropical plant'],
    layoutGuidance: 'Light and beachy even below grade. White walls and shiplap to brighten. Coastal palette (blue, white, sandy) brings vacation feel to a typically dark space.',
    avoidList: ['dark heavy furniture', 'industrial elements', 'formal pieces', 'themed nautical decor', 'heavy curtains'],
  },
  kitchen_coastal: {
    primaryFurniture: ['woven counter stools with backs', 'open shelving with beadboard backing'],
    accentPieces: ['blue glass jars on display', 'small potted herb garden', 'woven basket on counter', 'white ceramic canisters'],
    layoutGuidance: 'White or pale blue cabinets. Light wood or butcher block surfaces. Sea glass tile backsplash. Airy and bright with natural fibre accents.',
    avoidList: ['dark cabinets', 'heavy stone', 'industrial fixtures', 'bold non-coastal colours', 'cluttered surfaces'],
  },
  bathroom_coastal: {
    primaryFurniture: [],
    accentPieces: ['woven basket with rolled white towels', 'sea glass tile accent', 'driftwood-frame mirror', 'blue glass soap dispenser', 'shell or coral decorative piece'],
    layoutGuidance: 'White and blue palette. Natural textures — woven, wood, glass. Sea-inspired accents without nautical theme. Light and spa-like.',
    avoidList: ['dark tile', 'heavy stone', 'chrome fixtures', 'themed nautical items', 'ornate mirrors'],
  },
  exterior_coastal: {
    primaryFurniture: ['Adirondack chairs in white or weathered grey', 'woven outdoor seating', 'whitewashed wood bench'],
    accentPieces: ['planter boxes with ornamental grasses', 'lantern-style outdoor lighting', 'natural fibre doormat', 'blue shutters or door accent'],
    layoutGuidance: 'Breezy porch or patio feel. Weathered wood and white dominate. Coastal plantings — grasses, hydrangeas. Blue accents on shutters or door.',
    avoidList: ['heavy dark furniture', 'ultra-modern elements', 'formal landscaping', 'themed nautical decor', 'bright bold colours'],
  },

  // ===== MID-CENTURY MODERN =====
  living_room_mid_century_modern: {
    primaryFurniture: [
      'low-slung sofa with tapered walnut legs in olive or mustard fabric',
      'moulded fibreglass or plywood shell chair',
      'oval walnut coffee table with tapered legs',
      'teak credenza with sliding doors',
      'hairpin-leg side table',
    ],
    accentPieces: ['sunburst wall clock', 'geometric area rug in warm tones', 'Sputnik-style floor lamp', 'abstract art in bold colour'],
    layoutGuidance: 'Low-slung, open arrangement. Tapered legs on everything to keep visual weight light. Bold colour pops — mustard, olive, orange — against warm wood. One iconic statement piece.',
    avoidList: ['heavy overstuffed furniture', 'ornate traditional details', 'matchy-matchy sets', 'ultra-minimalist white', 'industrial raw materials'],
  },
  bedroom_mid_century_modern: {
    primaryFurniture: [
      'platform bed with walnut headboard and tapered legs',
      'teak nightstands with slim drawers',
      'walnut dresser with brass pulls and splayed legs',
      'moulded plywood lounge chair in corner',
    ],
    accentPieces: ['arc floor lamp with marble base', 'geometric print bedding in warm tones', 'abstract wall art', 'ceramic table lamp in olive or mustard'],
    layoutGuidance: 'Low horizontal lines. Warm walnut and teak dominate. One or two bold colour accents in textiles or art. Tapered and splayed legs throughout.',
    avoidList: ['heavy carved furniture', 'ultra-modern floating pieces', 'country or farmhouse elements', 'all-neutral palette', 'matching bedroom sets'],
  },
  dining_room_mid_century_modern: {
    primaryFurniture: [
      'oval or round walnut dining table with tapered legs',
      'moulded shell dining chairs in mixed colours',
      'teak sideboard with sliding doors and brass pulls',
    ],
    accentPieces: ['Sputnik chandelier or globe pendant', 'bold graphic print on wall', 'ceramic centrepiece in burnt orange or olive', 'geometric table runner'],
    layoutGuidance: 'Round or oval table preferred. Mix chair colours (mustard, olive, orange, cream) for playful energy. Teak credenza against wall with curated display.',
    avoidList: ['heavy formal furniture', 'country or rustic pieces', 'chrome and glass', 'uniform matching chairs', 'ornate chandeliers'],
  },
  basement_mid_century_modern: {
    primaryFurniture: [
      'low-profile sofa in bold fabric with walnut frame',
      'teak media console with record player display',
      'oval coffee table with hairpin legs',
      'modular shelving unit in walnut',
    ],
    accentPieces: ['lava lamp or Sputnik accent light', 'vintage-style abstract art', 'shag area rug in warm tones', 'brass bar cart'],
    layoutGuidance: 'Retro lounge vibe. Low furniture keeps the space open. Warm wood tones offset the below-grade feel. Bold colours in upholstery and accessories.',
    avoidList: ['heavy modern sectionals', 'industrial elements', 'all-neutral palette', 'dated wood panelling', 'generic media setups'],
  },
  kitchen_mid_century_modern: {
    primaryFurniture: ['moulded shell bar stools in bold colour', 'open shelving with teak brackets'],
    accentPieces: ['geometric tile backsplash in warm tones', 'brass or copper kettle on display', 'ceramic fruit bowl in olive or mustard', 'single potted plant'],
    layoutGuidance: 'Flat-front walnut or painted cabinets with brass hardware. Geometric tile as focal backsplash. 2-3 curated items in bold colours on countertop.',
    avoidList: ['ornate cabinet profiles', 'stainless everything', 'farmhouse accessories', 'cluttered countertops', 'all-white palette'],
  },
  bathroom_mid_century_modern: {
    primaryFurniture: [],
    accentPieces: ['walnut-frame mirror', 'brass fixtures and hardware', 'geometric tile floor or accent wall', 'ceramic soap dish in bold colour', 'single potted plant'],
    layoutGuidance: 'Clean lines with warm materials. Walnut vanity with brass pulls. Geometric tile as the statement. One bold colour accent in accessories.',
    avoidList: ['ornate mirrors', 'chrome fixtures', 'all-white sterile look', 'heavy stone surfaces', 'traditional tile patterns'],
  },
  exterior_mid_century_modern: {
    primaryFurniture: ['low-profile outdoor seating with clean lines', 'butterfly or sling chairs', 'simple planter boxes in geometric shapes'],
    accentPieces: ['bold-coloured front door (orange, yellow, or teal)', 'architectural landscape lighting', 'desert or native plantings', 'clean-line house numbers in brass'],
    layoutGuidance: 'Low horizontal lines echoing the architecture. Statement front door colour. Architectural plantings — desert succulents, ornamental grasses. Clean hardscaping.',
    avoidList: ['ornate traditional elements', 'cottage-style plantings', 'heavy wrought iron', 'rustic wood accents', 'cluttered porch decor'],
  },
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Get staging recommendation for a room type + design style combination.
 * Returns null if no recommendation exists for the combination.
 */
export function getStagingRecommendation(
  roomType: RoomType,
  style: DesignStyle,
): StagingRecommendation | null {
  const key = `${roomType}_${style}`;
  return STAGING_RECOMMENDATIONS[key] ?? null;
}
