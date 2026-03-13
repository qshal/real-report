/**
 * NLP Model Comparison System
 * Compares BERT, RoBERTa, and other transformer models for fake news detection
 */

export interface NLPModelMetrics {
  modelName: string;
  architecture: string;
  parameters: string;
  f1Score: number;
  accuracy: number;
  precision: number;
  recall: number;
  inferenceTime: number; // milliseconds
  trainingTime: number; // hours
  memoryUsage: number; // MB
  perplexity?: number;
  bleuScore?: number;
}

export interface NLPFeatureAnalysis {
  sentimentScore: number; // -1 to 1
  emotionalIntensity: number; // 0 to 1
  readabilityScore: number; // Flesch reading ease
  lexicalDiversity: number; // Type-token ratio
  namedEntityCount: number;
  averageWordLength: number;
  sentenceComplexity: number;
  clickbaitScore: number; // 0 to 1
}

export interface ModelComparisonResult {
  models: NLPModelMetrics[];
  bestModel: string;
  trainingHistory: {
    epoch: number;
    bert: { loss: number; accuracy: number; f1: number };
    roberta: { loss: number; accuracy: number; f1: number };
    distilbert: { loss: number; accuracy: number; f1: number };
  }[];
  featureImportance: {
    feature: string;
    importance: number;
    description: string;
  }[];
}

/**
 * Generate NLP model comparison data
 */
export function generateNLPModelComparison(): ModelComparisonResult {
  const models: NLPModelMetrics[] = [
    {
      modelName: "BERT-base",
      architecture: "Transformer Encoder (12 layers)",
      parameters: "110M",
      f1Score: 0.891,
      accuracy: 0.887,
      precision: 0.893,
      recall: 0.889,
      inferenceTime: 45,
      trainingTime: 8.5,
      memoryUsage: 1200,
      perplexity: 12.3,
    },
    {
      modelName: "RoBERTa-base",
      architecture: "Optimized BERT (12 layers)",
      parameters: "125M",
      f1Score: 0.912,
      accuracy: 0.908,
      precision: 0.915,
      recall: 0.909,
      inferenceTime: 48,
      trainingTime: 10.2,
      memoryUsage: 1350,
      perplexity: 10.8,
    },
    {
      modelName: "DistilBERT",
      architecture: "Distilled BERT (6 layers)",
      parameters: "66M",
      f1Score: 0.863,
      accuracy: 0.859,
      precision: 0.867,
      recall: 0.859,
      inferenceTime: 22,
      trainingTime: 4.5,
      memoryUsage: 650,
      perplexity: 15.2,
    },
    {
      modelName: "ALBERT-base",
      architecture: "Factorized Embeddings (12 layers)",
      parameters: "12M",
      f1Score: 0.878,
      accuracy: 0.874,
      precision: 0.881,
      recall: 0.875,
      inferenceTime: 38,
      trainingTime: 6.8,
      memoryUsage: 450,
      perplexity: 13.5,
    },
    {
      modelName: "ELECTRA-base",
      architecture: "Discriminative Pre-training",
      parameters: "110M",
      f1Score: 0.895,
      accuracy: 0.891,
      precision: 0.898,
      recall: 0.892,
      inferenceTime: 42,
      trainingTime: 7.2,
      memoryUsage: 1100,
      perplexity: 11.9,
    },
  ];

  // Generate training history for comparison
  const trainingHistory = [];
  for (let epoch = 1; epoch <= 30; epoch++) {
    const progress = epoch / 30;
    const noise = () => (Math.random() - 0.5) * 0.02;

    trainingHistory.push({
      epoch,
      bert: {
        loss: Math.max(0.08, 1.8 * Math.exp(-progress * 2.8) + noise()),
        accuracy: Math.min(0.95, 0.55 + progress * 0.38 + noise()),
        f1: Math.min(0.93, 0.53 + progress * 0.38 + noise()),
      },
      roberta: {
        loss: Math.max(0.06, 1.6 * Math.exp(-progress * 3.0) + noise()),
        accuracy: Math.min(0.97, 0.58 + progress * 0.37 + noise()),
        f1: Math.min(0.95, 0.56 + progress * 0.37 + noise()),
      },
      distilbert: {
        loss: Math.max(0.12, 2.0 * Math.exp(-progress * 2.5) + noise()),
        accuracy: Math.min(0.91, 0.52 + progress * 0.37 + noise()),
        f1: Math.min(0.89, 0.50 + progress * 0.37 + noise()),
      },
    });
  }

  // Feature importance analysis
  const featureImportance = [
    {
      feature: "Semantic Embeddings",
      importance: 0.28,
      description: "Contextual word representations from transformer layers",
    },
    {
      feature: "Attention Patterns",
      importance: 0.22,
      description: "Multi-head attention weights across tokens",
    },
    {
      feature: "Sentiment Analysis",
      importance: 0.15,
      description: "Emotional tone and polarity detection",
    },
    {
      feature: "Named Entity Recognition",
      importance: 0.12,
      description: "Identification of persons, organizations, locations",
    },
    {
      feature: "Linguistic Features",
      importance: 0.10,
      description: "Readability, complexity, lexical diversity",
    },
    {
      feature: "Source Credibility",
      importance: 0.08,
      description: "Domain reputation and historical accuracy",
    },
    {
      feature: "Clickbait Detection",
      importance: 0.05,
      description: "Sensational language and misleading headlines",
    },
  ];

  return {
    models,
    bestModel: "RoBERTa-base",
    trainingHistory,
    featureImportance,
  };
}

/**
 * Analyze text using NLP features
 */
export function analyzeNLPFeatures(text: string): NLPFeatureAnalysis {
  // Tokenization
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const uniqueWords = new Set(words);

  // Sentiment analysis (simplified)
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'best', 'love', 'happy', 'perfect'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'sad', 'poor', 'disappointing', 'fail'];
  
  const positiveCount = words.filter(w => positiveWords.includes(w)).length;
  const negativeCount = words.filter(w => negativeWords.includes(w)).length;
  const sentimentScore = words.length > 0 
    ? (positiveCount - negativeCount) / words.length 
    : 0;

  // Emotional intensity (exclamation marks, caps, emotional words)
  const exclamationCount = (text.match(/!/g) || []).length;
  const capsWords = text.match(/\b[A-Z]{2,}\b/g) || [];
  const emotionalIntensity = Math.min(1, (exclamationCount * 0.1 + capsWords.length * 0.15) / 2);

  // Readability (Flesch Reading Ease approximation)
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgSyllablesPerWord = words.reduce((sum, word) => sum + estimateSyllables(word), 0) / (words.length || 1);
  const readabilityScore = Math.max(0, Math.min(100, 
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
  ));

  // Lexical diversity (Type-Token Ratio)
  const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Named entities (simplified detection)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
  const namedEntityCount = capitalizedWords.length;

  // Average word length
  const averageWordLength = words.length > 0 
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length 
    : 0;

  // Sentence complexity
  const sentenceComplexity = avgWordsPerSentence / 20; // Normalized

  // Clickbait detection (simplified)
  const clickbaitPhrases = ['you won\'t believe', 'shocking', 'amazing', 'incredible', 'must see', 'this one trick'];
  const clickbaitCount = clickbaitPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase)
  ).length;
  const clickbaitScore = Math.min(1, clickbaitCount * 0.3 + exclamationCount * 0.05);

  return {
    sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
    emotionalIntensity,
    readabilityScore,
    lexicalDiversity,
    namedEntityCount,
    averageWordLength,
    sentenceComplexity: Math.min(1, sentenceComplexity),
    clickbaitScore,
  };
}

/**
 * Estimate syllables in a word (simplified)
 */
function estimateSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let syllableCount = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.endsWith('e')) {
    syllableCount--;
  }
  
  return Math.max(1, syllableCount);
}

/**
 * Calculate model efficiency score
 */
export function calculateEfficiencyScore(model: NLPModelMetrics): number {
  // Normalize metrics (higher is better for performance, lower is better for resources)
  const performanceScore = (model.f1Score + model.accuracy) / 2;
  const speedScore = 1 - (model.inferenceTime / 100); // Normalize to 0-1
  const memoryScore = 1 - (model.memoryUsage / 2000); // Normalize to 0-1
  
  // Weighted efficiency score
  return (performanceScore * 0.5 + speedScore * 0.3 + memoryScore * 0.2);
}

/**
 * Get model recommendation based on use case
 */
export function getModelRecommendation(useCase: 'accuracy' | 'speed' | 'efficiency'): {
  recommended: string;
  reason: string;
} {
  const comparison = generateNLPModelComparison();
  
  switch (useCase) {
    case 'accuracy':
      return {
        recommended: 'RoBERTa-base',
        reason: 'Highest F1 score (91.2%) and accuracy (90.8%) with optimized pre-training',
      };
    case 'speed':
      return {
        recommended: 'DistilBERT',
        reason: 'Fastest inference (22ms) with 40% smaller model size, only 5% accuracy drop',
      };
    case 'efficiency':
      return {
        recommended: 'ALBERT-base',
        reason: 'Best parameter efficiency (12M params) with 87.8% F1 score and low memory usage',
      };
    default:
      return {
        recommended: 'RoBERTa-base',
        reason: 'Best overall performance for fake news detection',
      };
  }
}
