/**
 * Export Training Graphs as PNG Images
 * 
 * This script generates PNG images of the training graphs
 * by rendering the React components and capturing screenshots.
 */

import { chromium } from 'playwright';
import { generateTestPredictions, calculateModelMetrics, generateTrainingHistory } from '../src/lib/modelEvaluation';
import fs from 'fs';
import path from 'path';

async function exportGraphsAsImages() {
  console.log('🎨 Starting graph export process...\n');

  // Generate evaluation data
  console.log('📊 Generating model evaluation data...');
  const predictions = generateTestPredictions(1000);
  const metrics = calculateModelMetrics(predictions);
  const trainingHistory = generateTrainingHistory(50);
  
  const evaluation = {
    metrics,
    trainingHistory: trainingHistory.map(h => ({
      epoch: h.epoch,
      loss: h.trainLoss,
      valLoss: h.valLoss,
      accuracy: h.trainAccuracy * 100,
      valAccuracy: h.valAccuracy * 100,
      f1Score: h.trainF1 * 100,
      valF1Score: h.valF1 * 100
    })),
    confusionMatrix: metrics.confusionMatrix
  };
  
  // Create output directory
  const outputDir = path.join(process.cwd(), 'public', 'graphs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Launch browser
  console.log('🌐 Launching headless browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 }
  });

  // Create HTML page with graphs
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/recharts@2.5.0/dist/Recharts.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: white;
    }
    .graph-container { 
      background: white; 
      padding: 20px; 
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h2 { 
      margin: 0 0 20px 0; 
      color: #1a1a1a;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div id="loss-chart" class="graph-container">
    <h2>Training & Validation Loss</h2>
    <canvas id="loss-canvas" width="1100" height="400"></canvas>
  </div>
  
  <div id="accuracy-chart" class="graph-container">
    <h2>Training & Validation Accuracy</h2>
    <canvas id="accuracy-canvas" width="1100" height="400"></canvas>
  </div>
  
  <div id="f1-chart" class="graph-container">
    <h2>F1 Score Progression</h2>
    <canvas id="f1-canvas" width="1100" height="400"></canvas>
  </div>
  
  <div id="confusion-chart" class="graph-container">
    <h2>Confusion Matrix</h2>
    <canvas id="confusion-canvas" width="1100" height="400"></canvas>
  </div>

  <script>
    const trainingHistory = ${JSON.stringify(evaluation.trainingHistory)};
    const confusionMatrix = ${JSON.stringify(evaluation.confusionMatrix)};
    
    // Draw Loss Chart
    function drawLossChart() {
      const canvas = document.getElementById('loss-canvas');
      const ctx = canvas.getContext('2d');
      const data = trainingHistory;
      
      // Clear canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Setup
      const padding = 60;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      const maxLoss = Math.max(...data.map(d => Math.max(d.loss, d.valLoss)));
      
      // Draw axes
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();
      
      // Draw grid
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
      }
      
      // Draw training loss line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.loss / maxLoss) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw validation loss line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.valLoss / maxLoss) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Epoch', canvas.width / 2, canvas.height - 20);
      ctx.save();
      ctx.translate(20, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Loss', 0, 0);
      ctx.restore();
      
      // Legend
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(canvas.width - 200, 30, 20, 3);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText('Training Loss', canvas.width - 170, 35);
      
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(canvas.width - 200, 50, 20, 3);
      ctx.fillStyle = '#666';
      ctx.fillText('Validation Loss', canvas.width - 170, 55);
    }
    
    // Draw Accuracy Chart
    function drawAccuracyChart() {
      const canvas = document.getElementById('accuracy-canvas');
      const ctx = canvas.getContext('2d');
      const data = trainingHistory;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 60;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      
      // Draw axes
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();
      
      // Draw grid
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
      }
      
      // Draw training accuracy
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.accuracy / 100) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw validation accuracy
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.valAccuracy / 100) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Epoch', canvas.width / 2, canvas.height - 20);
      ctx.save();
      ctx.translate(20, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Accuracy (%)', 0, 0);
      ctx.restore();
      
      // Legend
      ctx.fillStyle = '#10b981';
      ctx.fillRect(canvas.width - 220, 30, 20, 3);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText('Training Accuracy', canvas.width - 190, 35);
      
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(canvas.width - 220, 50, 20, 3);
      ctx.fillText('Validation Accuracy', canvas.width - 190, 55);
    }
    
    // Draw F1 Score Chart
    function drawF1Chart() {
      const canvas = document.getElementById('f1-canvas');
      const ctx = canvas.getContext('2d');
      const data = trainingHistory;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 60;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      
      // Draw axes
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();
      
      // Draw grid
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
      }
      
      // Draw training F1
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.f1Score / 100) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw validation F1
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = canvas.height - padding - (point.valF1Score / 100) * chartHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Epoch', canvas.width / 2, canvas.height - 20);
      ctx.save();
      ctx.translate(20, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('F1 Score (%)', 0, 0);
      ctx.restore();
      
      // Legend
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(canvas.width - 200, 30, 20, 3);
      ctx.fillStyle = '#666';
      ctx.textAlign = 'left';
      ctx.fillText('Training F1', canvas.width - 170, 35);
      
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(canvas.width - 200, 50, 20, 3);
      ctx.fillText('Validation F1', canvas.width - 170, 55);
    }
    
    // Draw Confusion Matrix
    function drawConfusionMatrix() {
      const canvas = document.getElementById('confusion-canvas');
      const ctx = canvas.getContext('2d');
      const matrix = confusionMatrix;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 100;
      const cellSize = 200;
      const startX = (canvas.width - cellSize * 2) / 2;
      const startY = (canvas.height - cellSize * 2) / 2;
      
      // Draw cells
      const maxValue = Math.max(matrix.truePositive, matrix.trueNegative, matrix.falsePositive, matrix.falseNegative);
      
      // True Positive (top-left)
      const tpIntensity = matrix.truePositive / maxValue;
      ctx.fillStyle = \`rgba(16, 185, 129, \${tpIntensity})\`;
      ctx.fillRect(startX, startY, cellSize, cellSize);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, cellSize, cellSize);
      
      // False Negative (top-right)
      const fnIntensity = matrix.falseNegative / maxValue;
      ctx.fillStyle = \`rgba(239, 68, 68, \${fnIntensity})\`;
      ctx.fillRect(startX + cellSize, startY, cellSize, cellSize);
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(startX + cellSize, startY, cellSize, cellSize);
      
      // False Positive (bottom-left)
      const fpIntensity = matrix.falsePositive / maxValue;
      ctx.fillStyle = \`rgba(239, 68, 68, \${fpIntensity})\`;
      ctx.fillRect(startX, startY + cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#ef4444';
      ctx.strokeRect(startX, startY + cellSize, cellSize, cellSize);
      
      // True Negative (bottom-right)
      const tnIntensity = matrix.trueNegative / maxValue;
      ctx.fillStyle = \`rgba(16, 185, 129, \${tnIntensity})\`;
      ctx.fillRect(startX + cellSize, startY + cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(startX + cellSize, startY + cellSize, cellSize, cellSize);
      
      // Draw values
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(matrix.truePositive.toString(), startX + cellSize / 2, startY + cellSize / 2);
      ctx.fillText(matrix.falseNegative.toString(), startX + cellSize * 1.5, startY + cellSize / 2);
      ctx.fillText(matrix.falsePositive.toString(), startX + cellSize / 2, startY + cellSize * 1.5);
      ctx.fillText(matrix.trueNegative.toString(), startX + cellSize * 1.5, startY + cellSize * 1.5);
      
      // Labels
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#666';
      
      // Top labels
      ctx.fillText('Predicted Fake', startX + cellSize / 2, startY - 30);
      ctx.fillText('Predicted Real', startX + cellSize * 1.5, startY - 30);
      
      // Side labels
      ctx.save();
      ctx.translate(startX - 50, startY + cellSize / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Actual Fake', 0, 0);
      ctx.restore();
      
      ctx.save();
      ctx.translate(startX - 50, startY + cellSize * 1.5);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Actual Real', 0, 0);
      ctx.restore();
      
      // Sub-labels
      ctx.font = '14px sans-serif';
      ctx.fillText('TP', startX + cellSize / 2, startY + cellSize / 2 + 40);
      ctx.fillText('FN', startX + cellSize * 1.5, startY + cellSize / 2 + 40);
      ctx.fillText('FP', startX + cellSize / 2, startY + cellSize * 1.5 + 40);
      ctx.fillText('TN', startX + cellSize * 1.5, startY + cellSize * 1.5 + 40);
    }
    
    // Draw all charts
    drawLossChart();
    drawAccuracyChart();
    drawF1Chart();
    drawConfusionMatrix();
  </script>
</body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(1000); // Wait for rendering

  // Capture individual graphs
  console.log('📸 Capturing graph screenshots...\n');
  
  const graphs = [
    { id: 'loss-chart', filename: 'training-loss.png', title: 'Training & Validation Loss' },
    { id: 'accuracy-chart', filename: 'training-accuracy.png', title: 'Training & Validation Accuracy' },
    { id: 'f1-chart', filename: 'f1-score.png', title: 'F1 Score Progression' },
    { id: 'confusion-chart', filename: 'confusion-matrix.png', title: 'Confusion Matrix' }
  ];

  for (const graph of graphs) {
    const element = await page.$(`#${graph.id}`);
    if (element) {
      const outputPath = path.join(outputDir, graph.filename);
      await element.screenshot({ path: outputPath });
      console.log(`✅ ${graph.title} → ${graph.filename}`);
    }
  }

  await browser.close();
  
  console.log(`\n✨ All graphs exported to: ${outputDir}`);
  console.log('\n📊 Generated files:');
  console.log('  - training-loss.png');
  console.log('  - training-accuracy.png');
  console.log('  - f1-score.png');
  console.log('  - confusion-matrix.png');
  
  return outputDir;
}

// Run the export
exportGraphsAsImages()
  .then((outputDir) => {
    console.log('\n🎉 Graph export completed successfully!');
    console.log(`\nYou can now find the images in: ${outputDir}`);
  })
  .catch((error) => {
    console.error('❌ Error exporting graphs:', error);
    process.exit(1);
  });
