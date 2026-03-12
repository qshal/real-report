import { predictFakeNews } from "@/lib/modelLoader";
import { analyzeWithFactCheck, getFactCheckApiKey } from "@/lib/factCheckApi";
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

// Risk scoring based on metadata signals
const metadataRiskScore = (text: string) => {
  const sensationalSignals = ["shocking", "they don't want you to know", "miracle cure", "100% proven", "secret", "hoax"];
  const speculativeSignals = ["sources say", "viral", "breaking", "unverified", "rumor", "maybe"];
  
  const lowerText = text.toLowerCase();
  const sensationalHits = sensationalSignals.filter(s => lowerText.includes(s)).length;
  const speculativeHits = speculativeSignals.filter(s => lowerText.includes(s)).length;
  const punctuationBoost = (lowerText.match(/!{2,}|\?{2,}/g) ?? []).length;
  
  const score = Math.max(0, Math.min(100, 
    sensationalHits * 16 + speculativeHits * 10 + punctuationBoost * 5
  ));
  
  return {
    score,
    indicators: [
      sensationalHits > 0 ? `sensational_language:${sensationalHits}` : null,
      speculativeHits > 0 ? `speculative_claims:${speculativeHits}` : null,
      punctuationBoost > 0 ? `excessive_punctuation:${punctuationBoost}` : null,
    ].filter(Boolean),
  };
};

// Client-side analysis using ML model + Fact Check API
export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  
  // Step 1: Check against fact-checking databases
  const apiKey = getFactCheckApiKey();
  const factCheckResult = await analyzeWithFactCheck(content, apiKey);
  
  // If found in fact-check database, use that result
  if (factCheckResult.hasFactCheck && factCheckResult.isReliable !== undefined) {
    const label: PredictionLabel = factCheckResult.isReliable ? "real" : "fake";
    const confidence = 85; // High confidence since it's verified by fact-checkers
    
    return {
      label,
      confidence,
      explanation: `Verified by ${factCheckResult.publisher}: "${factCheckResult.rating}". ${factCheckResult.isReliable ? "This claim has been fact-checked and found to be accurate." : "This claim has been fact-checked and found to be false or misleading."}`,
      modelName: "fact-check-api",
      metadata: {
        factCheckSource: factCheckResult.publisher,
        factCheckUrl: factCheckResult.url,
        factCheckRating: factCheckResult.rating,
        verified: true,
      },
    };
  }
  
  // Step 2: Fall back to ML model if not in fact-check database
  const prediction = predictFakeNews(content);
  
  // Get metadata risk score
  const metadata = metadataRiskScore(content);
  
  // Calculate fake probability based on prediction
  const fakeProbability = prediction.label === "fake" 
    ? prediction.confidence 
    : prediction.label === "misleading" 
      ? 50 
      : 100 - prediction.confidence;
  
  const trustScore = Math.max(1, Math.min(99, 100 - fakeProbability));
  const riskBand = fakeProbability >= 70 ? "high" : fakeProbability >= 45 ? "medium" : "low";
  
  return {
    label: prediction.label,
    confidence: prediction.confidence,
    explanation: prediction.explanation,
    modelName: "trained-ml-model-v1",
    metadata: {
      metadataRiskScore: metadata.score,
      indicators: metadata.indicators,
      fakeProbability,
      trustScore,
      riskBand,
      factChecked: false,
    },
  };
};
