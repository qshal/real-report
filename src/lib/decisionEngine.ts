/**
 * Final Decision Engine
 * 
 * Combines multiple fact-checking signals into a weighted final verdict
 */

import type { PredictionLabel } from "@/lib/fakeNewsAnalyzer";

export interface HeuristicSignals {
  fakeSignalCount: number;
  misleadingSignalCount: number;
  sensationalLanguageScore: number;
  punctuationScore: number;
  capsRatio: number;
}

export interface FactCheckResult {
  found: boolean;
  isReliable?: boolean;
  rating?: string;
  publisher?: string;
  url?: string;
}

export interface RetrievalResult {
  trustedSourcesFound: number;
  fakeProbability: number;
  hasConsensus: boolean;
}

export interface SourceCredibilityResult {
  score: number; // 0-1
  reputation: "trusted" | "medium" | "unknown" | "risky" | "satire";
}

export interface AIReasoningResult {
  isFactual: boolean;
  confidence: number;
  keyIssues: string[];
}

export interface DecisionInput {
  heuristicSignals: HeuristicSignals;
  factCheckResult: FactCheckResult;
  retrievalResult: RetrievalResult;
  sourceCredibility: SourceCredibilityResult;
  aiReasoning: AIReasoningResult;
}

export interface FinalVerdict {
  label: PredictionLabel;
  confidence: number;
  fakeScore: number;
  explanation: string;
  componentBreakdown: {
    factCheckContribution: number;
    retrievalContribution: number;
    credibilityContribution: number;
    aiContribution: number;
    heuristicContribution: number;
  };
  recommendations: string[];
}

/**
 * Calculate heuristic score (0-1, higher = more likely fake)
 */
function calculateHeuristicScore(signals: HeuristicSignals): number {
  let score = 0;
  
  // Fake signals (high impact)
  score += Math.min(0.4, signals.fakeSignalCount * 0.15);
  
  // Misleading signals (medium impact)
  score += Math.min(0.2, signals.misleadingSignalCount * 0.08);
  
  // Sensational language
  score += Math.min(0.2, signals.sensationalLanguageScore * 0.1);
  
  // Excessive punctuation
  score += Math.min(0.1, signals.punctuationScore * 0.03);
  
  // ALL CAPS ratio
  if (signals.capsRatio > 0.3) {
    score += 0.1;
  }
  
  return Math.min(1, score);
}

/**
 * Calculate fact-check score (0-1, higher = more likely fake)
 */
function calculateFactCheckScore(result: FactCheckResult): number {
  if (!result.found) {
    return 0.5; // Neutral if not found
  }
  
  if (result.isReliable === true) {
    return 0.1; // Very low fake probability
  }
  
  if (result.isReliable === false) {
    return 0.9; // Very high fake probability
  }
  
  return 0.5;
}

/**
 * Calculate retrieval score (0-1, higher = more likely fake)
 */
function calculateRetrievalScore(result: RetrievalResult): number {
  // If many trusted sources found, likely real
  if (result.trustedSourcesFound >= 5) {
    return 0.1;
  }
  
  if (result.trustedSourcesFound >= 3) {
    return 0.2;
  }
  
  if (result.trustedSourcesFound >= 1) {
    return 0.35;
  }
  
  // No trusted sources found - suspicious
  if (result.trustedSourcesFound === 0) {
    return 0.75;
  }
  
  // Use the retrieval's own fake probability
  return result.fakeProbability / 100;
}

/**
 * Calculate source credibility score (0-1, higher = more likely fake)
 */
function calculateCredibilityScore(result: SourceCredibilityResult): number {
  // Invert the credibility score (high credibility = low fake score)
  return 1 - result.score;
}

/**
 * Calculate AI reasoning score (0-1, higher = more likely fake)
 */
function calculateAIReasoningScore(result: AIReasoningResult): number {
  if (result.isFactual) {
    // AI thinks it's factual - low fake score
    return (100 - result.confidence) / 100 * 0.3;
  } else {
    // AI thinks it's not factual - high fake score
    return 0.6 + (result.confidence / 100 * 0.4);
  }
}

/**
 * Generate explanation based on components
 */
function generateExplanation(
  fakeScore: number,
  input: DecisionInput,
  breakdown: FinalVerdict["componentBreakdown"]
): string {
  const parts: string[] = [];
  
  // Main verdict explanation
  if (fakeScore > 0.75) {
    parts.push("Multiple strong indicators suggest this content contains false or fabricated information.");
  } else if (fakeScore > 0.55) {
    parts.push("Several indicators raise concerns about the accuracy of this content.");
  } else if (fakeScore > 0.4) {
    parts.push("Some aspects of this content are questionable or lack verification.");
  } else {
    parts.push("This content appears to be from credible sources with factual reporting.");
  }
  
  // Key factors
  const factors: string[] = [];
  
  if (input.factCheckResult.found) {
    factors.push(`Fact-check by ${input.factCheckResult.publisher}: ${input.factCheckResult.rating}`);
  }
  
  if (input.retrievalResult.trustedSourcesFound > 0) {
    factors.push(`${input.retrievalResult.trustedSourcesFound} trusted news sources found`);
  } else if (input.retrievalResult.trustedSourcesFound === 0) {
    factors.push("No trusted sources covering this claim");
  }
  
  if (input.sourceCredibility.reputation === "trusted") {
    factors.push("Source is highly credible");
  } else if (input.sourceCredibility.reputation === "risky") {
    factors.push("Source has low credibility");
  }
  
  if (!input.aiReasoning.isFactual && input.aiReasoning.confidence > 60) {
    factors.push(`AI detected ${input.aiReasoning.keyIssues.length} potential issues`);
  }
  
  if (input.heuristicSignals.fakeSignalCount > 0) {
    factors.push(`${input.heuristicSignals.fakeSignalCount} sensational language markers found`);
  }
  
  if (factors.length > 0) {
    parts.push(`Key factors: ${factors.join("; ")}.`);
  }
  
  return parts.join(" ");
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  label: PredictionLabel,
  input: DecisionInput
): string[] {
  const recommendations: string[] = [];
  
  if (label === "fake") {
    recommendations.push("Do not share this content");
    recommendations.push("Search for verified reporting from trusted sources");
    
    if (input.factCheckResult.found && input.factCheckResult.url) {
      recommendations.push(`See fact-check: ${input.factCheckResult.url}`);
    }
  } else if (label === "misleading") {
    recommendations.push("Verify claims through multiple trusted sources before sharing");
    recommendations.push("Look for official statements or peer-reviewed research");
    
    if (input.retrievalResult.trustedSourcesFound === 0) {
      recommendations.push("No major news outlets are reporting this - exercise caution");
    }
  } else {
    recommendations.push("Content appears reliable, but always verify important claims");
    
    if (input.sourceCredibility.reputation !== "trusted") {
      recommendations.push("Consider cross-referencing with additional trusted sources");
    }
  }
  
  return recommendations;
}

/**
 * Make final decision combining all signals
 */
export function makeFinalDecision(input: DecisionInput): FinalVerdict {
  // Calculate individual component scores
  const heuristicScore = calculateHeuristicScore(input.heuristicSignals);
  const factCheckScore = calculateFactCheckScore(input.factCheckResult);
  const retrievalScore = calculateRetrievalScore(input.retrievalResult);
  const credibilityScore = calculateCredibilityScore(input.sourceCredibility);
  const aiScore = calculateAIReasoningScore(input.aiReasoning);
  
  // Weighted combination - Prioritizing AI and Source Credibility
  // Weights: AI Reasoning 40%, Source Credibility 35%, Fact Check 15%, Retrieval 10%
  // Heuristic signals minimized (incorporated into AI reasoning)
  const fakeScore = 
    0.40 * aiScore +
    0.35 * credibilityScore +
    0.15 * factCheckScore +
    0.10 * retrievalScore;
  
  // Determine label
  let label: PredictionLabel;
  let confidence: number;
  
  if (fakeScore > 0.75) {
    label = "fake";
    confidence = Math.round(75 + (fakeScore - 0.75) * 100);
  } else if (fakeScore >= 0.4) {
    label = "misleading";
    // Confidence peaks at the extremes of the misleading range
    const distanceFromCenter = Math.abs(fakeScore - 0.575);
    confidence = Math.round(50 + distanceFromCenter * 100);
  } else {
    label = "real";
    confidence = Math.round(75 + (0.4 - fakeScore) * 100);
  }
  
  // Cap confidence at 98%
  confidence = Math.min(98, confidence);
  
  // Calculate component contributions for transparency
  const breakdown: FinalVerdict["componentBreakdown"] = {
    factCheckContribution: Math.round(factCheckScore * 100),
    retrievalContribution: Math.round(retrievalScore * 100),
    credibilityContribution: Math.round(credibilityScore * 100),
    aiContribution: Math.round(aiScore * 100),
    heuristicContribution: Math.round(heuristicScore * 100),
  };
  
  return {
    label,
    confidence,
    fakeScore: Math.round(fakeScore * 100) / 100,
    explanation: generateExplanation(fakeScore, input, breakdown),
    componentBreakdown: breakdown,
    recommendations: generateRecommendations(label, input),
  };
}

/**
 * Quick decision with default/empty inputs
 */
export function makeQuickDecision(
  partialInput: Partial<DecisionInput>
): FinalVerdict {
  const defaultInput: DecisionInput = {
    heuristicSignals: {
      fakeSignalCount: 0,
      misleadingSignalCount: 0,
      sensationalLanguageScore: 0,
      punctuationScore: 0,
      capsRatio: 0,
    },
    factCheckResult: { found: false },
    retrievalResult: {
      trustedSourcesFound: 0,
      fakeProbability: 50,
      hasConsensus: false,
    },
    sourceCredibility: {
      score: 0.5,
      reputation: "unknown",
    },
    aiReasoning: {
      isFactual: true,
      confidence: 50,
      keyIssues: [],
    },
    ...partialInput,
  };
  
  return makeFinalDecision(defaultInput);
}
