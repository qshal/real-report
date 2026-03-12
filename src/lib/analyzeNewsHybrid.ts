import { predictFakeNews } from "@/lib/modelLoader";
import { analyzeWithFactCheck, getFactCheckApiKey } from "@/lib/factCheckApi";
import { analyzeWithAI, getGeminiApiKey, aiResultToLabel } from "@/lib/aiFactChecker";
import { extractClaim, searchTrustedNews, getNewsApiKey } from "@/lib/retrievalVerification";
import { analyzeSourceCredibility, adjustProbabilityBySource } from "@/lib/sourceCredibility";
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

// Multi-layer analysis: Retrieval → AI → Fact Check → ML Fallback
export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  
  // Extract main claim
  const claim = extractClaim(content);
  
  // Step 1: Source Credibility Analysis (for URLs)
  let sourceCredibility = null;
  let sourceAdjustedProbability = 50;
  if (isUrl) {
    sourceCredibility = analyzeSourceCredibility(content);
    const adjustment = adjustProbabilityBySource(50, sourceCredibility);
    sourceAdjustedProbability = adjustment.adjustedProbability;
  }
  
  // Step 2: Retrieval-based Verification (search trusted news)
  const newsApiKey = getNewsApiKey();
  const retrievalResult = await searchTrustedNews(claim, newsApiKey);
  
  // If strong consensus from trusted sources
  if (retrievalResult.trustedSourcesFound >= 3 && retrievalResult.fakeProbability < 30) {
    return {
      label: "real",
      confidence: Math.round(100 - retrievalResult.fakeProbability),
      explanation: `${retrievalResult.reasoning} Found ${retrievalResult.trustedSourcesFound} trusted sources corroborating this claim.`,
      modelName: "retrieval-verification",
      metadata: {
        claim,
        trustedSourcesFound: retrievalResult.trustedSourcesFound,
        supportingArticles: retrievalResult.supportingArticles.slice(0, 3),
        sourceCredibility,
        verificationMethod: "news-retrieval",
      },
    };
  }
  
  // Step 3: Google Fact Check API
  const factCheckApiKey = getFactCheckApiKey();
  const factCheckResult = await analyzeWithFactCheck(content, factCheckApiKey);
  
  if (factCheckResult.hasFactCheck && factCheckResult.isReliable !== undefined) {
    const label: PredictionLabel = factCheckResult.isReliable ? "real" : "fake";
    const confidence = 90;
    
    return {
      label,
      confidence,
      explanation: `Fact-checked by ${factCheckResult.publisher}: "${factCheckResult.rating}".`,
      modelName: "fact-check-api",
      metadata: {
        claim,
        factCheckSource: factCheckResult.publisher,
        factCheckUrl: factCheckResult.url,
        factCheckRating: factCheckResult.rating,
        sourceCredibility,
        verified: true,
      },
    };
  }
  
  // Step 4: AI Analysis (Gemini)
  const geminiKey = getGeminiApiKey();
  const aiResult = await analyzeWithAI(content, geminiKey);
  
  if (aiResult) {
    const aiLabel = aiResultToLabel(aiResult);
    
    // Combine AI with retrieval results
    let finalLabel = aiLabel.label;
    let finalConfidence = aiLabel.confidence;
    
    // If retrieval found no sources and AI says fake, increase confidence
    if (retrievalResult.trustedSourcesFound === 0 && aiLabel.label === "fake") {
      finalConfidence = Math.min(95, finalConfidence + 15);
    }
    
    // If retrieval found supporting sources and AI says real, increase confidence
    if (retrievalResult.trustedSourcesFound >= 2 && aiLabel.label === "real") {
      finalConfidence = Math.min(95, finalConfidence + 10);
    }
    
    return {
      label: finalLabel,
      confidence: finalConfidence,
      explanation: aiLabel.explanation,
      modelName: "gemini-ai-v1.5",
      metadata: {
        claim,
        aiAnalyzed: true,
        keyClaims: aiResult.keyClaims,
        potentialIssues: aiResult.potentialIssues,
        trustedSourcesFound: retrievalResult.trustedSourcesFound,
        sourceCredibility,
        verificationMethod: "ai-analysis",
      },
    };
  }
  
  // Step 5: Combined Retrieval + Source Credibility
  if (retrievalResult.trustedSourcesFound > 0 || sourceCredibility) {
    const baseProbability = retrievalResult.fakeProbability;
    let finalProbability = baseProbability;
    
    // Adjust for source credibility
    if (sourceCredibility) {
      const adjustment = adjustProbabilityBySource(baseProbability, sourceCredibility);
      finalProbability = adjustment.adjustedProbability;
    }
    
    const label: PredictionLabel = finalProbability >= 60 ? "fake" : finalProbability >= 40 ? "misleading" : "real";
    const confidence = Math.round(Math.abs(50 - finalProbability) * 2);
    
    return {
      label,
      confidence,
      explanation: retrievalResult.reasoning + (sourceCredibility ? ` Source: ${sourceCredibility.explanation}` : ""),
      modelName: "retrieval+credibility",
      metadata: {
        claim,
        trustedSourcesFound: retrievalResult.trustedSourcesFound,
        supportingArticles: retrievalResult.supportingArticles.slice(0, 3),
        sourceCredibility,
        fakeProbability: finalProbability,
      },
    };
  }
  
  // Step 6: ML Model Fallback
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
