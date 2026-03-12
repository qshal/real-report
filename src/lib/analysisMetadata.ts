import type { Json } from "@/integrations/supabase/types";

export type AnalysisMetadataSummary = {
  fakeProbability: number | null;
  trustScore: number | null;
  riskBand: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const summarizeAnalysisMetadata = (metadata: Json | null | undefined): AnalysisMetadataSummary => {
  if (!isRecord(metadata)) {
    return { fakeProbability: null, trustScore: null, riskBand: null };
  }

  const fakeProbabilityRaw =
    toNumber(metadata.fakeProbability) ??
    toNumber(metadata.fake_probability) ??
    toNumber(metadata.metadataRiskScore);
  const trustScoreRaw = toNumber(metadata.trustScore) ?? toNumber(metadata.trust_score);
  const riskBand = typeof metadata.riskBand === "string" ? metadata.riskBand : null;

  return {
    fakeProbability: fakeProbabilityRaw === null ? null : clampPercent(fakeProbabilityRaw),
    trustScore: trustScoreRaw === null ? null : clampPercent(trustScoreRaw),
    riskBand,
  };
};
