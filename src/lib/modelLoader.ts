import type { DatasetLabel } from "./datasets";

interface ModelFeatureWeights {
  [feature: string]: number;
}

interface TrainedModel {
  name: string;
  version: string;
  featureWeights: ModelFeatureWeights;
  bias: number;
}

// Default model weights based on fake news detection research
const DEFAULT_WEIGHTS: ModelFeatureWeights = {
  // Fake news indicators (positive weights)
  fake_signals: 2.5,
  exclamation_count: 1.5,
  caps_ratio: 3.0,
  word_count: -0.01,
  
  // Real news indicators (negative weights)
  misleading_signals: 1.0,
  question_count: 0.5,
};

class FakeNewsClassifier {
  private weights: ModelFeatureWeights;
  private bias: number;

  constructor(weights?: ModelFeatureWeights, bias?: number) {
    this.weights = weights || DEFAULT_WEIGHTS;
    this.bias = bias || 0;
  }

  private extractFeatures(text: string): Record<string, number> {
    const features: Record<string, number> = {};
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    // Word frequencies
    for (const word of words) {
      if (word.length > 2) {
        features[`word_${word}`] = (features[`word_${word}`] || 0) + 1;
      }
    }

    // Text length features
    features["text_length"] = text.length;
    features["word_count"] = words.length;

    // Fake news signal words
    const fakeSignals = [
      "shocking",
      "secret",
      "hoax",
      "conspiracy",
      "they dont want you to know",
      "miracle",
      "cure",
      "doctors hate",
    ];
    const misleadingSignals = [
      "sources say",
      "unverified",
      "rumor",
      "allegedly",
      "some people say",
    ];

    const lowerText = text.toLowerCase();
    features["fake_signals"] = fakeSignals.filter((s) => lowerText.includes(s)).length;
    features["misleading_signals"] = misleadingSignals.filter((s) => lowerText.includes(s)).length;

    // Punctuation features
    features["exclamation_count"] = (text.match(/!/g) || []).length;
    features["question_count"] = (text.match(/\?/g) || []).length;
    features["caps_ratio"] = text.length > 0 ? (text.match(/[A-Z]/g) || []).length / text.length : 0;

    return features;
  }

  predict(text: string): { label: DatasetLabel; confidence: number; explanation: string } {
    const features = this.extractFeatures(text);

    // Calculate risk score (0-100 scale)
    let riskScore = 0;
    
    // Fake signals (high impact)
    riskScore += features["fake_signals"] * 25;
    
    // Misleading signals (medium impact)
    riskScore += features["misleading_signals"] * 15;
    
    // Punctuation patterns
    riskScore += features["exclamation_count"] * 5;
    riskScore += features["question_count"] * 3;
    
    // Caps ratio (high ratio = suspicious)
    if (features["caps_ratio"] > 0.3) {
      riskScore += 20;
    }
    
    // Normalize to 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));
    
    // Apply ML model weights if they exist
    let mlScore = this.bias;
    for (const [feature, weight] of Object.entries(this.weights)) {
      if (features[feature]) {
        mlScore += weight * features[feature];
      }
    }
    
    // Combine rule-based and ML scores
    const combinedScore = (riskScore + Math.max(0, Math.min(100, mlScore * 10))) / 2;

    let label: DatasetLabel;
    let confidence: number;
    let explanation: string;

    if (combinedScore < 30) {
      label = "real";
      confidence = Math.round(70 + (30 - combinedScore));
      explanation = "Content appears to be from credible sources with factual reporting.";
    } else if (combinedScore < 60) {
      label = "misleading";
      confidence = Math.round(50 + Math.abs(combinedScore - 45));
      explanation = "Content contains ambiguous claims that require verification.";
    } else {
      label = "fake";
      confidence = Math.round(60 + combinedScore / 2.5);
      explanation = "Content shows patterns typical of misinformation.";
    }

    // Add feature-based explanation
    const featureExplanations: string[] = [];
    if (features["fake_signals"] > 0) {
      featureExplanations.push(`Contains ${features["fake_signals"]} sensational language markers.`);
    }
    if (features["misleading_signals"] > 0) {
      featureExplanations.push(`Has ${features["misleading_signals"]} unverified claim indicators.`);
    }
    if (features["exclamation_count"] > 2) {
      featureExplanations.push("Excessive use of exclamation marks.");
    }
    if (features["caps_ratio"] > 0.3) {
      featureExplanations.push("High ratio of capitalized text.");
    }

    if (featureExplanations.length > 0) {
      explanation += " " + featureExplanations.join(" ");
    }

    return { label, confidence, explanation };
  }
}

// Singleton instance
let classifierInstance: FakeNewsClassifier | null = null;

export function getClassifier(): FakeNewsClassifier {
  if (!classifierInstance) {
    classifierInstance = new FakeNewsClassifier();
  }
  return classifierInstance;
}

export function predictFakeNews(text: string): {
  label: DatasetLabel;
  confidence: number;
  explanation: string;
} {
  return getClassifier().predict(text);
}

// For future: Load model from JSON file
export async function loadModelFromJSON(jsonContent: string): Promise<void> {
  try {
    const model: TrainedModel = JSON.parse(jsonContent);
    classifierInstance = new FakeNewsClassifier(model.featureWeights, model.bias || 0);
  } catch (error) {
    console.error("Failed to load model:", error);
    classifierInstance = new FakeNewsClassifier();
  }
}
