import type { Product } from "./schema";

const EXCLUDED_KEYWORDS = [
  "phone", "smartphone", "iphone", "samsung galaxy", "pixel", "motorola",
  "laptop", "macbook", "notebook", "chromebook",
  "tablet", "ipad",
  "television", "tv ", " tv", "monitor",
  "refrigerator", "washing machine", "dishwasher", "microwave oven",
  "air conditioner", "heater",
  "printer", "scanner",
  "desktop computer", "pc tower",
  "gaming console", "playstation", "xbox", "nintendo switch",
];

const EXCLUDED_CATEGORIES_EXACT = [
  "Phones", "Smartphones", "Laptops", "Tablets", "Computers",
  "Large Appliances", "Major Appliances",
];

const SUPPLIER_SOURCES = ["aliexpress", "alibaba", "cj", "cjdropshipping"];

const DISCOVERY_ONLY_SOURCES = ["amazon"];

const SUPPORTED_SOURCES = ["aliexpress", "alibaba", "amazon", "cj", "cjdropshipping"];

export interface QualificationResult {
  isPublishable: boolean;
  reasons: string[];
}

export function qualifyProduct(product: Product): QualificationResult {
  const reasons: string[] = [];
  const title = (product.title || "").toLowerCase();
  const category = product.category || "";
  const source = (product.source || "").toLowerCase();
  const supplierSource = (product.supplierSource || source || "").toLowerCase();
  const supplierPrice = Number(product.supplierPrice) || 0;
  const supplierPriceUSD = supplierPrice / 3.75;
  const ordersCount = product.ordersCount || 0;
  const rating = product.rating != null ? Number(product.rating) : 0;
  const opportunityScore = product.opportunityScore || 0;

  if (source && !SUPPORTED_SOURCES.includes(source)) {
    reasons.push("unsupported_source");
  }

  if (!SUPPLIER_SOURCES.includes(supplierSource) && DISCOVERY_ONLY_SOURCES.includes(source)) {
    reasons.push("no_supplier");
  }

  for (const kw of EXCLUDED_KEYWORDS) {
    if (title.includes(kw)) {
      reasons.push("excluded_keyword");
      break;
    }
  }

  if (EXCLUDED_CATEGORIES_EXACT.includes(category)) {
    reasons.push("excluded_category");
  }

  if (!DISCOVERY_ONLY_SOURCES.includes(source) && supplierPrice <= 0) {
    reasons.push("no_supplier_price");
  }

  if (supplierPriceUSD > 80) {
    reasons.push("price_too_high");
  }

  if (supplierPriceUSD < 0.5 && supplierPriceUSD > 0) {
    reasons.push("price_too_low");
  }

  if (opportunityScore < 55) {
    reasons.push("low_score");
  }

  if (rating > 0 && rating < 3.5) {
    reasons.push("low_rating");
  }

  return {
    isPublishable: reasons.length === 0,
    reasons,
  };
}

export function isProductPublishable(product: Product): boolean {
  return qualifyProduct(product).isPublishable;
}

export function getSourceRole(source: string | null): "supplier" | "discovery" | "both" {
  if (!source) return "both";
  const s = source.toLowerCase();
  if (DISCOVERY_ONLY_SOURCES.includes(s)) return "discovery";
  if (SUPPLIER_SOURCES.includes(s)) return "both";
  return "both";
}

export function getSourceRoleLabel(source: string | null): string {
  const role = getSourceRole(source);
  if (role === "discovery") return "مصدر اكتشاف";
  if (role === "supplier") return "مورّد";
  return "مورّد";
}
