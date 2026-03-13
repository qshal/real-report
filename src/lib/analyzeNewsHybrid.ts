import { analyzeWithAI, getGeminiApiKey } from "@/lib/aiFactChecker";
import { extractClaim, searchTrustedNews, getNewsApiKey } from "@/lib/retrievalVerification";
import { analyzeSourceCredibility } from "@/lib/sourceCredibility";
import { generateArticleHash } from "@/lib/blockchain";
import type { PredictionLabel } from "@/lib/fakeNewsAnalyzer";

export type AnalyzeNewsPayload =
  | {
      inputType: "text";
      text: string;
    }
  | {
      inputType: "url";
      url: string;
    };

export type HybridAnalysisResult = {
  label: PredictionLabel;
  confidence: number;
  explanation: string;
  modelName: string;
  metadata: Record<string, unknown>;
  blockchain?: {
    contentHash: string;
    resultHash: string;
    stored: boolean;
    txHash?: string;
    verified?: boolean;
    error?: string;
  };
};

const clampConfidence = (value: number) => Math.max(1, Math.min(99, Math.round(value)));

// Timeout wrapper for promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]).catch(() => fallback);
};

/**
 * Fetch and extract content from a URL
 * Uses multiple strategies including CORS proxies and fallback methods
 */
async function fetchUrlContent(url: string): Promise<{ title: string; content: string; error?: string }> {
  try {
    // Strategy 1: Try direct fetch first (works for CORS-enabled sites)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAnalyzer/1.0)',
        },
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const html = await response.text();
        const extracted = extractContentFromHtml(html);
        if (extracted.content.length > 50) {
          return extracted;
        }
      }
    } catch (err) {
      console.log('Direct fetch failed, trying proxies:', err);
    }

    // Strategy 2: Try multiple CORS proxies with better error handling
    const corsProxies = [
      { 
        name: 'AllOrigins',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        extract: async (res: Response) => {
          const data = await res.json();
          if (data.status?.http_code && data.status.http_code !== 200) {
            throw new Error(`HTTP ${data.status.http_code}`);
          }
          return data.contents || '';
        }
      },
      { 
        name: 'CorsProxy',
        url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
        extract: async (res: Response) => res.text()
      },
      {
        name: 'ThingProxy',
        url: `https://thingproxy.freeboard.io/fetch/${url}`,
        extract: async (res: Response) => res.text()
      },
      {
        name: 'CorsAnywhere',
        url: `https://cors-anywhere.herokuapp.com/${url}`,
        extract: async (res: Response) => res.text()
      }
    ];
    
    let bestResult = { title: "", content: "", error: "" };
    
    for (const proxy of corsProxies) {
      try {
        console.log(`Trying ${proxy.name} proxy...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        
        const response = await fetch(proxy.url, {
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'X-Requested-With': 'XMLHttpRequest',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await proxy.extract(response);
          if (html && html.length > 100) {
            const extracted = extractContentFromHtml(html);
            if (extracted.content.length > bestResult.content.length) {
              bestResult = extracted;
              if (extracted.content.length > 200) {
                console.log(`Successfully fetched content via ${proxy.name}`);
                return extracted;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`${proxy.name} proxy failed:`, err);
        continue;
      }
    }
    
    // Strategy 3: If we have some content, return it
    if (bestResult.content.length > 50) {
      return bestResult;
    }
    
    // Strategy 4: Fallback to URL analysis
    return analyzeUrlFallback(url);
    
  } catch (error) {
    console.error('All URL fetch strategies failed:', error);
    return analyzeUrlFallback(url);
  }
}

/**
 * Extract content from HTML string
 */
function extractContentFromHtml(html: string): { title: string; content: string; error?: string } {
  try {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : "";
    
    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : "";
    
    // Extract Open Graph title if regular title is missing
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    const finalTitle = title || (ogTitleMatch ? ogTitleMatch[1].trim() : "");
    
    // Extract article content with improved selectors
    let articleContent = '';
    
    // Try semantic HTML5 elements first
    const semanticMatches = [
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
      html.match(/<section[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/section>/i),
    ];
    
    for (const match of semanticMatches) {
      if (match && match[1]) {
        articleContent = match[1];
        break;
      }
    }
    
    // Try common content class patterns
    if (!articleContent) {
      const classPatterns = [
        /<div[^>]*class=["'][^"']*(?:content|article|post|story|text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id=["'][^"']*(?:content|article|post|story|text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class=["'][^"']*entry[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      ];
      
      for (const pattern of classPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          articleContent = match[1];
          break;
        }
      }
    }
    
    // Fallback to body content
    if (!articleContent) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      articleContent = bodyMatch ? bodyMatch[1] : html;
    }
    
    // Clean the content more thoroughly
    let content = articleContent
      // Remove scripts, styles, and navigation
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
      // Remove comments and ads
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<div[^>]*class=["'][^"']*(?:ad|advertisement|banner|sidebar)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, ' ')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Limit content length
    content = content.slice(0, 5000);
    
    // Use meta description if content is too short
    if (content.length < 100 && metaDescription) {
      content = metaDescription;
    }
    
    // Ensure we have some content
    if (!content && finalTitle) {
      content = `Article title: ${finalTitle}`;
    }
    
    return { 
      title: finalTitle, 
      content: content || 'No content could be extracted from this URL',
    };
  } catch (error) {
    console.error('HTML extraction error:', error);
    return {
      title: "",
      content: "",
      error: error instanceof Error ? error.message : 'HTML parsing failed'
    };
  }
}

/**
 * Fallback analysis when URL content cannot be fetched
 */
function analyzeUrlFallback(url: string): { title: string; content: string; error?: string } {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    // Extract potential title from URL path
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const potentialTitle = lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.(html|htm|php|asp|aspx)$/i, '')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const content = `URL Analysis Fallback:
Domain: ${domain}
Path: ${path}
Potential Title: ${potentialTitle}

Note: Could not fetch the actual article content. Analysis will be based on URL structure and domain reputation only.`;
    
    return {
      title: potentialTitle || `Article from ${domain}`,
      content,
      error: 'Could not fetch article content - using URL analysis fallback'
    };
  } catch (error) {
    return {
      title: "",
      content: `URL: ${url}\n\nNote: Could not parse or fetch content from this URL.`,
      error: 'URL parsing failed'
    };
  }
}

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const isUrl = payload.inputType === "url";
  
  // Fetch URL content if it's a URL
  let urlContent: { title: string; content: string; error?: string } | null = null;
  let contentToAnalyze: string;
  
  if (isUrl) {
    const url = payload.url;
    urlContent = await fetchUrlContent(url);
    
    if (urlContent.error || !urlContent.content || urlContent.content === 'No content extracted') {
      // Fallback: analyze just the URL if we can't fetch content
      contentToAnalyze = `URL: ${url}\nTitle: ${urlContent.title || 'Unknown'}\nNote: Could not fetch article content. Analyzing based on URL and title only.`;
    } else {
      contentToAnalyze = `ARTICLE FROM URL: ${url}\n\nTITLE: ${urlContent.title || 'No title'}\n\nARTICLE CONTENT:\n${urlContent.content}\n\nAnalyze the above article content for factual accuracy.`;
    }
  } else {
    contentToAnalyze = payload.text;
  }
  
  const claim = extractClaim(contentToAnalyze);

  // Pollinations AI doesn't need API key
  const apiKey = getGeminiApiKey();

  // Run AI analysis (primary) and NewsAPI search (secondary) in parallel with timeouts
  const [aiResult, newsResult] = await Promise.all([
    // AI analysis is critical - 15 second timeout
    withTimeout(
      analyzeWithAI(contentToAnalyze, apiKey),
      15000,
      null
    ),
    // NewsAPI is supplementary - 5 second timeout, fallback to empty result
    withTimeout(
      searchTrustedNews(claim, getNewsApiKey()),
      5000,
      {
        claim,
        trustedSourcesFound: 0,
        supportingArticles: [],
        contradictingArticles: [],
        fakeProbability: 50,
        reasoning: "NewsAPI timeout - using AI-only analysis",
      }
    )
  ]);

  if (!aiResult || aiResult.confidence === 0) {
    return {
      label: "misleading",
      confidence: 50,
      explanation: aiResult?.explanation || "AI analysis failed. Please check your API key.",
      modelName: "api-error",
      metadata: { claim, error: aiResult?.explanation || "API failure" },
    };
  }

  const sourceCredibilityResult = isUrl ? analyzeSourceCredibility(payload.url) : null;
  
  // AI-ONLY VERDICT: Use only AI for the final label and confidence
  // News and Source are shown for transparency but don't affect the verdict
  const label: PredictionLabel = aiResult.isFactual ? "real" : "fake";
  const confidence = aiResult.confidence;
  const confidenceReason = "AI verdict";
  
  // Build context info for display only (doesn't affect verdict)
  let newsContext = "";
  if (newsResult.trustedSourcesFound > 0) {
    if (newsResult.fakeProbability < 30) {
      newsContext = ` Verified by ${newsResult.trustedSourcesFound} trusted news source(s).`;
    } else if (newsResult.fakeProbability > 70) {
      newsContext = ` Contradicted by trusted news sources.`;
    }
  }

  const adjustedConfidence = clampConfidence(confidence);

  // Calculate weighted trust score from three components:
  // 1. AI Score (40% weight) - from Pollinations AI analysis
  // 2. NLP/News Score (35% weight) - from NewsAPI verification
  // 3. Source Credibility Score (25% weight) - from domain reputation
  
  // Normalize AI score to 0-100 (already in that range)
  const aiScore = aiResult.confidence;
  
  // Normalize News/NLP score (inverse of fake probability, 0-100)
  const newsScore = newsResult.trustedSourcesFound > 0 
    ? 100 - newsResult.fakeProbability 
    : 50; // Neutral if no news data
  
  // Normalize Source Credibility score (0-100)
  const sourceScore = sourceCredibilityResult 
    ? sourceCredibilityResult.credibilityScore * 100 
    : 50; // Neutral if no URL analysis
  
  // Weighted calculation
  const finalTrustScore = Math.round(
    (aiScore * 0.40) +      // AI: 40% weight
    (newsScore * 0.35) +    // News/NLP: 35% weight
    (sourceScore * 0.25)    // Source: 25% weight
  );

  // Return a basic result for now - this function needs completion
  return {
    label: aiResult.isFactual ? "real" : "fake",
    confidence: clampConfidence(aiResult.confidence),
    explanation: `AI verdict: ${aiResult.isFactual ? 'REAL' : 'FAKE'}. ${aiResult.explanation}`,
    modelName: "truthchain-ai",
    metadata: {
      claim: extractClaim(contentToAnalyze),
      finalTrustScore,
      aiScore: Math.round(aiResult.confidence),
      newsScore: Math.round(newsScore),
      sourceScore: Math.round(sourceScore),
    },
  };
};

// Alternative implementation - just wraps the main function
export const analyzeNewsHybridWithDuplicateCheck = analyzeNewsHybrid;
