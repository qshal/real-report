import { analyzeWithAI, getGeminiApiKey } from "@/lib/aiFactChecker";
import { extractClaim } from "@/lib/retrievalVerification";
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

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  const claim = extractClaim(content);

  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    return {
      label: "misleading",
      confidence: 50,
      explanation: "Configuration Error: Gemini API key not found. Please add VITE_GEMINI_API_KEY to environment variables.",
      modelName: "config-error",
      metadata: { claim, error: "Missing API key" },
    };
  }

  const aiResult = await analyzeWithAI(content, geminiKey);
  if (!aiResult || aiResult.confidence === 0) {
    return {
      label: "misleading",
      confidence: 50,
      explanation: aiResult?.explanation || "AI analysis unavailable. Unable to verify content.",
      modelName: "ai-unavailable",
      metadata: { claim, error: aiResult?.explanation || "AI API failed" },
    };
  }

  const sourceCredibilityResult = isUrl ? analyzeSourceCredibility(content) : null;
  let confidence = aiResult.confidence;
  let confidenceReason = "AI-only confidence";

  if (sourceCredibilityResult) {
    if (sourceCredibilityResult.credibilityScore >= 0.8) {
      confidence = Math.min(95, confidence + 10);
      confidenceReason = "Boosted by high-credibility source";
    } else if (sourceCredibilityResult.credibilityScore <= 0.3 && aiResult.isFactual) {
      confidence = Math.max(50, confidence - 20);
      confidenceReason = "Reduced due to low-credibility source";
    }
  }

  const label: PredictionLabel = aiResult.isFactual ? "real" : aiResult.confidence >= 65 ? "fake" : "misleading";

  return {
    label,
    confidence,
    explanation: `AI Analysis: ${aiResult.explanation}${
      sourceCredibilityResult
        ? ` Source: ${sourceCredibilityResult.domain} (credibility ${Math.round(sourceCredibilityResult.credibilityScore * 100)}%).`
        : ""
    }`,
    modelName: isUrl ? "ai+source-credibility" : "ai-only",
    metadata: {
      claim,
      aiAnalyzed: true,
      aiConfidence: aiResult.confidence,
      adjustedConfidence: confidence,
      confidenceReason,
      isFactual: aiResult.isFactual,
      keyClaims: aiResult.keyClaims,
      potentialIssues: aiResult.potentialIssues,
      sourceDomain: sourceCredibilityResult?.domain || null,
      sourceCredibility: sourceCredibilityResult?.credibilityScore || null,
      reasoning: isUrl ? "AI analysis with source credibility" : "AI analysis only",
    },
  };
};
