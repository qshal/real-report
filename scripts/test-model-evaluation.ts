/**
 * Test Model Evaluation System
 * Run with: npx tsx scripts/test-model-evaluation.ts
 */

import { 
  generateTestPredictions, 
  calculateModelMetrics, 
  generateTrainingHistory,
  formatMetrics 
} from "../src/lib/modelEvaluation";

async function testModelEvaluation() {
  console.log("🧪 Testing ML Model Evaluation System\n");

  // Test 1: Generate and evaluate predictions
  console.log("📊 Generating test predictions...");
  const predictions = generateTestPredictions(1000);
  console.log(`✅ Generated ${predictions.length} test predictions`);

  // Test 2: Calculate comprehensive metrics
  console.log("\n📈 Calculating model metrics...");
  const metrics = calculateModelMetrics(predictions);
  
  console.log("✅ Model Metrics Calculated:");
  console.log(`   F1 Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
  console.log(`   Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`   Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`   Recall: ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`   AUC-ROC: ${metrics.auc.toFixed(3)}`);

  // Test 3: Per-class metrics
  console.log("\n🎯 Per-Class Performance:");
  Object.entries(metrics.classMetrics).forEach(([className, classMetrics]) => {
    console.log(`   ${className.toUpperCase()}:`);
    console.log(`     Precision: ${(classMetrics.precision * 100).toFixed(2)}%`);
    console.log(`     Recall: ${(classMetrics.recall * 100).toFixed(2)}%`);
    console.log(`     F1 Score: ${(classMetrics.f1Score * 100).toFixed(2)}%`);
    console.log(`     Support: ${classMetrics.support} samples`);
  });

  // Test 4: Confusion Matrix
  console.log("\n🔍 Confusion Matrix:");
  console.log(`   True Positive: ${metrics.confusionMatrix.truePositive}`);
  console.log(`   False Positive: ${metrics.confusionMatrix.falsePositive}`);
  console.log(`   True Negative: ${metrics.confusionMatrix.trueNegative}`);
  console.log(`   False Negative: ${metrics.confusionMatrix.falseNegative}`);

  // Test 5: Training History
  console.log("\n📚 Generating training history...");
  const trainingHistory = generateTrainingHistory(50);
  console.log(`✅ Generated ${trainingHistory.length} epochs of training data`);
  
  const finalEpoch = trainingHistory[trainingHistory.length - 1];
  console.log("   Final Training Metrics:");
  console.log(`     Train Loss: ${finalEpoch.trainLoss.toFixed(4)}`);
  console.log(`     Val Loss: ${finalEpoch.valLoss.toFixed(4)}`);
  console.log(`     Train Accuracy: ${(finalEpoch.trainAccuracy * 100).toFixed(2)}%`);
  console.log(`     Val Accuracy: ${(finalEpoch.valAccuracy * 100).toFixed(2)}%`);
  console.log(`     Train F1: ${(finalEpoch.trainF1 * 100).toFixed(2)}%`);
  console.log(`     Val F1: ${(finalEpoch.valF1 * 100).toFixed(2)}%`);

  // Test 6: Model Performance Analysis
  console.log("\n🎯 Model Performance Analysis:");
  
  const getPerformanceLevel = (score: number) => {
    if (score >= 0.9) return "Excellent";
    if (score >= 0.8) return "Good";
    if (score >= 0.7) return "Fair";
    if (score >= 0.6) return "Poor";
    return "Critical";
  };

  console.log(`   Overall Performance: ${getPerformanceLevel(metrics.f1Score)}`);
  console.log(`   Precision Level: ${getPerformanceLevel(metrics.precision)}`);
  console.log(`   Recall Level: ${getPerformanceLevel(metrics.recall)}`);

  // Test 7: Class Balance Analysis
  console.log("\n⚖️ Class Balance Analysis:");
  const totalSamples = Object.values(metrics.classMetrics).reduce((sum, m) => sum + m.support, 0);
  Object.entries(metrics.classMetrics).forEach(([className, classMetrics]) => {
    const percentage = (classMetrics.support / totalSamples * 100).toFixed(1);
    console.log(`   ${className}: ${classMetrics.support} samples (${percentage}%)`);
  });

  // Test 8: Model Reliability Assessment
  console.log("\n🔒 Model Reliability Assessment:");
  const falsePositiveRate = metrics.confusionMatrix.falsePositive / 
    (metrics.confusionMatrix.falsePositive + metrics.confusionMatrix.trueNegative);
  const falseNegativeRate = metrics.confusionMatrix.falseNegative / 
    (metrics.confusionMatrix.falseNegative + metrics.confusionMatrix.truePositive);
  
  console.log(`   False Positive Rate: ${(falsePositiveRate * 100).toFixed(2)}%`);
  console.log(`   False Negative Rate: ${(falseNegativeRate * 100).toFixed(2)}%`);
  console.log(`   Specificity: ${(metrics.specificity * 100).toFixed(2)}%`);

  // Test 9: Training Convergence Analysis
  console.log("\n📈 Training Convergence Analysis:");
  const earlyEpochs = trainingHistory.slice(0, 10);
  const lateEpochs = trainingHistory.slice(-10);
  
  const earlyAvgLoss = earlyEpochs.reduce((sum, e) => sum + e.trainLoss, 0) / earlyEpochs.length;
  const lateAvgLoss = lateEpochs.reduce((sum, e) => sum + e.trainLoss, 0) / lateEpochs.length;
  const lossImprovement = ((earlyAvgLoss - lateAvgLoss) / earlyAvgLoss * 100);
  
  console.log(`   Loss Improvement: ${lossImprovement.toFixed(1)}%`);
  console.log(`   Early Training Loss: ${earlyAvgLoss.toFixed(4)}`);
  console.log(`   Late Training Loss: ${lateAvgLoss.toFixed(4)}`);

  // Test 10: Export formatted report
  console.log("\n📄 Generating formatted report...");
  const report = formatMetrics(metrics);
  console.log("✅ Report generated successfully");
  
  // Show first few lines of the report
  const reportLines = report.split('\n').slice(0, 10);
  console.log("\n📋 Report Preview:");
  reportLines.forEach(line => console.log(`   ${line}`));
  console.log("   ... (truncated)");

  console.log("\n🏁 Model Evaluation Test Complete");
  console.log("\n📊 Summary:");
  console.log(`✅ F1 Score: ${(metrics.f1Score * 100).toFixed(1)}% (${getPerformanceLevel(metrics.f1Score)})`);
  console.log(`✅ Accuracy: ${(metrics.accuracy * 100).toFixed(1)}% (${getPerformanceLevel(metrics.accuracy)})`);
  console.log(`✅ AUC-ROC: ${metrics.auc.toFixed(3)}`);
  console.log(`✅ Training Epochs: ${trainingHistory.length}`);
  console.log(`✅ Test Samples: ${predictions.length}`);
}

// Run the test
testModelEvaluation().catch(console.error);