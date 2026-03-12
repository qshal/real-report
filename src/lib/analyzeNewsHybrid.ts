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

const clampConfidence = (value: number) => Math.max(1, Math.min(99, Math.round(value)));

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  const claim = extractClaim(content);

  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    throw new Error("AI analysis is not configured.");
  }

  const aiResult = await analyzeWithAI(content, geminiKey);
  if (!aiResult || aiResult.confidence === 0) {
    throw new Error(aiResult?.explanation || "AI analysis unavailable. Unable to verify content.");
  }

  const sourceCredibilityResult = isUrl ? analyzeSourceCredibility(content) : null;
  const label: PredictionLabel = aiResult.isFactual ? "real" : "fake";

  let confidence = aiResult.confidence;
  let confidenceReason = "AI verdict";

  if (sourceCredibilityResult) {
    if (sourceCredibilityResult.credibilityScore >= 0.8) {
      confidence += 6;
      confidenceReason = "AI verdict with high-credibility source boost";
    } else if (sourceCredibilityResult.credibilityScore <= 0.3) {
      confidence -= 6;
      confidenceReason = "AI verdict with low-credibility source penalty";
    }
  }

  const adjustedConfidence = clampConfidence(confidence);

  return {
    label,
    confidence: adjustedConfidence,
    explanation: `AI verdict: ${label.toUpperCase()}. ${aiResult.explanation}${
      sourceCredibilityResult
        ? ` Source: ${sourceCredibilityResult.domain} (credibility ${Math.round(sourceCredibilityResult.credibilityScore * 100)}%).`
        : ""
    }`,
    modelName: isUrl ? "ai+source-credibility-binary" : "ai-binary",
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
      reasoning: "Binary AI verdict (real/fake) with source credibility confidence adjustment",
    },
  };
};
