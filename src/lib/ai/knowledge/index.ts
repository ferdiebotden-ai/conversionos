/**
 * Knowledge Base Index
 * Re-exports all knowledge modules.
 *
 * Builder functions accept CompanyConfig for dynamic content.
 * Static exports use fallback values for backward compatibility.
 */

export { COMPANY_PROFILE, COMPANY_SUMMARY, buildCompanyProfile, buildCompanySummary, getCompanyConfig } from './company';
export type { CompanyConfig } from './company';
export { SERVICES_KNOWLEDGE, SERVICES_SUMMARY, buildServicesKnowledge, buildServicesSummary } from './services';
export { PRICING_FULL, PRICING_SUMMARY } from './pricing';
export {
  ONTARIO_GENERAL_KNOWLEDGE,
  ONTARIO_BUDGET_KNOWLEDGE,
  ONTARIO_DESIGN_KNOWLEDGE,
} from './ontario-renovation';
export { SALES_TRAINING } from './sales-techniques';
