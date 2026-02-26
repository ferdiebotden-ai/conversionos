/**
 * Default assembly templates for Ontario renovation contractors.
 * Pre-seeded on-demand when a contractor first visits the Templates tab.
 */

import type { AssemblyTemplateItem } from '@/types/database';

export interface DefaultTemplate {
  name: string;
  category: string;
  description: string;
  items: AssemblyTemplateItem[];
}

export const DEFAULT_ASSEMBLY_TEMPLATES: DefaultTemplate[] = [
  {
    name: 'Standard Kitchen Demolition',
    category: 'kitchen',
    description: 'Complete strip-out of existing kitchen: cabinets, countertops, backsplash, flooring, and debris removal.',
    items: [
      { description: 'Cabinet removal and disposal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 1200 },
      { description: 'Countertop removal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 450 },
      { description: 'Backsplash removal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 350 },
      { description: 'Flooring removal (up to 150 sqft)', category: 'labor', quantity: 1, unit: 'lot', unit_price: 600 },
      { description: 'Dumpster rental (20 yard)', category: 'equipment', quantity: 1, unit: 'ea', unit_price: 550 },
    ],
  },
  {
    name: 'Kitchen Cabinetry Package (Standard)',
    category: 'kitchen',
    description: 'Semi-custom cabinets with soft-close, supply and installation for average 12 linear ft kitchen.',
    items: [
      { description: 'Semi-custom cabinets (12 lin ft)', category: 'materials', quantity: 12, unit: 'lin ft', unit_price: 400 },
      { description: 'Cabinet hardware (handles + knobs)', category: 'materials', quantity: 24, unit: 'ea', unit_price: 8 },
      { description: 'Cabinet installation labour', category: 'labor', quantity: 16, unit: 'hr', unit_price: 75 },
    ],
  },
  {
    name: 'Bathroom Rough-In Package',
    category: 'bathroom',
    description: 'New plumbing and electrical rough-in for full bathroom: toilet, vanity, shower/tub.',
    items: [
      { description: 'Plumbing rough-in (toilet, vanity, shower)', category: 'contract', quantity: 1, unit: 'lot', unit_price: 3500 },
      { description: 'Electrical rough-in (GFI outlets, exhaust fan, lighting)', category: 'contract', quantity: 1, unit: 'lot', unit_price: 2200 },
      { description: 'Permit — plumbing', category: 'permit', quantity: 1, unit: 'ea', unit_price: 250 },
      { description: 'Permit — electrical', category: 'permit', quantity: 1, unit: 'ea', unit_price: 200 },
    ],
  },
  {
    name: 'Bathroom Tile Package (Standard)',
    category: 'bathroom',
    description: 'Floor and shower surround tile for standard bathroom. Porcelain tile, waterproofing, grouting.',
    items: [
      { description: 'Porcelain floor tile (50 sqft)', category: 'materials', quantity: 50, unit: 'sqft', unit_price: 10 },
      { description: 'Shower surround tile (80 sqft)', category: 'materials', quantity: 80, unit: 'sqft', unit_price: 12 },
      { description: 'Waterproofing membrane', category: 'materials', quantity: 80, unit: 'sqft', unit_price: 5 },
      { description: 'Tile installation labour', category: 'labor', quantity: 24, unit: 'hr', unit_price: 65 },
      { description: 'Grout and thinset supplies', category: 'materials', quantity: 1, unit: 'lot', unit_price: 180 },
    ],
  },
  {
    name: 'Basement Framing and Insulation',
    category: 'basement',
    description: 'Frame exterior walls, install vapour barrier, R24 batt insulation for standard 800 sqft basement.',
    items: [
      { description: 'Framing lumber (2x4 studs, plates)', category: 'materials', quantity: 1, unit: 'lot', unit_price: 1800 },
      { description: 'R24 batt insulation (800 sqft walls)', category: 'materials', quantity: 800, unit: 'sqft', unit_price: 2 },
      { description: '6mil poly vapour barrier', category: 'materials', quantity: 1, unit: 'roll', unit_price: 120 },
      { description: 'Framing and insulation labour', category: 'labor', quantity: 32, unit: 'hr', unit_price: 55 },
    ],
  },
  {
    name: 'Basement Drywall and Paint',
    category: 'basement',
    description: 'Drywall installation, taping, sanding, prime and two coats paint for 800 sqft basement.',
    items: [
      { description: 'Drywall sheets (4x8)', category: 'materials', quantity: 40, unit: 'ea', unit_price: 18 },
      { description: 'Drywall mud, tape, and corner bead', category: 'materials', quantity: 1, unit: 'lot', unit_price: 250 },
      { description: 'Drywall hanging and taping labour', category: 'labor', quantity: 40, unit: 'hr', unit_price: 55 },
      { description: 'Interior paint (premium, 2 coats)', category: 'materials', quantity: 10, unit: 'gal', unit_price: 65 },
      { description: 'Painting labour', category: 'labor', quantity: 20, unit: 'hr', unit_price: 45 },
    ],
  },
  {
    name: 'Hardwood Flooring Package',
    category: 'flooring',
    description: 'Engineered hardwood flooring: material, underlayment, installation, and transitions for 200 sqft.',
    items: [
      { description: 'Engineered hardwood flooring', category: 'materials', quantity: 220, unit: 'sqft', unit_price: 12 },
      { description: 'Premium underlayment', category: 'materials', quantity: 220, unit: 'sqft', unit_price: 1.5 },
      { description: 'Transitions and trim pieces', category: 'materials', quantity: 1, unit: 'lot', unit_price: 250 },
      { description: 'Flooring installation labour', category: 'labor', quantity: 12, unit: 'hr', unit_price: 60 },
    ],
  },
  {
    name: 'Electrical Lighting Package',
    category: 'general',
    description: 'Standard pot light installation: 8 LED recessed lights with dimmer switch.',
    items: [
      { description: 'LED pot lights (4-inch, IC rated)', category: 'materials', quantity: 8, unit: 'ea', unit_price: 35 },
      { description: 'Dimmer switch', category: 'materials', quantity: 1, unit: 'ea', unit_price: 45 },
      { description: 'Electrical wiring and supplies', category: 'materials', quantity: 1, unit: 'lot', unit_price: 120 },
      { description: 'Electrician (licensed)', category: 'contract', quantity: 6, unit: 'hr', unit_price: 110 },
    ],
  },
  {
    name: 'Exterior Paint Package',
    category: 'exterior',
    description: 'Full exterior paint: pressure wash, scrape, prime, two coats premium exterior paint (average 1500 sqft home).',
    items: [
      { description: 'Pressure washing', category: 'labor', quantity: 4, unit: 'hr', unit_price: 75 },
      { description: 'Scraping and surface prep', category: 'labor', quantity: 12, unit: 'hr', unit_price: 45 },
      { description: 'Exterior primer', category: 'materials', quantity: 5, unit: 'gal', unit_price: 55 },
      { description: 'Exterior paint (premium, 2 coats)', category: 'materials', quantity: 15, unit: 'gal', unit_price: 75 },
      { description: 'Painting labour', category: 'labor', quantity: 32, unit: 'hr', unit_price: 50 },
    ],
  },
  {
    name: 'Permit and Inspection Package',
    category: 'general',
    description: 'Standard building permit application and required inspections for major renovation.',
    items: [
      { description: 'Building permit application', category: 'permit', quantity: 1, unit: 'ea', unit_price: 500 },
      { description: 'Architectural drawings (basic)', category: 'permit', quantity: 1, unit: 'lot', unit_price: 1500 },
      { description: 'Permit administration and coordination', category: 'labor', quantity: 4, unit: 'hr', unit_price: 85 },
    ],
  },
];
