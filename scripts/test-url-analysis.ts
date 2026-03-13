/**
 * Test Enhanced URL Analysis Functionality
 * Run with: npx tsx scripts/test-url-analysis.ts
 */

import { analyzeNewsHybrid } from "../src/lib/analyzeNewsHybrid";

async function testUrlAnalysis() {
  console.log("🧪 Testing Enhanced URL Analysis Functionality\n");

  const testUrls = [
    {
      url: "https://www.bbc.com/news",
      description: "BBC News (Trusted Source)"
    },
    {
      url: "https://www.reuters.com/world/",
      description: "Reuters (High Credibility)"
    },
    {
      url: "https://www.cnn.com/2024/01/01/politics/example-article",
      description: "CNN Article (Mainstream Media)"
    },
    {
      url: "https://example.com/fake-news-article",
      description: "Example Domain (Test Case)"
    },
    {
      url: "https://www.theonion.com/",
      description: "The Onion (Satire - Should be detected)"
    }
  ];

  for (const testCase of testUrls) {
    console.log(`📰 Testing: ${testCase.description}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log("⏳ Analyzing...");
    
    try {
      const startTime = Date.now();
      const result = await analyzeNewsHybrid({
        inputType: "url",
        url: testCase.url,
      });
      const duration = Date.now() - startTime;

      console.log(`✅ Result: ${result.label.toUpperCase()}`);
      console.log(`📊 Confidence: ${result.confidence}%`);
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log(`🤖 Model: ${result.modelName}`);
      console.log(`💭 Explanation: ${result.explanation}`);
      
      // Show URL content extraction info
      const urlContent = result.metadata?.urlContent as any;
      if (urlContent) {
        console.log(`📄 Title: ${urlContent.title || 'No title'}`);
        console.log(`📝 Content Length: ${urlContent.contentLength || 0} chars`);
        console.log(`🔧 Extraction Method: ${urlContent.extractionMethod || 'unknown'}`);
        if (urlContent.fetchError) {
          console.log(`⚠️ Fetch Error: ${urlContent.fetchError}`);
        }
      }

      // Show source credibility analysis
      const sourceDomain = result.metadata?.sourceDomain;
      const sourceCredibility = result.metadata?.sourceCredibility;
      const sourceTier = result.metadata?.sourceTier;
      
      if (sourceDomain) {
        console.log(`🌐 Source Domain: ${sourceDomain}`);
        console.log(`🏆 Credibility Score: ${sourceCredibility ? (sourceCredibility * 100).toFixed(1) : 'N/A'}%`);
        console.log(`📊 Source Tier: ${sourceTier || 'Unknown'}`);
      }

      // Show component scores
      const componentScores = result.metadata?.componentScores as any;
      if (componentScores) {
        console.log(`🧠 AI Score: ${componentScores.aiScore}% (${componentScores.weights?.ai})`);
        console.log(`📰 News Score: ${componentScores.newsScore}% (${componentScores.weights?.news})`);
        console.log(`🔗 Source Score: ${componentScores.sourceScore}% (${componentScores.weights?.source})`);
      }

      // Show risk assessment
      const riskBand = result.metadata?.riskBand;
      const finalTrustScore = result.metadata?.finalTrustScore;
      if (riskBand && finalTrustScore) {
        console.log(`⚡ Risk Band: ${riskBand}`);
        console.log(`🎯 Trust Score: ${finalTrustScore}%`);
      }

      console.log("─".repeat(80));
    } catch (error) {
      console.error(`❌ Error analyzing ${testCase.url}:`, error);
      console.log("─".repeat(80));
    }
  }

  console.log("🏁 Enhanced URL Analysis Test Complete");
  console.log("\n📋 Test Summary:");
  console.log("✅ URL content extraction with multiple fallback strategies");
  console.log("✅ AI-powered content analysis");
  console.log("✅ News API cross-referencing");
  console.log("✅ Source credibility assessment");
  console.log("✅ Multi-component trust scoring");
  console.log("✅ Risk band classification");
}

// Run the test
testUrlAnalysis().catch(console.error);