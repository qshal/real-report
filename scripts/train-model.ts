#!/usr/bin/env node
/**
 * Train a fake news detection model using the uploaded datasets
 * 
 * Usage:
 *   npx tsx scripts/train-model.ts [dataset-name]
 * 
 * Examples:
 *   npx tsx scripts/train-model.ts all
 *   npx tsx scripts/train-model.ts liar
 *   npx tsx scripts/train-model.ts fakenewsnet
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface DatasetItem {
  id: string;
  text: string;
  label: "real" | "fake" | "misleading";
  dataset_name: string;
}

interface ModelMetrics {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1Score: Record<string, number>;
}

interface TrainedModel {
  name: string;
  version: string;
  createdAt: string;
  datasetStats: {
    total: number;
    train: number;
    test: number;
    byLabel: Record<string, number>;
  };
  metrics: ModelMetrics;
  featureWeights: Record<string, number>;
}

// Simple bag-of-words feature extraction
function extractFeatures(text: string): Record<string, number> {
  const features: Record<string, number> = {};
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  // Word frequencies
  for (const word of words) {
    if (word.length > 2) {
      features[`word_${word}`] = (features[`word_${word}`] || 0) + 1;
    }
  }
  
  // Text length feature
  features["text_length"] = text.length;
  features["word_count"] = words.length;
  
  // Fake news signal words
  const fakeSignals = ["shocking", "secret", "hoax", "conspiracy", "they dont want you to know"];
  const misleadingSignals = ["sources say", "unverified", "rumor", "allegedly"];
  
  const lowerText = text.toLowerCase();
  features["fake_signals"] = fakeSignals.filter(s => lowerText.includes(s)).length;
  features["misleading_signals"] = misleadingSignals.filter(s => lowerText.includes(s)).length;
  
  // Punctuation features
  features["exclamation_count"] = (text.match(/!/g) || []).length;
  features["question_count"] = (text.match(/\?/g) || []).length;
  features["caps_ratio"] = (text.match(/[A-Z]/g) || []).length / text.length;
  
  return features;
}

// Simple logistic regression-like classifier
class FakeNewsClassifier {
  private weights: Record<string, number> = {};
  private bias: number = 0;
  private learningRate: number = 0.01;
  private epochs: number = 100;
  
  train(items: DatasetItem[]) {
    console.log(`Training on ${items.length} items...`);
    
    // Convert labels to numeric
    const labelMap: Record<string, number> = { real: 0, misleading: 0.5, fake: 1 };
    
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let totalLoss = 0;
      
      for (const item of items) {
        const features = extractFeatures(item.text);
        const target = labelMap[item.label];
        
        // Forward pass
        let prediction = this.bias;
        for (const [feature, value] of Object.entries(features)) {
          prediction += (this.weights[feature] || 0) * value;
        }
        prediction = 1 / (1 + Math.exp(-prediction)); // Sigmoid
        
        // Calculate loss
        const loss = Math.pow(prediction - target, 2);
        totalLoss += loss;
        
        // Backward pass (gradient descent)
        const error = prediction - target;
        this.bias -= this.learningRate * error;
        
        for (const [feature, value] of Object.entries(features)) {
          this.weights[feature] = (this.weights[feature] || 0) - this.learningRate * error * value;
        }
      }
      
      if (epoch % 10 === 0) {
        console.log(`  Epoch ${epoch}: Loss = ${(totalLoss / items.length).toFixed(4)}`);
      }
    }
    
    console.log("Training complete!");
  }
  
  predict(text: string): { label: string; confidence: number } {
    const features = extractFeatures(text);
    
    let score = this.bias;
    for (const [feature, value] of Object.entries(features)) {
      score += (this.weights[feature] || 0) * value;
    }
    
    const probability = 1 / (1 + Math.exp(-score));
    
    if (probability < 0.33) {
      return { label: "real", confidence: (1 - probability) * 100 };
    } else if (probability < 0.67) {
      return { label: "misleading", confidence: 50 + Math.abs(probability - 0.5) * 100 };
    } else {
      return { label: "fake", confidence: probability * 100 };
    }
  }
  
  getTopFeatures(n: number = 20): Record<string, number> {
    return Object.entries(this.weights)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, n)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  }
}

async function fetchDataset(datasetName?: string): Promise<DatasetItem[]> {
  console.log(`Fetching dataset${datasetName ? ` (${datasetName})` : "s"}...`);
  
  const allItems: DatasetItem[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    let query = supabase
      .from("dataset_items")
      .select("id, text, label, dataset_name")
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (datasetName && datasetName !== "all") {
      query = query.eq("dataset_name", datasetName.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allItems.push(...data.map(item => ({
      id: item.id,
      text: item.text,
      label: item.label as "real" | "fake" | "misleading",
      dataset_name: item.dataset_name,
    })));
    
    if (data.length < pageSize) break;
    page++;
    
    if (page % 10 === 0) {
      console.log(`  Fetched ${allItems.length} items...`);
    }
  }
  
  return allItems;
}

function splitDataset(items: DatasetItem[], trainRatio: number = 0.8): { train: DatasetItem[]; test: DatasetItem[] } {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const trainSize = Math.floor(shuffled.length * trainRatio);
  return {
    train: shuffled.slice(0, trainSize),
    test: shuffled.slice(trainSize),
  };
}

function calculateMetrics(predictions: { actual: string; predicted: string }[]): ModelMetrics {
  const labels = ["real", "fake", "misleading"];
  const metrics: ModelMetrics = {
    accuracy: 0,
    precision: {},
    recall: {},
    f1Score: {},
  };
  
  // Calculate accuracy
  const correct = predictions.filter(p => p.actual === p.predicted).length;
  metrics.accuracy = (correct / predictions.length) * 100;
  
  // Calculate per-label metrics
  for (const label of labels) {
    const truePositives = predictions.filter(p => p.actual === label && p.predicted === label).length;
    const falsePositives = predictions.filter(p => p.actual !== label && p.predicted === label).length;
    const falseNegatives = predictions.filter(p => p.actual === label && p.predicted !== label).length;
    
    const precision = truePositives + falsePositives > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;
    const recall = truePositives + falseNegatives > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0;
    
    metrics.precision[label] = precision * 100;
    metrics.recall[label] = recall * 100;
    metrics.f1Score[label] = precision + recall > 0 
      ? (2 * precision * recall / (precision + recall)) * 100 
      : 0;
  }
  
  return metrics;
}

async function main() {
  const target = process.argv[2] || "all";
  
  console.log("=".repeat(60));
  console.log("Fake News Detection Model Training");
  console.log("=".repeat(60));
  console.log(`Dataset: ${target}\n`);
  
  // Fetch data
  const items = await fetchDataset(target);
  console.log(`Loaded ${items.length} items\n`);
  
  if (items.length === 0) {
    console.error("No data found!");
    process.exit(1);
  }
  
  // Show label distribution
  const byLabel: Record<string, number> = {};
  for (const item of items) {
    byLabel[item.label] = (byLabel[item.label] || 0) + 1;
  }
  console.log("Label distribution:");
  for (const [label, count] of Object.entries(byLabel)) {
    console.log(`  ${label}: ${count}`);
  }
  console.log();
  
  // Split dataset
  const { train, test } = splitDataset(items);
  console.log(`Train: ${train.length}, Test: ${test.length}\n`);
  
  // Train model
  const classifier = new FakeNewsClassifier();
  classifier.train(train);
  
  // Evaluate
  console.log("\nEvaluating on test set...");
  const predictions = test.map(item => ({
    actual: item.label,
    predicted: classifier.predict(item.text).label,
  }));
  
  const metrics = calculateMetrics(predictions);
  
  console.log("\n" + "=".repeat(60));
  console.log("Results");
  console.log("=".repeat(60));
  console.log(`Accuracy: ${metrics.accuracy.toFixed(2)}%`);
  console.log("\nPer-label metrics:");
  for (const label of ["real", "fake", "misleading"]) {
    console.log(`  ${label}:`);
    console.log(`    Precision: ${metrics.precision[label]?.toFixed(2) || 0}%`);
    console.log(`    Recall: ${metrics.recall[label]?.toFixed(2) || 0}%`);
    console.log(`    F1-Score: ${metrics.f1Score[label]?.toFixed(2) || 0}%`);
  }
  
  // Show top features
  console.log("\nTop predictive features:");
  const topFeatures = classifier.getTopFeatures(10);
  for (const [feature, weight] of Object.entries(topFeatures)) {
    console.log(`  ${feature}: ${weight.toFixed(4)}`);
  }
  
  // Save model
  const model: TrainedModel = {
    name: "fake-news-classifier-v1",
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    datasetStats: {
      total: items.length,
      train: train.length,
      test: test.length,
      byLabel,
    },
    metrics,
    featureWeights: classifier.getTopFeatures(100),
  };
  
  const outputPath = path.join(__dirname, "..", "models", `model-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(model, null, 2));
  
  console.log(`\nModel saved to: ${outputPath}`);
  console.log("\nDone!");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
