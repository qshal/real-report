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

// Simplified AI-Only Analysis: Gemini AI is the sole authority
export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload): Promise<HybridAnalysisResult> => {
  const content = payload.inputType === "text" ? payload.text : payload.url;
  const isUrl = payload.inputType === "url";
  
  // Extract main claim
  const claim = extractClaim(content);
  
  // ALWAYS use Gemini AI as the primary and sole decision maker
  const geminiKey = getGeminiApiKey();
  
  // Check if API key is configured
  if (!geminiKey) {
    return {
      label: "misleading",
      confidence: 50,
      explanation: "Configuration Error: Gemini API key not found. Please add VITE_GEMINI_API_KEY to environment variables.",
      modelName: "config-error",
      metadata: {
        claim,
        error: "Missing API key",
      },
    };
  }
  
  const aiResult = await analyzeWithAI(content, geminiKey);
  
  // Check if AI returned an error
  if (aiResult && aiResult.confidence === 0 && aiResult.explanation.includes("API Error")) {
    return {
      label: "misleading",
      confidence: 50,
      explanation: `AI Service Error: ${aiResult.explanation}. Please check your API key configuration.`,
      modelName: "api-error",
      metadata: {
        claim,
        error: aiResult.explanation,
      },
    };
  }
  
  if (aiResult && aiResult.confidence > 0) {
    // For URLs: Combine AI with source credibility as additional context
    if (isUrl) {
      const sourceCredibilityResult = analyzeSourceCredibility(content);
      
      // Adjust AI confidence based on source credibility
      let adjustedConfidence = aiResult.confidence;
      let credibilityNote = "";
      
      if (sourceCredibilityResult.credibilityScore >= 0.8) {
        // High credibility source boosts confidence
        adjustedConfidence = Math.min(95, aiResult.confidence + 10);
        credibilityNote = ` Source: ${sourceCredibilityResult.domain} (highly credible).`;
      } else if (sourceCredibilityResult.credibilityScore <= 0.3) {
        // Low credibility source reduces confidence for "real" claims
        if (aiResult.isFactual) {
          adjustedConfidence = Math.max(50, aiResult.confidence - 20);
        }
        credibilityNote = ` Source: ${sourceCredibilityResult.domain} (low credibility - verify independently).`;
      }
      
      const label: PredictionLabel = aiResult.isFactual ? "real" : "fake";
      
      return {
        label,
        confidence: adjustedConfidence,
        explanation: `AI Analysis: ${aiResult.explanation}${credibilityNote}`,
        modelName: "gemini-ai-url",
        metadata: {
          claim,
          aiAnalyzed: true,
          aiConfidence: aiResult.confidence,
          adjustedConfidence,
          isFactual: aiResult.isFactual,
          keyClaims: aiResult.keyClaims,
          potentialIssues: aiResult.potentialIssues,
          sourceDomain: sourceCredibilityResult.domain,
          sourceCredibility: sourceCredibilityResult.credibilityScore,
          reasoning: "AI analysis with source credibility context",
        },
      };
    }
    
    // For text: Use AI-only
    const label: PredictionLabel = aiResult.isFactual ? "real" : "fake";
    
    return {
      label,
      confidence: aiResult.confidence,
      explanation: `AI Analysis: ${aiResult.explanation}`,
      modelName: "gemini-ai-text",
      metadata: {
        claim,
        aiAnalyzed: true,
        aiConfidence: aiResult.confidence,
        isFactual: aiResult.isFactual,
        keyClaims: aiResult.keyClaims,
        potentialIssues: aiResult.potentialIssues,
        reasoning: "Pure AI analysis - no ML models or keyword checking used",
      },
    };
  }
  
  // Fallback only if AI completely fails
  return {
    label: "misleading",
    confidence: 50,
    explanation: "AI analysis unavailable. Unable to verify content.",
    modelName: "unavailable",
    metadata: {
      claim,
      error: "Gemini AI API failed or returned no result",
    },
  };
};
