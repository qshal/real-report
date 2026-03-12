// supabase/functions/analyze-news/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PredictionLabel = "real" | "fake" | "misleading";

type AnalyzeRequest =
  | {
      inputType: "text";
      text: string;
    }
  | {
      inputType: "url";
      url: string;
    };

const fakeSignals = ["shocking", "they don't want you to know", "miracle cure", "100% proven", "secret", "hoax"];
const misleadingSignals = ["sources say", "viral", "breaking", "unverified", "rumor", "maybe"];
const riskyDomains = ["beforeitsnews.com", "infowars.com", "naturalnews.com"];
const trustedDomains = ["reuters.com", "apnews.com", "bbc.com", "nytimes.com", "wsj.com"];

const parseDomain = (inputUrl: string) => {
  try {
    return new URL(inputUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

const metadataRiskScore = (payload: AnalyzeRequest) => {
  const sourceText = (payload.inputType === "text" ? payload.text : payload.url).toLowerCase();
  const fakeHits = fakeSignals.filter((signal) => sourceText.includes(signal)).length;
  const misleadingHits = misleadingSignals.filter((signal) => sourceText.includes(signal)).length;
  const punctuationBoost = (sourceText.match(/!{2,}|\?{2,}/g) ?? []).length;

  const domain = payload.inputType === "url" ? parseDomain(payload.url) : null;
  const domainRisk = domain && riskyDomains.some((d) => domain.endsWith(d)) ? 30 : 0;
  const trustedBonus = domain && trustedDomains.some((d) => domain.endsWith(d)) ? -20 : 0;

  const score = Math.max(0, Math.min(100, fakeHits * 20 + misleadingHits * 10 + punctuationBoost * 6 + domainRisk + trustedBonus));

  return {
    score,
    features: {
      fakeHits,
      misleadingHits,
      punctuationBoost,
      domain,
      domainRisk,
      trustedBonus,
    },
  };
};

const normalizeLabel = (value: string | undefined): PredictionLabel => {
  if (value === "fake" || value === "misleading") return value;
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
              "You are a misinformation classifier. Return ONLY compact JSON: {\"label\":\"real|fake|misleading\",\"confidence\":number,\"explanation\":string}. Use both linguistic signals and metadata risk score.",
          },
          {
            role: "user",
            content: JSON.stringify({
              inputType: payload.inputType,
              content,
              metadataRiskScore: metadata.score,
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
    if (metadata.score <= 25 && aiLabel === "fake" && aiConfidence < 75) finalLabel = "misleading";

    const alignmentBoost =
      (finalLabel === "fake" && metadata.score >= 60) ||
      (finalLabel === "real" && metadata.score <= 25) ||
      (finalLabel === "misleading" && metadata.score > 25 && metadata.score < 60)
        ? 5
        : 0;

    const finalConfidence = Math.min(99, Math.round(aiConfidence + alignmentBoost));

    return new Response(
      JSON.stringify({
        label: finalLabel,
        confidence: finalConfidence,
        explanation: aiParsed.explanation ?? "Hybrid classification completed from language + metadata features.",
        modelName: "hybrid/gemini-3-flash-preview+metadata-v1",
        metadata: {
          ...metadata.features,
          metadataRiskScore: metadata.score,
          aiLabel,
          aiConfidence,
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
