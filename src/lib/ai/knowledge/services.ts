/**
 * Services Knowledge Base
 * Detailed service scope information for all AI agents.
 * Content is generic — company name injected via builder functions.
 */

import type { CompanyConfig } from './company';

/**
 * Full services knowledge for AI prompts.
 * Company name in the heading is injected dynamically.
 */
export function buildServicesKnowledge(companyName: string): string {
  return `## Renovation Services — ${companyName}

### Accessibility Modifications
Making homes safe and livable for all ages and abilities:
- Grab bars and support rails
- Walk-in tubs and curbless showers
- Ramp installation and widened doorways
- Non-slip flooring
- Lever handles and accessible cabinetry
- Aging-in-place design consultations

### Home Renovations & Additions
Complete home transformation projects:
- Room additions and extensions
- Structural modifications
- Open-concept conversions
- Second-storey additions
- Garage conversions
- Full-home renovations

### Bathroom Renovations
Transform your bathroom from dated to dream:
- Fixture updates (faucets, showerhead, toilet)
- Vanity replacement (single or double, floating or freestanding)
- Tub-to-shower conversion
- Walk-in shower with glass enclosure
- Tile work (floor, walls, shower niche)
- Heated flooring
- Accessibility upgrades
- Full renovation with layout changes

### Kitchen Renovations
The heart of your home, reimagined:
- Cabinet refresh (paint or reface existing cabinets)
- Full cabinet replacement (stock, semi-custom, or custom)
- Countertops (laminate, quartz, granite, butcher block)
- Backsplash installation (tile, stone, glass)
- Flooring (hardwood, tile, luxury vinyl plank)
- Lighting upgrades (under-cabinet, pendant, recessed)
- Full layout changes (moving walls, plumbing, electrical)
- Islands and peninsulas

### Home Design
Full design services from concept to completion:
- Interior design consultations
- 3D renderings and visualization
- Material and finish selection
- Space planning and layout optimization
- Color consultations

### General Repair & Maintenance
Keeping your home in top condition:
- Drywall repair and patching
- Flooring replacement
- Door and window installation
- Trim and molding work
- General handyman services

### Custom Cabinetry
Bespoke storage solutions built to your specifications:
- Kitchen cabinets
- Bathroom vanities
- Built-in shelving and bookcases
- Entertainment centers
- Closet systems
- Pantry organization

### Net Zero Homes
Energy-efficient homes for a sustainable future:
- High-performance insulation
- Heat pump systems
- Solar panel integration
- Energy recovery ventilators
- Triple-pane windows
- Blower door testing and certification

### Heritage Restoration
Preserving architectural history:
- Period-appropriate renovations
- Heritage-compliant upgrades
- Original feature restoration (moldings, trim, hardware)
- Foundation and structural repair
- Window restoration
- Historical material sourcing

### Basement Finishing
Turn unused space into livable area:
- Basic finish (drywall, flooring, paint, lighting)
- Family room with entertainment area
- Family room with full bathroom
- Full living space (bedroom, bathroom, kitchenette)
- Legal rental suite with separate entrance
- Home office or gym setup

### Full Design-Build
End-to-end project management:
- Concept and design phase
- Permit acquisition
- Construction management
- Subcontractor coordination
- Final inspections and handover

### General Contracting
Professional project management for any scope:
- Coordination of all trades
- Budget management and reporting
- Timeline and scheduling
- Quality control and inspections
- Permit management

### Commercial Renovations
Professional spaces built to perform:
- Office renovations and buildouts
- Retail space design
- Restaurant and hospitality
- Medical and dental offices
- Multi-unit residential
`;
}

/**
 * Brief services summary for AI prompts.
 */
export function buildServicesSummary(config: CompanyConfig): string {
  const serviceCount = config.services.length || 13;
  const serviceList = config.services.length > 0
    ? config.services.map(s => s.name).join(', ')
    : 'Accessibility Modifications, Home Renovations & Additions, Bathrooms, Kitchens, Home Design, General Repair, Custom Cabinetry, Net Zero Homes, Heritage Restoration, Basements, Full Design-Build, General Contracting, and Commercial renovations';
  const certs = config.certifications.length > 0
    ? `, certified ${config.certifications.join(', ')}`
    : '';
  return `${config.name} offers ${serviceCount} service categories: ${serviceList}. Based in ${config.location}${certs}.`;
}

// Legacy static exports — use builder functions with CompanyConfig in async contexts.
export const SERVICES_KNOWLEDGE = buildServicesKnowledge('the company');
export const SERVICES_SUMMARY = `The company offers renovation services including kitchens, bathrooms, basements, flooring, heritage restoration, net-zero homes, accessibility modifications, custom cabinetry, and more.`;
