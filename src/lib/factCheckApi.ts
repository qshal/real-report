/**
 * Google Fact Check API Integration
 * 
 * Checks claims against real fact-checkers (PolitiFact, Snopes, etc.)
 * API Docs: https://developers.google.com/fact-check/tools/api
 */

export interface FactCheckClaim {
  text: string;
  claimant?: string;
  claimDate?: string;
}

export interface FactCheckReview {
  publisher: {
    name: string;
    site: string;
  };
  url: string;
  title: string;
  reviewDate?: string;
  textualRating: string;
  languageCode: string;
}

export interface FactCheckResult {
  claim: FactCheckClaim;
  claimReview: FactCheckReview[];
}

export interface FactCheckResponse {
  claims?: FactCheckResult[];
  nextPageToken?: string;
}

// Google Fact Check API endpoint
const FACT_CHECK_API_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search";

// Cache for API responses
const cache = new Map<string, FactCheckResult[]>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Search for fact-checks of a claim
 */
export async function searchFactChecks(
  query: string,
  apiKey?: string
): Promise<FactCheckResult[]> {
  // Check cache first
  const cached = cache.get(query);
  if (cached) {
    return cached;
  }

  // If no API key, return empty (graceful degradation)
  if (!apiKey) {
    console.warn("No Fact Check API key provided");
    return [];
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      query: query.slice(0, 200), // API limit
      languageCode: "en",
      pageSize: "10",
    });

    const response = await fetch(`${FACT_CHECK_API_URL}?${params}`);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.error("Fact Check API: Invalid or missing API key");
      } else if (response.status === 429) {
        console.error("Fact Check API: Rate limit exceeded");
      }
      return [];
    }

    const data: FactCheckResponse = await response.json();
    const results = data.claims || [];

    // Cache results
    cache.set(query, results);
    setTimeout(() => cache.delete(query), CACHE_DURATION);

    return results;
  } catch (error) {
    console.error("Fact Check API error:", error);
    return [];
  }
}

/**
 * Analyze text using fact-checking
 */
export async function analyzeWithFactCheck(
  text: string,
  apiKey?: string
): Promise<{
  hasFactCheck: boolean;
  rating?: string;
  publisher?: string;
  url?: string;
  isReliable?: boolean;
}> {
  // Extract key claims (sentences that look like factual statements)
  const claims = extractClaims(text);
  
  for (const claim of claims) {
    const results = await searchFactChecks(claim, apiKey);
    
    if (results.length > 0) {
      const review = results[0].claimReview[0];
      if (review) {
        return {
          hasFactCheck: true,
          rating: review.textualRating,
          publisher: review.publisher.name,
          url: review.url,
          isReliable: isReliableRating(review.textualRating),
        };
      }
    }
  }

  return { hasFactCheck: false };
}

/**
 * Extract potential factual claims from text
 */
function extractClaims(text: string): string[] {
  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  // Prioritize sentences that look like claims
  const claimPatterns = [
    /\b(is|are|was|were|will be|has|have|had)\b/i,
    /\b(causes?|prevents?|cures?|treats?)\b/i,
    /\b(proves?|shows?|demonstrates?)\b/i,
    /\b(study|research|scientists|experts)\b/i,
  ];

  return sentences.sort((a, b) => {
    const aScore = claimPatterns.reduce((score, pattern) => 
      score + (pattern.test(a) ? 1 : 0), 0);
    const bScore = claimPatterns.reduce((score, pattern) => 
      score + (pattern.test(b) ? 1 : 0), 0);
    return bScore - aScore;
  });
}

/**
 * Determine if a rating indicates reliable information
 */
function isReliableRating(rating: string): boolean {
  const unreliableRatings = [
    "false", "pants on fire", "mostly false", "four pinocchios",
    "fake", "misleading", "incorrect", "not true", "unfounded",
    "debunked", "disproven", "inaccurate"
  ];
  
  const reliableRatings = [
    "true", "mostly true", "accurate", "correct", "verified",
    "confirmed", "legitimate"
  ];
  
  const lowerRating = rating.toLowerCase();
  
  if (unreliableRatings.some(r => lowerRating.includes(r))) {
    return false;
  }
  if (reliableRatings.some(r => lowerRating.includes(r))) {
    return true;
  }
  
  // Ambiguous/unclear rating
  return undefined;
}

/**
 * Get API key from environment
 */
export function getFactCheckApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_FACT_CHECK_API_KEY;
}
