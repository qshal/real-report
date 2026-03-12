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

// AI-First analysis: Use Gemini as primary, only combine with other signals when AI is uncertain
export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  
  // Extract main claim
  const claim = extractClaim(content);
  
  // Step 1: AI Analysis (Gemini) - PRIMARY METHOD
  const geminiKey = getGeminiApiKey();
  const aiResult = await analyzeWithAI(content, geminiKey);
  
  // If AI has high confidence (>70%), use AI-only decision
  if (aiResult && aiResult.confidence > 70) {
    const label: PredictionLabel = aiResult.isFactual ? "real" : "fake";
    const confidence = aiResult.confidence;
    
    // Build AI-only explanation
    let explanation = `AI Analysis: ${aiResult.explanation}`;
    
    if (!aiResult.isFactual && aiResult.potentialIssues.length > 0) {
      explanation += ` Issues identified: ${aiResult.potentialIssues.join("; ")}.`;
    }
    
    return {
      label,
      confidence,
      explanation,
      modelName: "gemini-ai-primary",
      metadata: {
        claim,
        aiAnalyzed: true,
        aiConfidence: aiResult.confidence,
        isFactual: aiResult.isFactual,
        keyClaims: aiResult.keyClaims,
        potentialIssues: aiResult.potentialIssues,
        reasoning: "High-confidence AI assessment used as primary signal",
      },
    };
  }
  
  // Step 2: Source Credibility Analysis (for URLs) - SECONDARY
  const sourceCredibilityResult = isUrl 
    ? analyzeSourceCredibility(content)
    : { credibilityScore: 0.5, reputation: "unknown" as const, domain: "", category: "", explanation: "" };
  
  // If source is highly credible and AI is uncertain, trust the source
  if (sourceCredibilityResult.credibilityScore >= 0.8 && (!aiResult || aiResult.confidence <= 70)) {
    return {
      label: "real",
      confidence: Math.round(sourceCredibilityResult.credibilityScore * 100),
      explanation: `Source Analysis: ${sourceCredibilityResult.explanation} The content comes from a highly credible source with established editorial standards.`,
      modelName: "source-credibility-primary",
      metadata: {
        claim,
        domain: sourceCredibilityResult.domain,
        credibilityScore: sourceCredibilityResult.credibilityScore,
        category: sourceCredibilityResult.category,
        aiConfidence: aiResult?.confidence,
        reasoning: "High-credibility source used when AI confidence is moderate",
      },
    };
  }
  
  // Step 3: Google Fact Check API - TERTIARY
  const factCheckApiKey = getFactCheckApiKey();
  const factCheckResult = await analyzeWithFactCheck(content, factCheckApiKey);
  
  if (factCheckResult.hasFactCheck && factCheckResult.isReliable !== undefined) {
    const label: PredictionLabel = factCheckResult.isReliable ? "real" : "fake";
    
    return {
      label,
      confidence: 90,
      explanation: `Fact-Check Verification: ${factCheckResult.publisher} rates this as "${factCheckResult.rating}".`,
      modelName: "fact-check-verified",
      metadata: {
        claim,
        factCheckSource: factCheckResult.publisher,
        factCheckUrl: factCheckResult.url,
        factCheckRating: factCheckResult.rating,
        verified: true,
      },
    };
  }
  
  // Step 4: Retrieval-based Verification - FALLBACK
  const newsApiKey = getNewsApiKey();
  const retrievalResult = await searchTrustedNews(claim, newsApiKey);
  
  // Step 5: Combined decision for uncertain cases
  const metadata = metadataRiskScore(content);
  
  const decisionInput: DecisionInput = {
    heuristicSignals: {
      fakeSignalCount: metadata.indicators.filter(i => i.includes("sensational")).length,
      misleadingSignalCount: metadata.indicators.filter(i => i.includes("speculative")).length,
      sensationalLanguageScore: metadata.score / 100,
      punctuationScore: metadata.indicators.filter(i => i.includes("punctuation")).length,
      capsRatio: 0,
    },
    factCheckResult: {
      found: factCheckResult.hasFactCheck,
      isReliable: factCheckResult.isReliable,
      rating: factCheckResult.rating,
      publisher: factCheckResult.publisher,
      url: factCheckResult.url,
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
  
  const verdict = makeFinalDecision(decisionInput);
  
  return {
    label: verdict.label,
    confidence: verdict.confidence,
    explanation: verdict.explanation,
    modelName: "combined-analysis",
    metadata: {
      claim,
      fakeScore: verdict.fakeScore,
      componentBreakdown: verdict.componentBreakdown,
      trustedSourcesFound: retrievalResult.trustedSourcesFound,
      sourceCredibility: sourceCredibilityResult,
      aiAnalyzed: !!aiResult,
      aiConfidence: aiResult?.confidence,
    },
  };
};
