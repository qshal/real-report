import { analyzeWithAI, getGeminiApiKey } from "@/lib/aiFactChecker";
import { extractClaim, searchTrustedNews, getNewsApiKey } from "@/lib/retrievalVerification";
import { analyzeSourceCredibility } from "@/lib/sourceCredibility";
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

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  const claim = extractClaim(content);

  // Pollinations AI doesn't need API key
  const apiKey = getGeminiApiKey();

  // Run AI analysis (primary) and NewsAPI search (secondary) in parallel with timeouts
  const [aiResult, newsResult] = await Promise.all([
    // AI analysis is critical - 15 second timeout
    withTimeout(
      analyzeWithAI(content, apiKey),
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

  const sourceCredibilityResult = isUrl ? analyzeSourceCredibility(content) : null;
  
  // Combine AI verdict with news verification
  let label: PredictionLabel = aiResult.isFactual ? "real" : "fake";
  let confidence = aiResult.confidence;
  let confidenceReason = "AI verdict";
  let newsContext = "";

  // Adjust based on news verification if available
  if (newsResult.trustedSourcesFound > 0) {
    if (newsResult.fakeProbability < 30) {
      // News sources support the claim
      confidence = Math.min(99, confidence + 10);
      confidenceReason = "AI + verified by trusted news sources";
      newsContext = ` Verified by ${newsResult.trustedSourcesFound} trusted news source(s).`;
    } else if (newsResult.fakeProbability > 70) {
      // News sources contradict the claim
      label = "fake";
      confidence = Math.min(99, confidence + 15);
      confidenceReason = "AI + contradicted by news sources";
      newsContext = ` Contradicted by trusted news sources.`;
    }
  }

  if (sourceCredibilityResult) {
    if (sourceCredibilityResult.credibilityScore >= 0.8) {
      confidence += 6;
      confidenceReason += " + high-credibility source";
    } else if (sourceCredibilityResult.credibilityScore <= 0.3) {
      confidence -= 6;
      confidenceReason += " + low-credibility source penalty";
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
  
  // Calculate fake probability inverse
  const fakeProbability = label === "fake" ? adjustedConfidence : (label === "real" ? 100 - adjustedConfidence : 50);
  
  // Determine risk band
  let riskBand = "medium";
  if (finalTrustScore >= 80) riskBand = "low";
  else if (finalTrustScore <= 30) riskBand = "high";
  else if (finalTrustScore >= 60) riskBand = "low-medium";
  else riskBand = "medium-high";

  return {
    label,
    confidence: adjustedConfidence,
    explanation: `AI verdict: ${label.toUpperCase()}. ${aiResult.explanation}${newsContext}${
      sourceCredibilityResult
        ? ` Source: ${sourceCredibilityResult.domain} (credibility ${Math.round(sourceCredibilityResult.credibilityScore * 100)}%).`
        : ""
    }`,
    modelName: isUrl ? "ai+news+source-credibility" : "ai+news-binary",
    metadata: {
      claim,
      aiAnalyzed: true,
      aiConfidence: aiResult.confidence,
      adjustedConfidence,
      confidenceReason,
      isFactual: aiResult.isFactual,
      keyClaims: aiResult.keyClaims,
      potentialIssues: aiResult.potentialIssues,
      sourceDomain: sourceCredibilityResult?.domain || null,
      sourceCredibility: sourceCredibilityResult?.credibilityScore || null,
      trustScore: finalTrustScore,
      fakeProbability,
      riskBand,
      // Component scores for transparency
      componentScores: {
        aiScore: Math.round(aiScore),
        newsScore: Math.round(newsScore),
        sourceScore: Math.round(sourceScore),
        weights: {
          ai: "40%",
          news: "35%",
          source: "25%"
        }
      },
      newsVerification: {
        trustedSourcesFound: newsResult.trustedSourcesFound,
        supportingArticles: newsResult.supportingArticles.length,
        contradictingArticles: newsResult.contradictingArticles.length,
        fakeProbability: newsResult.fakeProbability,
        reasoning: newsResult.reasoning,
      },
      supportingArticles: newsResult.supportingArticles.slice(0, 5),
      contradictingArticles: newsResult.contradictingArticles.slice(0, 5),
      reasoning: "AI verdict combined with real-time news verification and source credibility",
    },
  };
};
