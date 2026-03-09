export const BLOCKED_KEYWORDS = [
  "wine", "beer", "vodka", "whiskey", "alcohol", "liquor", "rum", "tequila", "brandy",
  "pork", "bacon", "ham", "lard",
  "cross", "jesus", "christ", "crucifix", "bible",
  "sex", "adult", "lingerie", "vibrator", "erotic", "nude", "xxx",
  "tarot", "ouija", "witchcraft",
  "casino", "gambling", "poker", "slot",
  "weed", "marijuana", "cannabis",
  "vape", "cigarette", "smoking", "tobacco", "hookah",
];

export const HALAL_BLOCKED_KEYWORDS = BLOCKED_KEYWORDS;

export function checkContentSafe(text: string): boolean {
  const lower = text.toLowerCase();
  return !BLOCKED_KEYWORDS.some(keyword => lower.includes(keyword));
}

export function checkHalalSafeText(text: string): boolean {
  return checkContentSafe(text);
}
