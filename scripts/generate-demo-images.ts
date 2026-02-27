/**
 * Generate Demo Images via Gemini AI
 * Creates 17 unique AI-generated images for the ConversionOS Demo site.
 * Run with: npx tsx scripts/generate-demo-images.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env['GOOGLE_GENERATIVE_AI_API_KEY'];

if (!API_KEY) {
  console.error('GOOGLE_GENERATIVE_AI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const IMAGES = [
  {
    filename: 'hero-kitchen.png',
    section: 'Homepage hero',
    prompt: 'A photorealistic wide-angle interior photograph of a stunning modern kitchen renovation. White handleless cabinetry with integrated pulls, waterfall quartz island in Calacatta marble pattern, brushed brass pendant lights above the island, engineered hardwood flooring in warm honey oak, stainless steel professional-grade appliances, glass tile backsplash in soft gray-blue, large windows flooding the space with warm afternoon sunlight. Shot at eye level from the entrance, showing the full room depth. Professional architectural photography, warm color temperature, natural shadows, publication-quality detail, 4K resolution.',
  },
  {
    filename: 'kitchen-modern.png',
    section: 'Service grid + Kitchen hero + Project #1',
    prompt: 'A photorealistic interior photograph of a newly renovated modern kitchen. Clean horizontal lines, flat-panel white cabinets with matte lacquer finish, polished quartz countertops in warm gray, subway tile backsplash in herringbone pattern, large center island with waterfall edge and three leather bar stools, recessed LED ceiling lights and two brushed nickel pendant fixtures over the island, porcelain tile floor in light ash gray. Natural light from a window on the left wall. Professional interior photography, sharp material textures, realistic shadows, suitable for client presentation.',
  },
  {
    filename: 'kitchen-farmhouse.png',
    section: 'Kitchen secondary + Project #5',
    prompt: 'A photorealistic interior photograph of a charming farmhouse-style kitchen renovation. Two-tone cabinetry — white upper cabinets and sage green lower cabinets with antique bronze hardware, butcher block island top, white apron-front farmhouse sink, open wooden shelving with decorative dishes, shiplap accent wall, wide-plank rustic oak hardwood floors, wrought iron pendant lights with Edison bulbs, subway tile backsplash in creamy white. Warm morning light through a window above the sink. Professional interior design photography, cozy atmosphere, natural textures visible.',
  },
  {
    filename: 'kitchen-detail.png',
    section: 'Kitchen tertiary',
    prompt: 'A photorealistic close-up interior photograph of modern kitchen countertop detail. Veined quartz countertop in white and gray, undermount stainless steel sink with brushed gold single-handle faucet, white ceramic subway tile backsplash, portion of flat-panel white cabinetry visible, small herb plant in a terracotta pot, natural side lighting creating soft shadows across the stone surface. Professional product/detail photography, tack-sharp focus on materials and textures, warm color palette.',
  },
  {
    filename: 'bathroom-spa.png',
    section: 'Service grid + Bathroom hero + Project #2',
    prompt: 'A photorealistic interior photograph of a luxurious spa-inspired master bathroom renovation. Walk-in frameless glass shower with rainfall showerhead and floor-to-ceiling large-format porcelain tiles in warm beige marble pattern, freestanding white oval soaking tub near a window, floating double vanity in walnut with white vessel sinks and wall-mounted matte black faucets, heated porcelain tile floor, recessed LED lighting with warm 3000K tone, large format wall mirrors with integrated LED strips. Natural light from frosted window, steam-free atmosphere. Professional architectural photography, serene mood, publication quality.',
  },
  {
    filename: 'bathroom-accessible.png',
    section: 'Bathroom secondary + Project #6',
    prompt: 'A photorealistic interior photograph of a modern accessible barrier-free bathroom renovation. Curbless roll-in shower with linear drain, matte black grab bars matching the fixtures, hand-held and rainfall showerhead combo on slide bar, built-in shower bench in matching tile, floating vanity at wheelchair-accessible height, large-format rectified porcelain floor tile in warm gray with anti-slip finish, wall-mounted toilet, recessed LED lighting, chrome accessories. Clean and functional yet stylish. Professional interior photography, bright and airy feel.',
  },
  {
    filename: 'bathroom-tub.png',
    section: 'Bathroom tertiary',
    prompt: 'A photorealistic interior photograph of an elegant bathroom featuring a modern freestanding bathtub. Matte white freestanding oval tub as centerpiece, floor-mounted brushed nickel tub filler, large-format white marble-look porcelain wall tiles, natural stone hexagon mosaic floor tile in Carrara pattern, floating wooden shelf with rolled towels and candles, soft recessed lighting with a wall sconce in brushed brass. Calming atmosphere, warm light from the left side. Professional interior design photography, spa-like serenity.',
  },
  {
    filename: 'basement-entertainment.png',
    section: 'Service grid + Basement page + Project #3',
    prompt: 'A photorealistic interior photograph of a fully finished basement entertainment room renovation. Open-concept layout with 9-foot ceilings and recessed pot lights throughout, luxury vinyl plank flooring in dark walnut, large L-shaped sectional sofa facing a wall-mounted 75-inch TV on a dark accent wall, built-in shelving units flanking the TV niche, wet bar area with quartz countertop and mini fridge visible in the background, carpet area rug under a coffee table. No visible windows — this is clearly a BELOW-GRADE basement space with artificial lighting only. Professional interior photography, warm inviting atmosphere, cozy lighting.',
  },
  {
    filename: 'basement-walkout.png',
    section: 'Basement page + Project #7',
    prompt: 'A photorealistic interior photograph of a modern walkout basement apartment renovation. Open living space with polished concrete floor, one wall featuring a sliding glass patio door leading to a ground-level backyard visible outside, compact modern kitchenette with white flat-panel cabinets and butcher block counter along one wall, comfortable living area with modern sofa and coffee table, bedroom area visible through an open doorway, egress window with natural light, recessed ceiling lights, neutral gray and white color scheme. This is clearly a basement-level suite with one exterior wall. Professional real estate photography, bright and livable feel.',
  },
  {
    filename: 'outdoor-deck.png',
    section: 'Service grid + Outdoor page',
    prompt: 'A photorealistic exterior photograph of a beautiful backyard deck renovation. Large composite decking platform in warm cedar tone with hidden fasteners, built-in outdoor kitchen area with granite countertop and stainless steel grill, pergola structure with string lights overhead, comfortable outdoor dining set for six with cushioned chairs, potted planters with ornamental grasses along the railing, natural stone steps leading down to a manicured lawn, mature trees in the background. Late afternoon golden hour lighting, soft shadows. Professional outdoor living photography, inviting summer atmosphere.',
  },
  {
    filename: 'outdoor-patio.png',
    section: 'Outdoor page',
    prompt: 'A photorealistic exterior photograph of a professionally landscaped backyard patio renovation. Natural stone paver patio in warm sandstone tones with a fire pit as the centerpiece, Adirondack chairs around the fire pit, perennial garden border with hostas and ornamental grasses, cedar privacy fence in the background, stamped concrete pathway connecting to the house, outdoor wall-mounted sconce lighting on the house exterior, decorative potted plants. Early evening with warm ambient light. Professional landscape architecture photography, peaceful Ontario backyard setting.',
  },
  {
    filename: 'craftsmanship-detail.png',
    section: 'Homepage Why Choose Us',
    prompt: 'A photorealistic close-up photograph of expert renovation craftsmanship detail. Perfectly mitered crown molding joint meeting at a corner, freshly painted walls in warm white, the molding showing crisp clean lines and flawless paint finish, subtle shadow revealing the dimensional profile of the trim. Professional detail photography showing quality workmanship, tack-sharp focus, shallow depth of field blurring the room behind, warm natural side-lighting. Emphasizes precision, care, and professional-grade finishing.',
  },
  {
    filename: 'flooring-hardwood.png',
    section: 'Project #4',
    prompt: 'A photorealistic interior photograph of a newly installed hardwood floor renovation. Wide-plank white oak hardwood flooring in a natural matte finish, shot from a low angle showing the beautiful grain pattern extending across a bright living room, baseboards freshly painted in crisp white, natural light streaming across the floor surface revealing the wood grain and tonal variation, furniture legs just visible at the edges of frame. Professional flooring photography, warm golden tones, emphasis on the natural beauty of the wood.',
  },
  {
    filename: 'flooring-vinyl.png',
    section: 'Project #8 + About page',
    prompt: 'A photorealistic interior photograph of luxury vinyl plank flooring installation in a modern basement. Waterproof LVP in realistic oak wood-look pattern with subtle texture, installed throughout an open living area, color-matched quarter-round trim at the baseboards, modern furniture on the floor showing how it integrates into the living space, recessed pot lights reflecting off the smooth surface, clean transitions at doorway thresholds. Professional interior photography, shows the realistic wood appearance of the vinyl planks, bright clean atmosphere.',
  },
  {
    filename: 'team-male.png',
    section: 'About page — Alex Thompson',
    prompt: 'A photorealistic professional headshot portrait of a confident male renovation contractor in his late 30s. Wearing a clean navy blue collared work shirt, arms crossed, warm genuine smile, short dark hair neatly groomed, standing in front of a softly blurred renovation site background showing framing lumber and drywall. Natural outdoor lighting, shallow depth of field, shot from chest up. Professional corporate portrait photography, approachable and trustworthy demeanor, high resolution.',
  },
  {
    filename: 'team-female.png',
    section: 'About page — Jordan Mitchell',
    prompt: 'A photorealistic professional headshot portrait of a confident female business professional in her early 30s. Wearing a charcoal blazer over a white blouse, warm professional smile, shoulder-length brown hair, standing in front of a softly blurred modern office/showroom background. Natural window lighting from the left, shallow depth of field, shot from chest up. Professional corporate portrait photography, competent and approachable demeanor, high resolution.',
  },
  {
    filename: 'testimonial-home.png',
    section: 'Testimonial backdrop (James K.)',
    prompt: 'A photorealistic interior photograph of a beautifully renovated open-concept living and dining area. Light hardwood floors throughout, modern dining table with six chairs near large windows, living area with comfortable sectional, fresh white walls with subtle warm gray accent wall, recessed lighting and modern ceiling fan, clean baseboards and trim, tasteful minimal decor. Bright natural daylight, clean and fresh post-renovation atmosphere. Professional real estate photography showing a complete home transformation.',
  },
];

async function generateImage(item: typeof IMAGES[0]): Promise<Buffer | null> {
  console.log(`Generating ${item.filename} (${item.section})...`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: {
      // @ts-expect-error - responseModalities is valid but not in type definitions
      responseModalities: ['Text', 'Image'],
    },
  });

  try {
    const response = await model.generateContent(item.prompt);
    const result = response.response;

    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      console.error(`  No candidates for ${item.filename}`);
      return null;
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      console.error(`  No content parts for ${item.filename}`);
      return null;
    }

    for (const part of content.parts) {
      const partWithData = part as { inlineData?: { mimeType: string; data: string } };
      if (partWithData.inlineData?.data) {
        console.log(`  ✓ Generated ${item.filename}`);
        return Buffer.from(partWithData.inlineData.data, 'base64');
      }
    }

    console.error(`  No image data found for ${item.filename}`);
    return null;
  } catch (error) {
    console.error(`  Error generating ${item.filename}:`, error);
    return null;
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'images', 'demo');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating ${IMAGES.length} demo images...\n`);

  let successCount = 0;
  const failures: string[] = [];

  for (const item of IMAGES) {
    // Skip if already generated (allows resuming)
    const outputPath = path.join(outputDir, item.filename);
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 1000) {
        console.log(`  ⏭ Skipping ${item.filename} (already exists, ${Math.round(stats.size / 1024)}KB)`);
        successCount++;
        continue;
      }
    }

    const imageBuffer = await generateImage(item);

    if (imageBuffer) {
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`  Saved: ${outputPath} (${Math.round(imageBuffer.length / 1024)}KB)\n`);
      successCount++;
    } else {
      failures.push(item.filename);
      console.log('');
    }

    // Rate limiting - 2s between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\nDone! ${successCount}/${IMAGES.length} images generated.`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.join(', ')}`);
    console.log('Re-run the script to retry failed images.');
  }
  console.log(`Output: ${outputDir}`);
}

main().catch(console.error);
