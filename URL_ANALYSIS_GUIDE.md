# Enhanced URL Analysis Guide

This guide explains the comprehensive URL analysis system that extracts content from web pages and performs multi-layered fact-checking.

## Overview

The URL analysis system provides:
- **Advanced Content Extraction**: Multiple strategies to fetch article content
- **AI-Powered Analysis**: Gemini AI for content verification
- **News Cross-Referencing**: NewsAPI verification against trusted sources
- **Source Credibility Assessment**: Domain reputation analysis
- **Multi-Component Scoring**: Weighted trust scores and risk assessment

## Architecture

```
URL Input → Content Extraction → AI Analysis → News Verification → Source Analysis → Final Verdict
```

## Content Extraction Strategies

### 1. Direct Fetch
- Attempts direct CORS-enabled fetch
- Works for sites with proper CORS headers
- Fastest method when available

### 2. CORS Proxy Fallback
- **AllOrigins**: `api.allorigins.win`
- **CorsProxy**: `corsproxy.io`
- **ThingProxy**: `thingproxy.freeboard.io`
- **CorsAnywhere**: `cors-anywhere.herokuapp.com`

### 3. Content Extraction
- **Semantic HTML5**: `<article>`, `<main>`, `<section>`
- **Common Patterns**: `.content`, `.article`, `.post`, `.story`
- **Meta Data**: Title, description, Open Graph tags
- **Content Cleaning**: Removes scripts, styles, ads, navigation

### 4. Fallback Analysis
- URL structure analysis
- Domain reputation check
- Path-based title extraction

## Analysis Components

### AI Analysis (40% Weight)
- **Provider**: Gemini AI
- **Function**: Content fact-checking
- **Output**: Factual assessment, confidence score, explanation
- **Timeout**: 15 seconds

### News Verification (35% Weight)
- **Provider**: NewsAPI
- **Function**: Cross-reference against trusted sources
- **Sources**: BBC, Reuters, CNN, AP, etc.
- **Output**: Supporting/contradicting articles, fake probability
- **Timeout**: 5 seconds

### Source Credibility (25% Weight)
- **Function**: Domain reputation analysis
- **Tiers**: 1-6 credibility ranking
- **Factors**: Domain authority, bias rating, fact-check history
- **Output**: Credibility score, tier classification

## Scoring System

### Trust Score Calculation
```
Final Trust Score = (AI Score × 0.40) + (News Score × 0.35) + (Source Score × 0.25)
```

### Risk Band Classification
- **Low Risk**: Trust Score ≥ 80%
- **Low-Medium**: Trust Score 60-79%
- **Medium**: Trust Score 40-59%
- **Medium-High**: Trust Score 30-39%
- **High Risk**: Trust Score ≤ 30%

### Confidence Adjustment
- Clamps confidence between 1-99%
- Prevents overconfident predictions
- Maintains uncertainty representation

## URL Content Extraction Details

### HTML Parsing Strategy
1. **Title Extraction**
   - `<title>` tag content
   - Open Graph title (`og:title`)
   - Fallback to URL path analysis

2. **Content Extraction Priority**
   - Semantic HTML5 elements
   - Common content class patterns
   - Body content as fallback
   - Meta description if content is minimal

3. **Content Cleaning**
   - Remove scripts, styles, navigation
   - Strip HTML tags
   - Normalize whitespace
   - Limit to 5000 characters

### Error Handling
- **Network Timeouts**: 8-12 second limits per strategy
- **Proxy Failures**: Automatic fallback to next proxy
- **Content Extraction**: Graceful degradation to URL analysis
- **API Failures**: Fallback to available components

## Usage Examples

### Basic URL Analysis
```typescript
const result = await analyzeNewsHybrid({
  inputType: "url",
  url: "https://example.com/article"
});

console.log(result.label);        // "real" | "fake" | "misleading"
console.log(result.confidence);   // 1-99
console.log(result.explanation);  // AI explanation
```

### Accessing Metadata
```typescript
const metadata = result.metadata;

// URL content info
const urlContent = metadata.urlContent;
console.log(urlContent.title);           // Article title
console.log(urlContent.contentLength);   // Content length
console.log(urlContent.extractionMethod); // "direct" | "fallback"

// Component scores
const scores = metadata.componentScores;
console.log(scores.aiScore);      // AI component score
console.log(scores.newsScore);    // News verification score
console.log(scores.sourceScore);  // Source credibility score

// Risk assessment
console.log(metadata.riskBand);        // Risk classification
console.log(metadata.finalTrustScore); // Overall trust score
```

## Configuration

### Environment Variables
```env
VITE_NEWS_API_KEY="your_newsapi_key"
VITE_GEMINI_API_KEY="your_gemini_key"
```

### API Keys Required
1. **NewsAPI**: Get from [newsapi.org](https://newsapi.org)
2. **Gemini AI**: Get from [Google AI Studio](https://makersuite.google.com)

## Testing

### Run URL Analysis Tests
```bash
npx tsx scripts/test-url-analysis.ts
```

### Test Cases Include
- **Trusted Sources**: BBC, Reuters
- **Mainstream Media**: CNN, major outlets
- **Test Domains**: Example.com
- **Satire Sites**: The Onion (should be detected)

## Performance Optimization

### Timeout Management
- **AI Analysis**: 15 seconds (critical)
- **News Verification**: 5 seconds (supplementary)
- **URL Fetching**: 8-12 seconds per strategy

### Parallel Processing
- AI and News API calls run in parallel
- Multiple proxy attempts with timeouts
- Non-blocking error handling

### Content Limits
- **HTML Content**: 5000 characters max
- **Metadata Preview**: 500 characters
- **Article Lists**: 5 items max per category

## Error Handling

### Common Issues
1. **CORS Errors**: Handled by proxy fallback
2. **Network Timeouts**: Graceful degradation
3. **API Rate Limits**: Fallback to available components
4. **Invalid URLs**: URL parsing validation

### Fallback Behavior
- **Content Extraction Fails**: URL structure analysis
- **AI API Fails**: Returns "misleading" with 50% confidence
- **News API Fails**: Uses AI-only analysis
- **All Proxies Fail**: Domain-based analysis

## Best Practices

### URL Input Validation
- Ensure URLs are properly formatted
- Use HTTPS when possible
- Validate domain accessibility

### Performance Monitoring
- Track extraction success rates
- Monitor API response times
- Log proxy performance

### Content Quality
- Prefer semantic HTML extraction
- Validate content length and quality
- Handle dynamic/JavaScript-heavy sites

## Troubleshooting

### Common Problems
1. **"No content extracted"**
   - Site uses heavy JavaScript
   - CORS restrictions on all proxies
   - Content behind authentication

2. **"AI analysis failed"**
   - Invalid or missing Gemini API key
   - API rate limit exceeded
   - Network connectivity issues

3. **"NewsAPI timeout"**
   - API rate limit reached
   - Network latency issues
   - Service temporarily unavailable

### Debug Information
- Check browser console for proxy attempts
- Verify API keys in environment variables
- Test with known working URLs first

## Future Enhancements

### Potential Improvements
1. **JavaScript Rendering**: Puppeteer/Playwright integration
2. **Content Caching**: Redis for repeated URLs
3. **Proxy Rotation**: Dynamic proxy selection
4. **ML Enhancement**: Custom content extraction models
5. **Real-time Updates**: WebSocket for live analysis

### Scalability Considerations
- Implement request queuing for high volume
- Add CDN for static content
- Consider serverless architecture for analysis
- Implement result caching strategies

This enhanced URL analysis system provides comprehensive fact-checking capabilities while maintaining performance and reliability through multiple fallback strategies.