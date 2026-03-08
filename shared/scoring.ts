import type { Product } from "./schema";

export interface ProductScores {
  estimatedMargin: number;
  trendScore: number;
  saturationScore: number;
  opportunityScore: number;
}

export function calculateMargin(supplierPrice: number, sellPrice: number): number {
  if (sellPrice <= 0) return 0;
  return Math.round(((sellPrice - supplierPrice) / sellPrice) * 1000) / 10;
}

export function calculateTrendScore(product: {
  supplierPrice: number;
  sellPrice: number;
  margin: number;
  category?: string | null;
  niche?: string | null;
  existingScore?: number | null;
}): number {
  if (product.existingScore != null && product.existingScore > 0) {
    return clamp(product.existingScore);
  }

  let base = 50;

  if (product.margin >= 80) base += 15;
  else if (product.margin >= 60) base += 10;
  else if (product.margin >= 40) base += 5;

  if (product.sellPrice >= 20 && product.sellPrice <= 50) base += 10;
  else if (product.sellPrice < 20) base += 5;

  if (product.supplierPrice <= 10) base += 5;

  const categoryBoost: Record<string, number> = {
    "Electronics": 8,
    "Home & Living": 6,
    "Home Decor": 6,
    "Kitchen": 5,
    "Health & Wellness": 7,
    "Beauty": 5,
    "Pet Supplies": 4,
    "Travel": 3,
  };
  base += categoryBoost[product.category ?? ""] ?? 0;

  return clamp(base + jitter(product.supplierPrice));
}

export function calculateSaturationScore(product: {
  supplierPrice: number;
  sellPrice: number;
  margin: number;
  category?: string | null;
  existingScore?: number | null;
}): number {
  if (product.existingScore != null && product.existingScore > 0) {
    return clamp(product.existingScore);
  }

  let base = 40;

  if (product.sellPrice < 15) base += 15;
  else if (product.sellPrice < 25) base += 10;
  else if (product.sellPrice > 40) base -= 5;

  if (product.margin > 85) base -= 5;
  else if (product.margin < 50) base += 10;

  const categorySaturation: Record<string, number> = {
    "Electronics": 10,
    "Home & Living": 5,
    "Home Decor": 3,
    "Kitchen": 5,
    "Health & Wellness": 7,
    "Beauty": 8,
    "Pet Supplies": 4,
    "Travel": 6,
  };
  base += categorySaturation[product.category ?? ""] ?? 0;

  return clamp(base + jitter(product.sellPrice));
}

export function calculateOpportunityScore(
  trendScore: number,
  saturationScore: number,
  margin: number
): number {
  const trendWeight = 0.4;
  const antiSaturationWeight = 0.3;
  const marginWeight = 0.3;

  const marginNormalized = Math.max(0, Math.min(margin, 100));
  const antiSaturation = 100 - saturationScore;

  const raw =
    trendScore * trendWeight +
    antiSaturation * antiSaturationWeight +
    marginNormalized * marginWeight;

  return clamp(Math.round(raw));
}

export function scoreProduct(product: Product): Product {
  const supplierPrice = Number(product.supplierPrice) || 0;
  const sellPrice = Number(product.suggestedSellPrice) || 0;
  const margin = calculateMargin(supplierPrice, sellPrice);

  const trendScore = calculateTrendScore({
    supplierPrice,
    sellPrice,
    margin,
    category: product.category,
    niche: product.niche,
    existingScore: product.trendScore,
  });

  const saturationScore = calculateSaturationScore({
    supplierPrice,
    sellPrice,
    margin,
    category: product.category,
    existingScore: product.saturationScore,
  });

  const opportunityScore = calculateOpportunityScore(trendScore, saturationScore, margin);

  return {
    ...product,
    estimatedMargin: String(margin),
    trendScore,
    saturationScore,
    opportunityScore,
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function jitter(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return Math.round((x - Math.floor(x)) * 10 - 5);
}
