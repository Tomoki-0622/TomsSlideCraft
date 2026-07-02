// Simple token estimator
// Rough estimate: ~1 token per 3 characters (mix of Japanese and English)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

export const TOKEN_LIMIT = 128000;
export const TOKEN_WARNING_THRESHOLD = Math.floor(TOKEN_LIMIT * 0.8); // ~102k
