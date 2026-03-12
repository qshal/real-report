import { Brain, Newspaper, Globe, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface ComponentScores {
  aiScore: number;
  newsScore: number;
  sourceScore: number;
  weights: {
    ai: string;
    news: string;
    source: string;
  };
}

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

  // Calculate average component scores
  const analysesWithComponents = history.filter((item) => {
    const meta = item.analysis_metadata as Record<string, unknown> | null;
    return meta && meta.componentScores;
  });

  const avgComponentScores = analysesWithComponents.length > 0
    ? analysesWithComponents.reduce((acc, item) => {
        const meta = item.analysis_metadata as Record<string, unknown>;
        const comp = meta.componentScores as ComponentScores;
        return {
          aiScore: acc.aiScore + comp.aiScore,
          newsScore: acc.newsScore + comp.newsScore,
          sourceScore: acc.sourceScore + comp.sourceScore,
        };
      }, { aiScore: 0, newsScore: 0, sourceScore: 0 })
    : null;

  if (avgComponentScores) {
    avgComponentScores.aiScore /= analysesWithComponents.length;
    avgComponentScores.newsScore /= analysesWithComponents.length;
    avgComponentScores.sourceScore /= analysesWithComponents.length;
  }

  return (
    <TooltipProvider>
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
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Average Trust Score</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weighted combination of AI, News, and Source scores</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-2 text-2xl font-bold">{Math.round(avgTrustScore)}%</p>
              <p className="text-xs text-muted-foreground">Based on {analysesWithTrust.length} analyses</p>
            </div>
          )}

          {/* Component Scores Breakdown */}
          {avgComponentScores && (
            <div className="rounded-xl border border-border/80 bg-card/70 p-4">
              <h4 className="text-sm font-semibold mb-3">Trust Score Components</h4>
              <div className="space-y-3">
                {/* AI Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">AI Analysis</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pollinations AI confidence score (40% weight)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${avgComponentScores.aiScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(avgComponentScores.aiScore)}%</span>
                    <span className="text-xs text-muted-foreground w-8">40%</span>
                  </div>
                </div>

                {/* News Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-green-500" />
                    <span className="text-sm">News Verification</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>NewsAPI verification score (35% weight)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${avgComponentScores.newsScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(avgComponentScores.newsScore)}%</span>
                    <span className="text-xs text-muted-foreground w-8">35%</span>
                  </div>
                </div>

                {/* Source Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Source Credibility</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Domain reputation score (25% weight)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500" 
                        style={{ width: `${avgComponentScores.sourceScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(avgComponentScores.sourceScore)}%</span>
                    <span className="text-xs text-muted-foreground w-8">25%</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <p className="text-xs text-muted-foreground">
                Formula: (AI × 0.40) + (News × 0.35) + (Source × 0.25)
              </p>
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
    </TooltipProvider>
  );
};
