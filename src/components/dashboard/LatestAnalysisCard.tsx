import { BarChart3, FileCheck2, ShieldAlert, Newspaper, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  relevanceScore: number;
}

interface NewsVerification {
  trustedSourcesFound: number;
  supportingArticles: number;
  contradictingArticles: number;
  fakeProbability: number;
}

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
  
  // Extract news verification from metadata
  const metadata = item.analysis_metadata as Record<string, unknown> | null;
  const newsVerification = metadata?.newsVerification as NewsVerification | undefined;
  const supportingArticles = metadata?.supportingArticles as NewsArticle[] | undefined;
  const contradictingArticles = metadata?.contradictingArticles as NewsArticle[] | undefined;
  const hasNewsResults = newsVerification && newsVerification.trustedSourcesFound > 0;

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
          {hasNewsResults ? (
            <p className="inline-flex items-center gap-1"><Newspaper className="h-4 w-4 text-brand" /> News sources: <span className="font-semibold">{newsVerification.trustedSourcesFound}</span></p>
          ) : null}
        </div>
        
        {/* News Articles Section */}
        {hasNewsResults && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4" /> Related News Articles
              </h4>
              
              {supportingArticles && supportingArticles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-signal-real font-medium">Supporting ({supportingArticles.length})</p>
                  {supportingArticles.slice(0, 3).map((article, idx) => (
                    <a
                      key={idx}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-2 text-xs hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <p className="text-muted-foreground truncate">{article.source} • {new Date(article.publishedAt).toLocaleDateString()}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              
              {contradictingArticles && contradictingArticles.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs text-signal-fake font-medium">Contradicting ({contradictingArticles.length})</p>
                  {contradictingArticles.slice(0, 3).map((article, idx) => (
                    <a
                      key={idx}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-2 text-xs hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <p className="text-muted-foreground truncate">{article.source} • {new Date(article.publishedAt).toLocaleDateString()}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        
        <p className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">{sourcePreview}</p>
      </CardContent>
    </Card>
  );
};
