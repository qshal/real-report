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

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  const claim = extractClaim(content);

  // Pollinations AI doesn't need API key
  const apiKey = getGeminiApiKey();

  // Run AI analysis and NewsAPI search in parallel
  const [aiResult, newsResult] = await Promise.all([
    analyzeWithAI(content, apiKey),
    searchTrustedNews(claim, getNewsApiKey())
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
      newsVerification: {
        trustedSourcesFound: newsResult.trustedSourcesFound,
        supportingArticles: newsResult.supportingArticles.length,
        contradictingArticles: newsResult.contradictingArticles.length,
        fakeProbability: newsResult.fakeProbability,
      },
      reasoning: "AI verdict combined with real-time news verification and source credibility",
    },
  };
};
