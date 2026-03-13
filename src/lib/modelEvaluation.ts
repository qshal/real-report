/**
 * ML Model Evaluation System
 * Calculates F1 scores, precision, recall, and other metrics
 */

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity: number;
  auc: number;
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
  classMetrics: {
    [className: string]: {
      precision: number;
      recall: number;
      f1Score: number;
      support: number;
    };
  };
}

export interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
  trainF1: number;
  valF1: number;
  learningRate: number;
}

export interface PredictionResult {
  predicted: string;
  actual: string;
  confidence: number;
  probabilities: { [label: string]: number };
}

/**
 * Calculate confusion matrix components
 */
function calculateConfusionMatrix(predictions: PredictionResult[], positiveClass: string = 'fake') {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  
  predictions.forEach(pred => {
    const predictedPositive = pred.predicted === positiveClass;
    const actualPositive = pred.actual === positiveClass;
    
    if (predictedPositive && actualPositive) tp++;
    else if (predictedPositive && !actualPositive) fp++;
    else if (!predictedPositive && !actualPositive) tn++;
    else if (!predictedPositive && actualPositive) fn++;
  });
  
  return { truePositive: tp, falsePositive: fp, trueNegative: tn, falseNegative: fn };
}

/**
 * Calculate precision, recall, and F1 score
 */
function calculateMetrics(tp: number, fp: number, fn: number) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1Score = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
  
  return { precision, recall, f1Score };
}

/**
 * Calculate AUC-ROC score
 */
function calculateAUC(predictions: PredictionResult[], positiveClass: string = 'fake'): number {
  // Sort predictions by confidence (descending)
  const sorted = predictions
    .map(pred => ({
      score: pred.probabilities[positiveClass] || pred.confidence / 100,
      actual: pred.actual === positiveClass ? 1 : 0
    }))
    .sort((a, b) => b.score - a.score);
  
  let auc = 0;
  let tpr = 0; // True Positive Rate
  let fpr = 0; // False Positive Rate
  
  const positives = sorted.filter(p => p.actual === 1).length;
  const negatives = sorted.length - positives;
  
  if (positives === 0 || negatives === 0) return 0.5;
  
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].actual === 1) {
      tpr += 1 / positives;
    } else {
      auc += tpr / negatives;
      fpr += 1 / negatives;
    }
  }
  
  return auc;
}

/**
 * Calculate comprehensive model metrics
 */
export function calculateModelMetrics(predictions: PredictionResult[]): ModelMetrics {
  const classes = Array.from(new Set([...predictions.map(p => p.predicted), ...predictions.map(p => p.actual)]));
  const confusionMatrix = calculateConfusionMatrix(predictions);
  const { truePositive: tp, falsePositive: fp, trueNegative: tn, falseNegative: fn } = confusionMatrix;
  
  // Overall metrics
  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const { precision, recall, f1Score } = calculateMetrics(tp, fp, fn);
  const specificity = tn + fp === 0 ? 0 : tn / (tn + fp);
  const auc = calculateAUC(predictions);
  
  // Per-class metrics
  const classMetrics: { [className: string]: any } = {};
  
  classes.forEach(className => {
    const classTP = predictions.filter(p => p.predicted === className && p.actual === className).length;
    const classFP = predictions.filter(p => p.predicted === className && p.actual !== className).length;
    const classFN = predictions.filter(p => p.predicted !== className && p.actual === className).length;
    const support = predictions.filter(p => p.actual === className).length;
    
    const classMetricsCalc = calculateMetrics(classTP, classFP, classFN);
    
    classMetrics[className] = {
      ...classMetricsCalc,
      support
    };
  });
  
  return {
    accuracy,
    precision,
    recall,
    f1Score,
    specificity,
    auc,
    confusionMatrix,
    classMetrics
  };
}

/**
 * Generate synthetic training data for demonstration
 */
export function generateTrainingHistory(epochs: number = 50): TrainingMetrics[] {
  const history: TrainingMetrics[] = [];
  
  for (let epoch = 1; epoch <= epochs; epoch++) {
    // Simulate realistic training progression
    const progress = epoch / epochs;
    const noise = () => (Math.random() - 0.5) * 0.1;
    
    // Training loss decreases with some noise
    const trainLoss = Math.max(0.1, 2.5 * Math.exp(-progress * 3) + noise() * 0.2);
    
    // Validation loss decreases but may increase due to overfitting
    const valLoss = Math.max(0.15, 2.3 * Math.exp(-progress * 2.5) + 
      (progress > 0.7 ? (progress - 0.7) * 0.5 : 0) + noise() * 0.3);
    
    // Training accuracy increases
    const trainAccuracy = Math.min(0.98, 0.5 + progress * 0.45 + noise() * 0.05);
    
    // Validation accuracy increases but plateaus
    const valAccuracy = Math.min(0.92, 0.5 + progress * 0.4 + noise() * 0.08);
    
    // F1 scores follow similar patterns
    const trainF1 = Math.min(0.96, trainAccuracy - 0.02 + noise() * 0.03);
    const valF1 = Math.min(0.89, valAccuracy - 0.03 + noise() * 0.05);
    
    // Learning rate with decay
    const learningRate = 0.001 * Math.pow(0.95, Math.floor(epoch / 10));
    
    history.push({
      epoch,
      trainLoss,
      valLoss,
      trainAccuracy,
      valAccuracy,
      trainF1,
      valF1,
      learningRate
    });
  }
  
  return history;
}

/**
 * Generate synthetic test predictions for evaluation
 */
export function generateTestPredictions(numSamples: number = 1000): PredictionResult[] {
  const predictions: PredictionResult[] = [];
  const labels = ['real', 'fake', 'misleading'];
  
  for (let i = 0; i < numSamples; i++) {
    const actualLabel = labels[Math.floor(Math.random() * labels.length)];
    
    // Simulate model accuracy (85% correct predictions)
    const isCorrect = Math.random() < 0.85;
    const predictedLabel = isCorrect ? actualLabel : labels[Math.floor(Math.random() * labels.length)];
    
    // Generate realistic confidence scores
    const baseConfidence = isCorrect ? 0.7 + Math.random() * 0.25 : 0.4 + Math.random() * 0.4;
    const confidence = Math.min(0.99, Math.max(0.01, baseConfidence + (Math.random() - 0.5) * 0.1));
    
    // Generate probability distribution
    const probabilities: { [label: string]: number } = {};
    let remaining = 1.0;
    
    labels.forEach((label, index) => {
      if (index === labels.length - 1) {
        probabilities[label] = remaining;
      } else {
        const prob = label === predictedLabel ? 
          confidence * (0.6 + Math.random() * 0.3) : 
          remaining * Math.random() * 0.5;
        probabilities[label] = Math.min(remaining * 0.8, prob);
        remaining -= probabilities[label];
      }
    });
    
    // Normalize probabilities
    const sum = Object.values(probabilities).reduce((a, b) => a + b, 0);
    Object.keys(probabilities).forEach(key => {
      probabilities[key] /= sum;
    });
    
    predictions.push({
      predicted: predictedLabel,
      actual: actualLabel,
      confidence: confidence * 100,
      probabilities
    });
  }
  
  return predictions;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: ModelMetrics): string {
  return `
Model Performance Metrics:
========================
Overall Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%
Precision: ${(metrics.precision * 100).toFixed(2)}%
Recall: ${(metrics.recall * 100).toFixed(2)}%
F1 Score: ${(metrics.f1Score * 100).toFixed(2)}%
Specificity: ${(metrics.specificity * 100).toFixed(2)}%
AUC-ROC: ${metrics.auc.toFixed(3)}

Confusion Matrix:
================
True Positive: ${metrics.confusionMatrix.truePositive}
False Positive: ${metrics.confusionMatrix.falsePositive}
True Negative: ${metrics.confusionMatrix.trueNegative}
False Negative: ${metrics.confusionMatrix.falseNegative}

Per-Class Metrics:
==================
${Object.entries(metrics.classMetrics).map(([className, classMetrics]) => 
  `${className.toUpperCase()}:
  Precision: ${(classMetrics.precision * 100).toFixed(2)}%
  Recall: ${(classMetrics.recall * 100).toFixed(2)}%
  F1 Score: ${(classMetrics.f1Score * 100).toFixed(2)}%
  Support: ${classMetrics.support}`
).join('\n\n')}
  `;
}