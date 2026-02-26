/**
 * Fuzzy matching for contractor prices
 * Levenshtein distance to match AI-generated item names to contractor's uploaded price list.
 */

/**
 * Standard Levenshtein distance between two strings.
 * Case-insensitive comparison.
 */
export function levenshtein(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  const an = al.length;
  const bn = bl.length;

  if (an === 0) return bn;
  if (bn === 0) return an;

  const d: number[][] = Array.from({ length: an + 1 }, () => Array(bn + 1).fill(0) as number[]);
  for (let i = 0; i <= an; i++) d[i]![0] = i;
  for (let j = 0; j <= bn; j++) d[0]![j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = al[i - 1] === bl[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + cost,
      );
    }
  }

  return d[an]![bn]!;
}

interface PriceMatch {
  item_name: string;
  unit_price: number;
  unit: string;
  supplier?: string | null | undefined;
}

/**
 * Find the best matching contractor price for a given item description.
 * Returns the match if Levenshtein distance < threshold (default 3).
 */
export function findMatchingPrice(
  itemName: string,
  contractorPrices: PriceMatch[],
  threshold = 3,
): PriceMatch | null {
  if (!itemName || contractorPrices.length === 0) return null;

  let bestMatch: PriceMatch | null = null;
  let bestDistance = Infinity;

  for (const price of contractorPrices) {
    const distance = levenshtein(itemName, price.item_name);
    if (distance < bestDistance && distance < threshold) {
      bestDistance = distance;
      bestMatch = price;
    }
  }

  return bestMatch;
}

/**
 * Count how many line items have matching contractor prices.
 * Used for the "Using your prices (N items)" indicator in the quote editor.
 */
export function countPriceMatches(
  lineItemDescriptions: string[],
  contractorPrices: PriceMatch[],
  threshold = 3,
): number {
  if (contractorPrices.length === 0) return 0;

  let count = 0;
  for (const desc of lineItemDescriptions) {
    if (findMatchingPrice(desc, contractorPrices, threshold)) {
      count++;
    }
  }
  return count;
}
