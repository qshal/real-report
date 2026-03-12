import { z } from "zod";

export const analysisSchema = z.discriminatedUnion("inputType", [
  z.object({
    inputType: z.literal("text"),
    text: z.string().trim().min(30, "Enter at least 30 characters."),
  }),
  z.object({
    inputType: z.literal("url"),
    url: z.string().trim().url("Enter a valid URL."),
  }),
]);

export type PredictionLabel = "real" | "fake" | "misleading";

export type PredictionResult = {
  label: PredictionLabel;
  confidence: number;
  explanation: string;
};

const fakeSignals = ["shocking", "they don't want you to know", "miracle cure", "100% proven", "secret", "hoax"];
const misleadingSignals = ["sources say", "viral", "breaking", "unverified", "rumor", "maybe"];

export const predictFakeNews = (rawInput: string): PredictionResult => {
  const input = rawInput.toLowerCase();

  const fakeHits = fakeSignals.filter((signal) => input.includes(signal)).length;
  const misleadingHits = misleadingSignals.filter((signal) => input.includes(signal)).length;
  const punctuationBoost = (input.match(/!{2,}|\?{2,}/g) ?? []).length;

  const riskScore = fakeHits * 24 + misleadingHits * 12 + punctuationBoost * 8;

  if (riskScore >= 52) {
    return {
      label: "fake",
      confidence: Math.min(97, 66 + riskScore / 2),
      explanation: "High-risk language patterns and sensational phrasing indicate likely misinformation.",
    };
  }

  if (riskScore >= 22) {
    return {
      label: "misleading",
      confidence: Math.min(91, 58 + riskScore / 2),
      explanation: "The text contains ambiguous credibility signals and needs manual verification.",
    };
  }

  return {
    label: "real",
    confidence: Math.max(72, 88 - riskScore / 3),
    explanation: "No major manipulation markers were detected in the submitted content.",
  };
};
