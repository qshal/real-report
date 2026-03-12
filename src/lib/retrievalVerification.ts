/**
 * Retrieval-Based Fact Verification
 * 
 * Searches trusted news sources to verify claims
 * Uses NewsAPI to fetch articles and analyze consensus
 */

export interface RetrievalResult {
  claim: string;
  trustedSourcesFound: number;
  supportingArticles: NewsArticle[];
  contradictingArticles: NewsArticle[];
  fakeProbability: number;
  reasoning: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  relevanceScore: number;
}

// Trusted news domains
const TRUSTED_DOMAINS = [
  "bbc.com", "bbc.co.uk",
  "reuters.com",
  "apnews.com", "associatedpress.com",
  "nytimes.com", "newyorktimes.com",
  "theguardian.com", "guardian.co.uk",
  "washingtonpost.com",
  "cnn.com", "edition.cnn.com",
  "npr.org",
  "wsj.com", "wallstreetjournal.com",
  "economist.com",
  "aljazeera.com",
  "bloomberg.com",
  "ft.com", "financialtimes.com",
  "politico.com",
  "axios.com",
  "factcheck.org",
  "snopes.com",
  "politifact.com"
];

// Medium credibility domains
const MEDIUM_DOMAINS = [
  "huffpost.com", "huffingtonpost.com",
  "buzzfeednews.com",
  "vice.com",
  "vox.com",
  "slate.com",
  "salon.com",
  "thedailybeast.com",
  "rawstory.com"
];

// Suspicious/low credibility indicators
const SUSPICIOUS_INDICATORS = [
  "blog", "wordpress", "medium.com/@",
  "conspiracy", "truth", "exposed",
  "clickhole", "theonion", "satire"
];

/**
 * Extract main claim from text
 */
export function extractClaim(text: string): string {
  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();
  
  // Split into sentences
  const sentences = cleaned
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300);
  
  if (sentences.length === 0) return cleaned.slice(0, 200);
  
  // Find the most "claim-like" sentence
  const claimPatterns = [
    /\b(is|are|was|were|will be|has|have|had)\b/i,
    /\b(causes?|prevents?|cures?|treats?)\b/i,
    /\b(proves?|shows?|demonstrates?|confirms?)\b/i,
    /\b(study|research|scientists|experts|officials?)\b/i,
    /\b(announced?|reported?|claimed?)\b/i,
  ];
  
  const scored = sentences.map(sentence => {
    const score = claimPatterns.reduce((acc, pattern) => 
      acc + (pattern.test(sentence) ? 1 : 0), 0);
    return { sentence, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].sentence;
}

/**
 * Search for news articles about a claim
 */
export async function searchTrustedNews(
  claim: string,
  newsApiKey?: string
): Promise<RetrievalResult> {
  if (!newsApiKey) {
    return {
      claim,
      trustedSourcesFound: 0,
      supportingArticles: [],
      contradictingArticles: [],
      fakeProbability: 50,
      reasoning: "No NewsAPI key provided. Cannot perform retrieval verification.",
    };
  }
  
  try {
    // Create search query from claim
    const searchQuery = claim
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .slice(0, 8)
      .join(" ");
    
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "20");
    url.searchParams.set("apiKey", newsApiKey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    const articles: NewsArticle[] = (data.articles || [])
      .map((article: {
        title: string;
        url: string;
        source: { name: string };
        publishedAt: string;
        description?: string;
        content?: string;
      }) => ({
        title: article.title,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        snippet: article.description || article.content || "",
        relevanceScore: calculateRelevance(article.title + " " + (article.description || ""), claim),
      }))
      .filter((article: NewsArticle) => isTrustedSource(article.url) || isMediumSource(article.url))
      .sort((a: NewsArticle, b: NewsArticle) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
    
    const trustedCount = articles.filter(a => isTrustedSource(a.url)).length;
    
    // Analyze sentiment/support
    const { supporting, contradicting } = analyzeSentiment(articles, claim);
    
    // Calculate fake probability
    let fakeProbability = 50;
    let reasoning = "";
    
    if (trustedCount >= 3) {
      fakeProbability = 15;
      reasoning = `Found ${trustedCount} trusted sources covering this topic. High credibility.`;
    } else if (trustedCount >= 1) {
      fakeProbability = 35;
      reasoning = `Found ${trustedCount} trusted source(s). Moderate credibility.`;
    } else if (articles.length === 0) {
      fakeProbability = 75;
      reasoning = "No trusted sources found covering this claim. Potentially fabricated.";
    } else {
      fakeProbability = 60;
      reasoning = "Only less-established sources found. Exercise caution.";
    }
    
    // Adjust based on supporting/contradicting
    if (supporting.length > contradicting.length) {
      fakeProbability -= 15;
      reasoning += " Multiple sources corroborate the claim.";
    } else if (contradicting.length > supporting.length) {
      fakeProbability += 20;
      reasoning += " Some sources contradict or debunk this claim.";
    }
    
    return {
      claim,
      trustedSourcesFound: trustedCount,
      supportingArticles: supporting,
      contradictingArticles: contradicting,
      fakeProbability: Math.max(0, Math.min(100, fakeProbability)),
      reasoning,
    };
  } catch (error) {
    console.error("Retrieval verification error:", error);
    return {
      claim,
      trustedSourcesFound: 0,
      supportingArticles: [],
      contradictingArticles: [],
      fakeProbability: 50,
      reasoning: `Error performing news search: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check if URL is from trusted domain
 */
function isTrustedSource(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return TRUSTED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Check if URL is from medium credibility domain
 */
function isMediumSource(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return MEDIUM_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Calculate relevance score between article and claim
 */
function calculateRelevance(articleText: string, claim: string): number {
  const articleWords = articleText.toLowerCase().split(/\W+/);
  const claimWords = claim.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  
  if (claimWords.length === 0) return 0;
  
  const matches = claimWords.filter(word => 
    articleWords.some(aw => aw.includes(word) || word.includes(aw))
  ).length;
  
  return (matches / claimWords.length) * 100;
}

/**
 * Analyze sentiment of articles relative to claim
 */
function analyzeSentiment(
  articles: NewsArticle[],
  claim: string
): { supporting: NewsArticle[]; contradicting: NewsArticle[] } {
  const supporting: NewsArticle[] = [];
  const contradicting: NewsArticle[] = [];
  
  const positiveWords = ["confirms", "supports", "proves", "shows", "finds", "discovers"];
  const negativeWords = ["debunks", "refutes", "false", "fake", "misleading", "hoax", "denies"];
  
  for (const article of articles) {
    const text = (article.title + " " + article.snippet).toLowerCase();
    
    const posScore = positiveWords.filter(w => text.includes(w)).length;
    const negScore = negativeWords.filter(w => text.includes(w)).length;
    
    if (negScore > posScore) {
      contradicting.push(article);
    } else {
      supporting.push(article);
    }
  }
  
  return { supporting, contradicting };
}

/**
 * Get NewsAPI key from environment
 */
export function getNewsApiKey(): string | undefined {
  return import.meta.env.VITE_NEWS_API_KEY;
}
