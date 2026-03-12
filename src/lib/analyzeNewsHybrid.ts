import { supabase } from "@/integrations/supabase/client";
import type { PredictionLabel } from "@/lib/fakeNewsAnalyzer";

export type AnalyzeNewsPayload =
  | {
      inputType: "text";
      text: string;
    }
  | {
      inputType: "url";
      url: string;
    };

export type HybridAnalysisResult = {
  label: PredictionLabel;
  confidence: number;
  explanation: string;
  modelName: string;
  metadata: Record<string, unknown>;
};

export const analyzeNewsHybrid = async (payload: AnalyzeNewsPayload) => {
  const { data, error } = await supabase.functions.invoke("analyze-news", {
    body: payload,
  });

  if (error) throw new Error(error.message || "Backend analysis failed.");

  const result = data as Partial<HybridAnalysisResult> | null;

  if (!result?.label || typeof result.confidence !== "number") {
    throw new Error("Invalid backend analysis response.");
  }

  return {
    label: result.label,
    confidence: result.confidence,
    explanation: result.explanation ?? "Hybrid model completed analysis.",
    modelName: result.modelName ?? "hybrid/gemini-3-flash-preview+metadata-v1",
    metadata: result.metadata ?? {},
  } as HybridAnalysisResult;
};
