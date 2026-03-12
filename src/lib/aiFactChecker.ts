/**
 * AI-Powered Fact Checking using Pollinations AI (Free, No API Key)
 * 
 * Pollinations provides free text generation without API keys
 * Website: https://pollinations.ai
 */

export interface AIFactCheckResult {
  isFactual: boolean;
  confidence: number;
  explanation: string;
  keyClaims: string[];
  potentialIssues: string[];
}

// Using Pollinations AI (completely free, no API key needed)
const POLLINATIONS_API_URL = "https://text.pollinations.ai";

/**
 * Analyze text using Pollinations AI for factual accuracy
 */
export async function analyzeWithAI(
  text: string,
  _apiKey?: string
): Promise<AIFactCheckResult | null> {
  const prompt = `You are a fact-checking AI. Analyze the following text for factual accuracy.

Text to analyze: """${text.slice(0, 2000)}"""

Respond ONLY in this exact JSON format:
{
  "isFactual": boolean (true if mostly factual, false if contains false/misleading claims),
  "confidence": number (0-100, how confident you are in this assessment),
  "explanation": string (brief explanation of your reasoning),
  "keyClaims": string[] (list of 2-4 specific factual claims made in the text),
  "potentialIssues": string[] (list of any false, misleading, or unverifiable statements)
}

Be critical and skeptical. Common knowledge and opinions are fine, but specific facts, statistics, and scientific claims should be flagged if they seem questionable.`;

  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
    
    const response = await fetch(`${POLLINATIONS_API_URL}/${encodeURIComponent(prompt)}?model=openai&seed=42&json=true`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pollinations API error:", response.status, errorText);
      
      // Return error info for debugging
      return {
        isFactual: false,
        confidence: 0,
        explanation: `API Error ${response.status}: ${errorText.slice(0, 100)}`,
        keyClaims: [],
        potentialIssues: ["API request failed"],
      };
    }

    const generatedText = await response.text();

    if (!generatedText) {
      console.error("No response from Pollinations");
      return null;
    }

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse Pollinations response:", generatedText);
      return null;
    }

    const result: AIFactCheckResult = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    console.error("AI analysis error:", error);
    return null;
  }
}

/**
 * Get API key from environment (not needed for Pollinations)
 */
export function getGeminiApiKey(): string | undefined {
  return undefined;
}

/**
 * Convert AI result to label format
 */
export function aiResultToLabel(result: AIFactCheckResult): {
  label: "real" | "fake" | "misleading";
  confidence: number;
  explanation: string;
} {
  if (!result.isFactual && result.confidence > 60) {
    return {
      label: "fake",
      confidence: result.confidence,
      explanation: `AI Analysis: ${result.explanation}${result.potentialIssues.length > 0 ? ` Issues found: ${result.potentialIssues.join("; ")}` : ""}`,
    };
  }

  if (!result.isFactual && result.confidence <= 60) {
    return {
      label: "misleading",
      confidence: result.confidence,
      explanation: `AI Analysis: Potentially misleading. ${result.explanation}`,
    };
  }

  if (result.isFactual && result.confidence > 70) {
    return {
      label: "real",
      confidence: result.confidence,
      explanation: `AI Analysis: Appears factual. ${result.explanation}`,
    };
  }

  // Uncertain
  return {
    label: "misleading",
    confidence: 50,
    explanation: `AI Analysis: Uncertain assessment. ${result.explanation}`,
  };
}
