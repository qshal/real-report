import { predictFakeNews } from "@/lib/modelLoader";
import { analyzeWithFactCheck, getFactCheckApiKey } from "@/lib/factCheckApi";
import { analyzeWithAI, getGeminiApiKey } from "@/lib/aiFactChecker";
import { extractClaim, searchTrustedNews, getNewsApiKey } from "@/lib/retrievalVerification";
import { analyzeSourceCredibility } from "@/lib/sourceCredibility";
import { makeFinalDecision, type DecisionInput } from "@/lib/decisionEngine";
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

// Unified analysis using Decision Engine with weighted scoring
export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  
  // Extract main claim
  const claim = extractClaim(content);
  
  // Get metadata/heuristic signals
  const metadata = metadataRiskScore(content);
  
  // Step 1: Source Credibility Analysis (for URLs)
  const sourceCredibilityResult = isUrl 
    ? analyzeSourceCredibility(content)
    : { credibilityScore: 0.5, reputation: "unknown" as const, domain: "", category: "", explanation: "" };
  
  // Step 2: Retrieval-based Verification
  const newsApiKey = getNewsApiKey();
  const retrievalResult = await searchTrustedNews(claim, newsApiKey);
  
  // Step 3: Google Fact Check API
  const factCheckApiKey = getFactCheckApiKey();
  const factCheckResult = await analyzeWithFactCheck(content, factCheckApiKey);
  
  // Step 4: AI Analysis (Gemini)
  const geminiKey = getGeminiApiKey();
  const aiResult = await analyzeWithAI(content, geminiKey);
  
  // Build decision input
  const decisionInput: DecisionInput = {
    heuristicSignals: {
      fakeSignalCount: metadata.indicators.filter(i => i.includes("sensational")).length,
      misleadingSignalCount: metadata.indicators.filter(i => i.includes("speculative")).length,
      sensationalLanguageScore: metadata.score / 100,
      punctuationScore: metadata.indicators.filter(i => i.includes("punctuation")).length,
      capsRatio: 0, // Would need to calculate from original text
    },
    factCheckResult: {
      found: factCheckResult.hasFactCheck,
      isReliable: factCheckResult.isReliable,
      rating: factCheckResult.rating,
      publisher: factCheckResult.publisher,
    },
    retrievalResult: {
      trustedSourcesFound: retrievalResult.trustedSourcesFound,
      fakeProbability: retrievalResult.fakeProbability,
      hasConsensus: retrievalResult.trustedSourcesFound >= 3,
    },
    sourceCredibility: {
      score: sourceCredibilityResult.credibilityScore,
      reputation: sourceCredibilityResult.reputation,
    },
    aiReasoning: aiResult ? {
      isFactual: aiResult.isFactual,
      confidence: aiResult.confidence,
      keyIssues: aiResult.potentialIssues,
    } : {
      isFactual: true,
      confidence: 50,
      keyIssues: [],
    },
  };
  
  // Make final decision using weighted engine
  const verdict = makeFinalDecision(decisionInput);
  
  return {
    label: verdict.label,
    confidence: verdict.confidence,
    explanation: verdict.explanation,
    modelName: "decision-engine-v1",
    metadata: {
      claim,
      fakeScore: verdict.fakeScore,
      componentBreakdown: verdict.componentBreakdown,
      recommendations: verdict.recommendations,
      trustedSourcesFound: retrievalResult.trustedSourcesFound,
      supportingArticles: retrievalResult.supportingArticles.slice(0, 3),
      factCheckFound: factCheckResult.hasFactCheck,
      factCheckRating: factCheckResult.rating,
      sourceCredibility: sourceCredibilityResult,
      aiAnalyzed: !!aiResult,
      keyClaims: aiResult?.keyClaims,
      potentialIssues: aiResult?.potentialIssues,
    },
  };
};
