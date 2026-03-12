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

// Default model weights (fallback if no model file exists)
const DEFAULT_WEIGHTS: ModelFeatureWeights = {
  word_report: 22.9,
  word_brad: 22.6,
  word_caitlyn: 21.6,
  word_shelton: 19.8,
  word_pitt: 19.3,
  word_kanye: 18.3,
  word_season: -26.6,
  word_bachelor: -23.1,
  word_awards: -19.8,
  word_reveals: -18.1,
  exclamation_count: 5.4,
  fake_signals: 3.0,
  misleading_signals: 1.5,
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

    let score = this.bias;
    for (const [feature, value] of Object.entries(features)) {
      score += (this.weights[feature] || 0) * value;
    }

    const probability = 1 / (1 + Math.exp(-score));

    let label: DatasetLabel;
    let confidence: number;
    let explanation: string;

    if (probability < 0.33) {
      label = "real";
      confidence = (1 - probability) * 100;
      explanation = "Content appears to be from credible sources with factual reporting.";
    } else if (probability < 0.67) {
      label = "misleading";
      confidence = 50 + Math.abs(probability - 0.5) * 100;
      explanation = "Content contains ambiguous claims that require verification.";
    } else {
      label = "fake";
      confidence = probability * 100;
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
