/**
 * Multi-Room Quote Aggregator
 * Combines estimates for multiple rooms into a single quote
 * with multi-room discount applied.
 *
 * Pure function — no API calls, no async.
 * All values in CAD.
 */

import {
  type CostEstimate,
  type FinishLevel,
  calculateCostEstimate,
  BUSINESS_CONSTANTS,
} from '../ai/knowledge/pricing-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiRoomQuote {
  /** Individual room estimates */
  rooms: { roomType: string; estimate: CostEstimate }[];
  /** Sum of all room base costs (pre-discount, pre-contingency, pre-HST) */
  combinedSubtotal: { low: number; high: number };
  /** Multi-room discount percentage applied */
  multiRoomDiscount: number;
  /** Dollar amount of the discount */
  discountAmount: { low: number; high: number };
  /** Final total after discount + contingency + HST */
  combinedTotal: { low: number; high: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Discount tiers for multi-room projects */
const DISCOUNT_TIERS: { minRooms: number; discount: number }[] = [
  { minRooms: 3, discount: 0.10 },  // 10% off for 3+ rooms
  { minRooms: 2, discount: 0.05 },  // 5% off for 2 rooms
];

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Aggregate cost estimates for multiple rooms into a single quote.
 *
 * @param rooms - Array of room specs (roomType + finishLevel + optional sqft)
 * @param regionalMultiplier - Optional regional cost multiplier (default 1.0)
 * @returns Combined quote with multi-room discount applied, or null if no valid rooms
 */
export function aggregateMultiRoomQuote(
  rooms: { roomType: string; finishLevel: FinishLevel; sqft?: number }[],
  regionalMultiplier: number = 1.0,
): MultiRoomQuote | null {
  if (rooms.length === 0) return null;

  // Calculate estimate for each room
  const roomEstimates: { roomType: string; estimate: CostEstimate }[] = [];
  for (const room of rooms) {
    const estimate = calculateCostEstimate(
      room.roomType,
      room.finishLevel,
      room.sqft,
      regionalMultiplier,
    );
    if (estimate) {
      roomEstimates.push({ roomType: room.roomType, estimate });
    }
  }

  if (roomEstimates.length === 0) return null;

  // Sum base costs (pre-contingency, pre-HST)
  const subtotalLow = roomEstimates.reduce((sum, r) => sum + r.estimate.baseLow, 0);
  const subtotalHigh = roomEstimates.reduce((sum, r) => sum + r.estimate.baseHigh, 0);

  // Determine discount
  const discountRate = getDiscountRate(roomEstimates.length);
  const discountLow = Math.round(subtotalLow * discountRate);
  const discountHigh = Math.round(subtotalHigh * discountRate);

  // Apply discount, then contingency + HST
  const afterDiscountLow = subtotalLow - discountLow;
  const afterDiscountHigh = subtotalHigh - discountHigh;

  const totalLow = Math.round(
    afterDiscountLow *
    (1 + BUSINESS_CONSTANTS.contingencyRate) *
    (1 + BUSINESS_CONSTANTS.hstRate),
  );
  const totalHigh = Math.round(
    afterDiscountHigh *
    (1 + BUSINESS_CONSTANTS.contingencyRate) *
    (1 + BUSINESS_CONSTANTS.hstRate),
  );

  return {
    rooms: roomEstimates,
    combinedSubtotal: { low: subtotalLow, high: subtotalHigh },
    multiRoomDiscount: discountRate,
    discountAmount: { low: discountLow, high: discountHigh },
    combinedTotal: { low: totalLow, high: totalHigh },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine the discount rate based on room count */
function getDiscountRate(roomCount: number): number {
  for (const tier of DISCOUNT_TIERS) {
    if (roomCount >= tier.minRooms) {
      return tier.discount;
    }
  }
  return 0;
}
