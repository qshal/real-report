import { BarChart3, FileCheck2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Json } from "@/integrations/supabase/types";
import { summarizeAnalysisMetadata } from "@/lib/analysisMetadata";

type Row = {
  predicted_label: string;
  explanation: string | null;
  confidence: number;
  created_at: string;
  input_text: string | null;
  source_url: string | null;
  analysis_metadata: Json;
};

const labelStyles: Record<string, string> = {
  real: "border-signal-real/30 bg-signal-real/10 text-signal-real",
  fake: "border-signal-fake/30 bg-signal-fake/10 text-signal-fake",
  misleading: "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
};

export const LatestAnalysisCard = ({ item }: { item?: Row }) => {
  if (!item) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Latest result</CardTitle>
          <CardDescription>Run your first analysis to see result details and scoring.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const summary = summarizeAnalysisMetadata(item.analysis_metadata);
  const sourcePreview = item.input_text?.slice(0, 160) ?? item.source_url ?? "No source preview available.";

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-brand-highlight" /> Latest result</CardTitle>
        <CardDescription>{new Date(item.created_at).toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge className={labelStyles[item.predicted_label] ?? ""}>{item.predicted_label.toUpperCase()}</Badge>
        <p className="text-sm text-muted-foreground">{item.explanation ?? "No explanation available."}</p>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="inline-flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Confidence: <span className="font-semibold">{Math.round(item.confidence)}%</span></p>
          {summary.fakeProbability !== null ? <p className="inline-flex items-center gap-1"><ShieldAlert className="h-4 w-4 text-signal-fake" /> Fake probability: <span className="font-semibold">{summary.fakeProbability}%</span></p> : null}
          {summary.trustScore !== null ? <p>Trust score: <span className="font-semibold">{summary.trustScore}%</span></p> : null}
          {summary.riskBand ? <p>Risk band: <span className="font-semibold">{summary.riskBand}</span></p> : null}
        </div>
        <p className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">{sourcePreview}</p>
      </CardContent>
    </Card>
  );
};
