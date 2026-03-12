/**
 * AI-Powered Fact Checking using Hugging Face Inference API (Free Tier)
 * 
 * Hugging Face provides free inference for open-source models
 * Get free API key from: https://huggingface.co/settings/tokens
 */

export interface AIFactCheckResult {
  isFactual: boolean;
  confidence: number;
  explanation: string;
  keyClaims: string[];
  potentialIssues: string[];
}

// Using Hugging Face Inference API
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

/**
 * Analyze text using Hugging Face AI for factual accuracy
 */
export async function analyzeWithAI(
  text: string,
  apiKey?: string
): Promise<AIFactCheckResult | null> {
  if (!apiKey) {
    console.warn("No Hugging Face API key provided");
    return null;
  }

  const prompt = `<s>[INST] You are a fact-checking AI. Analyze the following text for factual accuracy.

Text to analyze: """${text.slice(0, 2000)}"""

Respond in this exact JSON format:
{
  "isFactual": boolean (true if mostly factual, false if contains false/misleading claims),
  "confidence": number (0-100, how confident you are in this assessment),
  "explanation": string (brief explanation of your reasoning),
  "keyClaims": string[] (list of 2-4 specific factual claims made in the text),
  "potentialIssues": string[] (list of any false, misleading, or unverifiable statements)
}

Be critical and skeptical. Common knowledge and opinions are fine, but specific facts, statistics, and scientific claims should be flagged if they seem questionable. [/INST]`;

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.1,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
      
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
    const generatedText = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

    if (!generatedText) {
      console.error("No response from Hugging Face");
      return null;
    }

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse Hugging Face response:", generatedText);
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
 * Get Hugging Face API key from environment
 */
export function getGeminiApiKey(): string | undefined {
  return import.meta.env.VITE_HF_API_KEY;
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
