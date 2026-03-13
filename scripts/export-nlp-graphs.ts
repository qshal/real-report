/**
 * Export NLP Model Comparison Graphs as PNG Images
 */

import { chromium } from 'playwright';
import { generateNLPModelComparison } from '../src/lib/nlpModelComparison';
import fs from 'fs';
import path from 'path';

async function exportNLPGraphs() {
  console.log('🧠 Starting NLP graph export process...\n');

  const comparison = generateNLPModelComparison();
  
  const outputDir = path.join(process.cwd(), 'public', 'graphs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🌐 Launching headless browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 }
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
  <div id="performance-chart" class="graph-container">
    <h2>BERT vs RoBERTa vs Others: Performance Comparison</h2>
    <canvas id="performance-canvas" width="1100" height="500"></canvas>
  </div>
  
  <div id="training-chart" class="graph-container">
    <h2>Training Convergence: BERT vs RoBERTa vs DistilBERT</h2>
    <canvas id="training-canvas" width="1100" height="500"></canvas>
  </div>
  
  <div id="resources-chart" class="graph-container">
    <h2>Resource Usage Comparison</h2>
    <canvas id="resources-canvas" width="1100" height="500"></canvas>
  </div>

  <script>
    const models = ${JSON.stringify(comparison.models)};
    const trainingHistory = ${JSON.stringify(comparison.trainingHistory)};
    
    // Draw Performance Comparison
    function drawPerformanceChart() {
      const canvas = document.getElementById('performance-canvas');
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 80;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      const barWidth = chartWidth / (models.length * 4 + models.length);
      const groupGap = barWidth;
      
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
        
        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(\`\${100 - i * 20}%\`, padding - 10, y + 4);
      }
      
      const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
      const metrics = ['f1Score', 'accuracy', 'precision', 'recall'];
      const labels = ['F1', 'Accuracy', 'Precision', 'Recall'];
      
      models.forEach((model, modelIndex) => {
        const groupX = padding + modelIndex * (barWidth * 4 + groupGap);
        
        metrics.forEach((metric, metricIndex) => {
          const value = model[metric];
          const barHeight = (value * chartHeight);
          const x = groupX + metricIndex * barWidth;
          const y = canvas.height - padding - barHeight;
          
          ctx.fillStyle = colors[metricIndex];
          ctx.fillRect(x, y, barWidth * 0.9, barHeight);
          
          // Value labels
          ctx.fillStyle = '#1a1a1a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(\`\${(value * 100).toFixed(1)}\`, x + barWidth * 0.45, y - 5);
        });
        
        // Model name
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(groupX + barWidth * 2, canvas.height - padding + 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(model.modelName, 0, 0);
        ctx.restore();
      });
      
      // Legend
      labels.forEach((label, i) => {
        const legendX = canvas.width - 250;
        const legendY = 40 + i * 25;
        ctx.fillStyle = colors[i];
        ctx.fillRect(legendX, legendY, 20, 15);
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, legendX + 30, legendY + 12);
      });
      
      // Title
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Performance Metrics (%)', padding, padding - 20);
    }
    
    // Draw Training Convergence
    function drawTrainingChart() {
      const canvas = document.getElementById('training-canvas');
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 80;
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
        
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(\`\${(1 - i * 0.2).toFixed(1)}\`, padding - 10, y + 4);
      }
      
      // X-axis labels
      for (let i = 0; i <= 6; i++) {
        const x = padding + (chartWidth / 6) * i;
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText(\`\${i * 5}\`, x, canvas.height - padding + 20);
      }
      
      // Draw lines
      const colors = { bert: '#3b82f6', roberta: '#8b5cf6', distilbert: '#10b981' };
      const models = ['bert', 'roberta', 'distilbert'];
      const labels = ['BERT', 'RoBERTa', 'DistilBERT'];
      
      models.forEach((model, modelIndex) => {
        ctx.strokeStyle = colors[model];
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        trainingHistory.forEach((point, i) => {
          const x = padding + (i / (trainingHistory.length - 1)) * chartWidth;
          const y = canvas.height - padding - (point[model].f1 * chartHeight);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        
        ctx.stroke();
        
        // Legend
        const legendX = canvas.width - 250;
        const legendY = 40 + modelIndex * 25;
        ctx.strokeStyle = colors[model];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(legendX, legendY + 7);
        ctx.lineTo(legendX + 30, legendY + 7);
        ctx.stroke();
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(labels[modelIndex], legendX + 40, legendY + 12);
      });
      
      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Epoch', canvas.width / 2, canvas.height - 30);
      ctx.save();
      ctx.translate(30, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('F1 Score', 0, 0);
      ctx.restore();
    }
    
    // Draw Resources Chart
    function drawResourcesChart() {
      const canvas = document.getElementById('resources-canvas');
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const padding = 80;
      const chartWidth = canvas.width - 2 * padding;
      const chartHeight = canvas.height - 2 * padding;
      const barWidth = chartWidth / (models.length * 3 + models.length);
      const groupGap = barWidth;
      
      // Draw axes
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      ctx.stroke();
      
      const colors = ['#ef4444', '#f59e0b', '#3b82f6'];
      const metrics = ['inferenceTime', 'memoryUsage', 'trainingTime'];
      const labels = ['Inference (ms)', 'Memory (MB/10)', 'Training (hrs)'];
      const scales = [1, 0.1, 1];
      const maxValues = [60, 150, 12];
      
      models.forEach((model, modelIndex) => {
        const groupX = padding + modelIndex * (barWidth * 3 + groupGap);
        
        metrics.forEach((metric, metricIndex) => {
          const value = model[metric] * scales[metricIndex];
          const barHeight = (value / maxValues[metricIndex]) * chartHeight;
          const x = groupX + metricIndex * barWidth;
          const y = canvas.height - padding - barHeight;
          
          ctx.fillStyle = colors[metricIndex];
          ctx.fillRect(x, y, barWidth * 0.9, barHeight);
          
          // Value labels
          ctx.fillStyle = '#1a1a1a';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(\`\${value.toFixed(0)}\`, x + barWidth * 0.45, y - 5);
        });
        
        // Model name
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(groupX + barWidth * 1.5, canvas.height - padding + 20);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(model.modelName, 0, 0);
        ctx.restore();
      });
      
      // Legend
      labels.forEach((label, i) => {
        const legendX = canvas.width - 250;
        const legendY = 40 + i * 25;
        ctx.fillStyle = colors[i];
        ctx.fillRect(legendX, legendY, 20, 15);
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, legendX + 30, legendY + 12);
      });
    }
    
    drawPerformanceChart();
    drawTrainingChart();
    drawResourcesChart();
  </script>
</body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(1000);

  console.log('📸 Capturing NLP comparison graphs...\n');
  
  const graphs = [
    { id: 'performance-chart', filename: 'nlp-performance-comparison.png', title: 'Performance Comparison' },
    { id: 'training-chart', filename: 'nlp-training-convergence.png', title: 'Training Convergence' },
    { id: 'resources-chart', filename: 'nlp-resource-usage.png', title: 'Resource Usage' }
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
  
  console.log(`\n✨ All NLP graphs exported to: ${outputDir}`);
  console.log('\n📊 Generated files:');
  console.log('  - nlp-performance-comparison.png');
  console.log('  - nlp-training-convergence.png');
  console.log('  - nlp-resource-usage.png');
  
  return outputDir;
}

exportNLPGraphs()
  .then((outputDir) => {
    console.log('\n🎉 NLP graph export completed successfully!');
    console.log(`\nYou can now find the images in: ${outputDir}`);
  })
  .catch((error) => {
    console.error('❌ Error exporting NLP graphs:', error);
    process.exit(1);
  });
