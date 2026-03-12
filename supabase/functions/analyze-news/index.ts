// supabase/functions/analyze-news/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PredictionLabel = "real" | "fake";

type AnalyzeRequest =
  | {
      inputType: "text";
      text: string;
    }
  | {
      inputType: "url";
      url: string;
    };

const sensationalSignals = ["shocking", "they don't want you to know", "miracle cure", "100% proven", "secret", "hoax"];
const speculativeSignals = ["sources say", "viral", "breaking", "unverified", "rumor", "maybe"];
const inconsistencySignals = ["contradiction", "impossible", "without evidence", "guaranteed", "everyone knows"];
const referenceSignals = ["according to", "report", "study", "official statement", "source"];
const riskyDomains = ["beforeitsnews.com", "infowars.com", "naturalnews.com"];
const trustedDomains = ["reuters.com", "apnews.com", "bbc.com", "nytimes.com", "wsj.com"];

const parseDomain = (inputUrl: string) => {
  try {
    return new URL(inputUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const countHits = (source: string, list: string[]) => list.filter((signal) => source.includes(signal)).length;

const metadataRiskScore = (payload: AnalyzeRequest) => {
  const sourceText = (payload.inputType === "text" ? payload.text : payload.url).toLowerCase();
  const sensationalHits = countHits(sourceText, sensationalSignals);
  const speculativeHits = countHits(sourceText, speculativeSignals);
  const inconsistencyHits = countHits(sourceText, inconsistencySignals);
  const referenceHits = countHits(sourceText, referenceSignals);
  const punctuationBoost = (sourceText.match(/!{2,}|\?{2,}/g) ?? []).length;

  const domain = payload.inputType === "url" ? parseDomain(payload.url) : null;
  const domainRisk = domain && riskyDomains.some((d) => domain.endsWith(d)) ? 30 : 0;
  const trustedBonus = domain && trustedDomains.some((d) => domain.endsWith(d)) ? 18 : 0;

  const score = Math.max(
    0,
    Math.min(
      100,
      sensationalHits * 16 + speculativeHits * 10 + inconsistencyHits * 12 + punctuationBoost * 5 + domainRisk - trustedBonus - referenceHits * 6,
    ),
  );

  const indicators = [
    sensationalHits > 0 ? `sensational_language:${sensationalHits}` : null,
    speculativeHits > 0 ? `speculative_claims:${speculativeHits}` : null,
    inconsistencyHits > 0 ? `logical_inconsistencies:${inconsistencyHits}` : null,
    referenceHits === 0 ? "no_credible_references_detected" : `reference_markers:${referenceHits}`,
    punctuationBoost > 0 ? `excessive_punctuation:${punctuationBoost}` : null,
    domain ? `source_domain:${domain}` : null,
  ].filter(Boolean);

  const sourceClass = domain
    ? riskyDomains.some((d) => domain.endsWith(d))
      ? "risky"
      : trustedDomains.some((d) => domain.endsWith(d))
        ? "trusted"
        : "unknown"
    : "not_applicable";

  return {
    score,
    indicators,
    features: {
      sensationalHits,
      speculativeHits,
      inconsistencyHits,
      referenceHits,
      punctuationBoost,
      domain,
      domainRisk,
      trustedBonus,
      sourceClass,
    },
  };
};

const normalizeLabel = (value: string | undefined): PredictionLabel => {
  if (value === "fake") return value;
  return "real";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = (await req.json()) as AnalyzeRequest;

    if (payload.inputType === "text" && (!payload.text || payload.text.trim().length < 30)) {
      return new Response(JSON.stringify({ error: "Text input must be at least 30 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.inputType === "url" && !payload.url) {
      return new Response(JSON.stringify({ error: "URL input is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.inputType !== "text" && payload.inputType !== "url") {
      return new Response(JSON.stringify({ error: "Invalid input type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = metadataRiskScore(payload);
    const content = payload.inputType === "text" ? payload.text : payload.url;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an analyst for misinformation detection. Return ONLY compact JSON with keys label, confidence, explanation. label must be one of real|fake. Consider semantics, writing style, internal consistency, and metadata indicators.",
          },
          {
            role: "user",
            content: JSON.stringify({
              inputType: payload.inputType,
              content,
              metadataRiskScore: metadata.score,
              indicators: metadata.indicators,
              metadataFeatures: metadata.features,
            }),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required for AI usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway request failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await aiResponse.json();
    const aiText = completion?.choices?.[0]?.message?.content ?? "{}";

    let aiParsed: { label?: string; confidence?: number; explanation?: string } = {};

    try {
      aiParsed = JSON.parse(aiText);
    } catch {
      const match = String(aiText).match(/\{[\s\S]*\}/);
      if (match) {
        aiParsed = JSON.parse(match[0]);
      }
    }

    const aiLabel = normalizeLabel(aiParsed.label);
    const aiConfidence = Math.max(51, Math.min(99, Number(aiParsed.confidence ?? 70)));

    let finalLabel: PredictionLabel = aiLabel;
    if (metadata.score >= 75 && aiLabel === "misleading") finalLabel = "fake";
    if (metadata.score <= 20 && aiLabel === "fake" && aiConfidence < 75) finalLabel = "misleading";

    const labelBias = finalLabel === "fake" ? 14 : finalLabel === "misleading" ? 6 : -8;
    const fakeProbability = Math.max(1, Math.min(99, Math.round(metadata.score * 0.55 + aiConfidence * 0.45 + labelBias)));
    const trustScore = Math.max(1, Math.min(99, Math.round(100 - fakeProbability + (metadata.features.trustedBonus > 0 ? 8 : 0))));

    const confidenceAlignmentBoost =
      (finalLabel === "fake" && fakeProbability >= 65) ||
      (finalLabel === "real" && trustScore >= 65) ||
      (finalLabel === "misleading" && fakeProbability >= 45 && fakeProbability < 70)
        ? 5
        : 0;

    const finalConfidence = Math.min(99, Math.round(aiConfidence + confidenceAlignmentBoost));

    const riskBand = fakeProbability >= 70 ? "high" : fakeProbability >= 45 ? "medium" : "low";

    return new Response(
      JSON.stringify({
        label: finalLabel,
        confidence: finalConfidence,
        explanation:
          aiParsed.explanation ??
          "Hybrid classification completed from semantic analysis and metadata trust indicators.",
        modelName: "hybrid/gemini-3-flash-preview+metadata-v2",
        metadata: {
          ...metadata.features,
          indicators: metadata.indicators,
          metadataRiskScore: metadata.score,
          aiLabel,
          aiConfidence,
          fakeProbability,
          trustScore,
          riskBand,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("analyze-news error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
