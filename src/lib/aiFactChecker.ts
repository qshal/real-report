/**
 * AI-Powered Fact Checking using Mistral AI API
 * 
 * This uses a large language model to analyze claims for factual accuracy
 * even when they haven't been previously fact-checked.
 */

export interface AIFactCheckResult {
  isFactual: boolean;
  confidence: number;
  explanation: string;
  keyClaims: string[];
  potentialIssues: string[];
}

// Using Mistral AI API (free tier available)
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

/**
 * Analyze text using Mistral AI for factual accuracy
 */
export async function analyzeWithAI(
  text: string,
  apiKey?: string
): Promise<AIFactCheckResult | null> {
  if (!apiKey) {
    console.warn("No Mistral API key provided");
    return null;
  }

  const systemPrompt = `You are a fact-checking AI. Analyze text for factual accuracy.
Respond ONLY in this exact JSON format:
{
  "isFactual": boolean (true if mostly factual, false if contains false/misleading claims),
  "confidence": number (0-100, how confident you are in this assessment),
  "explanation": string (brief explanation of your reasoning),
  "keyClaims": string[] (list of 2-4 specific factual claims made in the text),
  "potentialIssues": string[] (list of any false, misleading, or unverifiable statements)
}

Be critical and skeptical. Common knowledge and opinions are fine, but specific facts, statistics, and scientific claims should be flagged if they seem questionable.`;

  const userPrompt = `Text to analyze: """${text.slice(0, 2000)}"""`;

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral API error:", response.status, errorText);
      
      // Return error info for debugging
      return {
        isFactual: false,
        confidence: 0,
        explanation: `API Error ${response.status}: ${errorText.slice(0, 100)}`,
        keyClaims: [],
        potentialIssues: ["API request failed"],
      };
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error("No response from Mistral");
      return null;
    }

    const result: AIFactCheckResult = JSON.parse(generatedText);
    return result;
  } catch (error) {
    console.error("AI analysis error:", error);
    return null;
  }
}

/**
 * Get Mistral API key from environment
 */
export function getGeminiApiKey(): string | undefined {
  return import.meta.env.VITE_MISTRAL_API_KEY;
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
