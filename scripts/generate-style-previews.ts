/**
 * Generate Style Preview Images
 * Uses Gemini to generate sample images for each design style
 * Run with: npx tsx scripts/generate-style-previews.ts
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

const STYLES = [
  {
    id: 'modern',
    prompt: 'A beautiful modern kitchen interior design. Clean lines, handleless white cabinets, waterfall quartz island, integrated appliances, warm LED under-cabinet lighting, large format gray floor tiles. Photorealistic, professional interior photography, 4K quality.',
  },
  {
    id: 'traditional',
    prompt: 'A beautiful traditional kitchen interior design. Rich wood cabinets with ornate molding, marble countertops, farmhouse sink, brass hardware, crown molding, warm hardwood floors, classic pendant lights. Photorealistic, professional interior photography, 4K quality.',
  },
  {
    id: 'farmhouse',
    prompt: 'A beautiful farmhouse kitchen interior design. White shaker cabinets, butcher block countertops, apron front sink, open shelving, shiplap walls, vintage-style fixtures, reclaimed wood accents, warm and cozy atmosphere. Photorealistic, professional interior photography, 4K quality.',
  },
  {
    id: 'industrial',
    prompt: 'A beautiful industrial kitchen interior design. Exposed brick wall, black metal cabinets, concrete countertops, stainless steel appliances, Edison bulb pendant lights, open metal shelving, urban loft aesthetic. Photorealistic, professional interior photography, 4K quality.',
  },
  {
    id: 'minimalist',
    prompt: 'A beautiful minimalist kitchen interior design. All-white seamless cabinets, hidden handles, pure white countertops, integrated appliances, no visible clutter, simple geometric forms, abundant natural light, zen-like atmosphere. Photorealistic, professional interior photography, 4K quality.',
  },
  {
    id: 'contemporary',
    prompt: 'A beautiful contemporary kitchen interior design. Two-tone cabinets navy and white, bold geometric backsplash, statement pendant lights, waterfall edge island, mixed metals, current 2024 trends, artistic touches. Photorealistic, professional interior photography, 4K quality.',
  },
];

async function generateStyleImage(style: typeof STYLES[0]): Promise<Buffer | null> {
  console.log(`Generating ${style.id} style preview...`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: {
      // @ts-expect-error - responseModalities is valid but not in type definitions
      responseModalities: ['Text', 'Image'],
    },
  });

  try {
    const response = await model.generateContent(style.prompt);
    const result = response.response;

    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      console.error(`No candidates for ${style.id}`);
      return null;
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      console.error(`No content parts for ${style.id}`);
      return null;
    }

    // Find the image part
    for (const part of content.parts) {
      const partWithData = part as { inlineData?: { mimeType: string; data: string } };
      if (partWithData.inlineData?.data) {
        console.log(`✓ Generated ${style.id} style preview`);
        return Buffer.from(partWithData.inlineData.data, 'base64');
      }
    }

    console.error(`No image found for ${style.id}`);
    return null;
  } catch (error) {
    console.error(`Error generating ${style.id}:`, error);
    return null;
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'images', 'styles');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating style preview images...\n');

  for (const style of STYLES) {
    const imageBuffer = await generateStyleImage(style);

    if (imageBuffer) {
      const outputPath = path.join(outputDir, `${style.id}.png`);
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`Saved: ${outputPath}\n`);
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\nDone! Images saved to public/images/styles/');
}

main().catch(console.error);
