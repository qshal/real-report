import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PredictionLabel = "real" | "fake" | "misleading";

type NewsCheckForMetrics = {
  predicted_label: string;
  baseline_predicted_label?: string | null;
  verified_label?: string | null;
  analysis_metadata?: Record<string, unknown> | null;
};

type Metrics = {
  precision: number;
  recall: number;
};

const labels: PredictionLabel[] = ["real", "fake", "misleading"];

const toPercent = (value: number) => `${Math.round(value * 100)}%`;

const computeMacroMetrics = (rows: NewsCheckForMetrics[], pickPrediction: (row: NewsCheckForMetrics) => string | null | undefined): Metrics => {
  const perClass = labels.map((label) => {
    const tp = rows.filter((row) => row.verified_label === label && pickPrediction(row) === label).length;
    const fp = rows.filter((row) => row.verified_label !== label && pickPrediction(row) === label).length;
    const fn = rows.filter((row) => row.verified_label === label && pickPrediction(row) !== label).length;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

    return { precision, recall };
  });

  const precision = perClass.reduce((sum, cls) => sum + cls.precision, 0) / labels.length;
  const recall = perClass.reduce((sum, cls) => sum + cls.recall, 0) / labels.length;

  return { precision, recall };
};

export const ModelComparisonCard = ({ history }: { history: NewsCheckForMetrics[] }) => {
  const verifiedRows = history.filter((item) => item.verified_label);

  const hybrid = computeMacroMetrics(verifiedRows, (row) => row.predicted_label);
  const baseline = computeMacroMetrics(verifiedRows, (row) => row.baseline_predicted_label ?? null);

  // Calculate average trust score from all analyses
  const analysesWithTrust = history.filter((item) => {
    const meta = item.analysis_metadata as Record<string, unknown> | null;
    return meta && typeof meta.trustScore === 'number';
  });
  
  const avgTrustScore = analysesWithTrust.length > 0
    ? analysesWithTrust.reduce((sum, item) => {
        const meta = item.analysis_metadata as Record<string, unknown>;
        return sum + (meta.trustScore as number);
      }, 0) / analysesWithTrust.length
    : null;

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Model comparison</CardTitle>
        <CardDescription>
          Precision/recall are computed on manually verified labels ({verifiedRows.length} labeled samples).
          {verifiedRows.length === 0 && (
            <span className="block mt-1 text-amber-600">
              Verify predictions below to enable model comparison metrics.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {avgTrustScore !== null && (
          <div className="rounded-xl border border-border/80 bg-card/70 p-4">
            <p className="text-sm text-muted-foreground">Average Trust Score</p>
            <p className="mt-2 text-2xl font-bold">{Math.round(avgTrustScore)}%</p>
            <p className="text-xs text-muted-foreground">Based on {analysesWithTrust.length} analyses</p>
          </div>
        )}
        
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-border/80 bg-card/70 p-4">
            <p className="text-sm text-muted-foreground">Baseline (rule-based)</p>
            <p className="mt-2 text-sm">Precision: <span className="font-semibold">{toPercent(baseline.precision)}</span></p>
            <p className="text-sm">Recall: <span className="font-semibold">{toPercent(baseline.recall)}</span></p>
            {verifiedRows.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No verified data yet</p>
            )}
          </article>
          <article className="rounded-xl border border-border/80 bg-card/70 p-4">
            <p className="text-sm text-muted-foreground">Hybrid (AI + metadata)</p>
            <p className="mt-2 text-sm">Precision: <span className="font-semibold">{toPercent(hybrid.precision)}</span></p>
            <p className="text-sm">Recall: <span className="font-semibold">{toPercent(hybrid.recall)}</span></p>
            {verifiedRows.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No verified data yet</p>
            )}
          </article>
        </div>
      </CardContent>
    </Card>
  );
};
