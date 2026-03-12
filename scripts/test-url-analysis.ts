/**
 * Test URL Analysis Functionality
 * Run with: npx tsx scripts/test-url-analysis.ts
 */

import { analyzeNewsHybrid } from "../src/lib/analyzeNewsHybrid";

async function testUrlAnalysis() {
  console.log("🧪 Testing URL Analysis Functionality\n");

  const testUrls = [
    "https://www.bbc.com/news",
    "https://www.reuters.com/world/",
    "https://www.cnn.com/2024/01/01/politics/example-article",
    "https://example.com/fake-news-article",
  ];

  for (const url of testUrls) {
    console.log(`📰 Testing URL: ${url}`);
    console.log("⏳ Analyzing...");
    
    try {
      const result = await analyzeNewsHybrid({
        inputType: "url",
        url: url,
      });

      console.log(`✅ Result: ${result.label.toUpperCase()}`);
      console.log(`📊 Confidence: ${result.confidence}%`);
      console.log(`💭 Explanation: ${result.explanation}`);
      
      if (result.blockchain) {
        console.log(`🔗 Blockchain: ${result.blockchain.stored ? 'Stored' : 'Not stored'}`);
        if (result.blockchain.txHash) {
          console.log(`📝 TX Hash: ${result.blockchain.txHash}`);
        }
        if (result.blockchain.error) {
          console.log(`❌ Blockchain Error: ${result.blockchain.error}`);
        }
      }

      // Show URL content extraction info
      const urlContent = result.metadata?.urlContent as any;
      if (urlContent) {
        console.log(`📄 Title: ${urlContent.title || 'No title'}`);
        console.log(`📝 Content Length: ${urlContent.content?.length || 0} chars`);
        if (urlContent.fetchError) {
          console.log(`⚠️ Fetch Error: ${urlContent.fetchError}`);
        }
      }

      console.log("─".repeat(60));
    } catch (error) {
      console.error(`❌ Error analyzing ${url}:`, error);
      console.log("─".repeat(60));
    }
  }

  console.log("🏁 URL Analysis Test Complete");
}

// Run the test
testUrlAnalysis().catch(console.error);