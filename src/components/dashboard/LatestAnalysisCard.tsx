import { useState } from "react";
import { BarChart3, FileCheck2, ShieldAlert, Newspaper, ExternalLink, Brain, Globe, Info, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { summarizeAnalysisMetadata } from "@/lib/analysisMetadata";
import { storeVerificationViaApi } from "@/lib/blockchainApi";

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
  reasoning?: string;
}

interface ComponentScores {
  aiScore: number;
  newsScore: number;
  sourceScore: number;
  weights?: {
    ai: string;
    news: string;
    source: string;
  };
  note?: string;
}

export const LatestAnalysisCard = ({ item }: { item?: Row }) => {
  const [storing, setStoring] = useState(false);
  const [stored, setStored] = useState(false);

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
  const componentScores = metadata?.componentScores as ComponentScores | undefined;
  
  // Show articles if we have any results
  const hasNewsResults = (supportingArticles && supportingArticles.length > 0) || 
                         (contradictingArticles && contradictingArticles.length > 0) ||
                         (newsVerification && newsVerification.trustedSourcesFound > 0);

  // Handle blockchain storage
  const handleStoreOnBlockchain = async () => {
    const content = item.input_text || item.source_url || "";
    if (!content) {
      toast.error("No content to store on blockchain");
      return;
    }

    setStoring(true);
    try {
      const result = await storeVerificationViaApi(
        content,
        item.predicted_label,
        item.confidence,
        item.confidence, // Use confidence as trust score
        item.source_url || undefined,
        "dashboard_manual_store"
      );

      if (result.success && result.tx_hash) {
        toast.success("Verification stored on TruthChain!");
        toast.info(`Transaction: ${result.tx_hash.slice(0, 20)}...`);
        setStored(true);
      } else if (result.duplicate) {
        toast.info("Article was already verified on blockchain");
        setStored(true);
      } else {
        toast.error(result.error || "Failed to store on blockchain");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Blockchain storage failed");
    } finally {
      setStoring(false);
    }
  };

  return (
    <TooltipProvider>
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

          {/* Blockchain Storage Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleStoreOnBlockchain}
              disabled={storing || stored}
            >
              <Database className="h-4 w-4 mr-2" />
              {storing ? "Storing..." : stored ? "Stored on Blockchain ✓" : "Store on Blockchain"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Store verification hash on TruthChain for immutable proof
            </p>
          </div>

          {/* Component Scores Breakdown - For Reference Only */}
          {componentScores && typeof componentScores.aiScore === 'number' && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Supplementary Data
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shown for reference only. Verdict is based on AI analysis only.</p>
                    </TooltipContent>
                  </Tooltip>
                </h4>
                <p className="text-xs text-muted-foreground italic">
                  Verdict: AI only • Below data for context only
                </p>
                
                <div className="space-y-2 text-xs">
                  {/* AI Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-3 w-3 text-blue-500" />
                      <span>AI Analysis</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pollinations AI confidence score</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${componentScores.aiScore}%` }} />
                      </div>
                      <span className="font-semibold w-8 text-right">{componentScores.aiScore}%</span>
                      {componentScores.weights?.ai && (
                        <span className="text-muted-foreground w-6">{componentScores.weights.ai}</span>
                      )}
                    </div>
                  </div>

                  {/* News Score */}
                  {typeof componentScores.newsScore === 'number' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-3 w-3 text-green-500" />
                        <span>News Verification</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>NewsAPI verification score</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${componentScores.newsScore}%` }} />
                        </div>
                        <span className="font-semibold w-8 text-right">{componentScores.newsScore}%</span>
                        {componentScores.weights?.news && (
                          <span className="text-muted-foreground w-6">{componentScores.weights.news}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source Score */}
                  {typeof componentScores.sourceScore === 'number' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-purple-500" />
                        <span>Source Credibility</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Domain reputation score (Tier 1-6)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500" style={{ width: `${componentScores.sourceScore}%` }} />
                        </div>
                        <span className="font-semibold w-8 text-right">{componentScores.sourceScore}%</span>
                        {componentScores.weights?.source && (
                          <span className="text-muted-foreground w-6">{componentScores.weights.source}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        
        {/* Common Articles Based on Content */}
        {supportingArticles && supportingArticles.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4" /> Common Articles
              </h4>
              <div className="space-y-1">
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
            </div>
          </>
        )}
        
        {/* News Articles Section */}
        {hasNewsResults && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4" /> Related News Articles
              </h4>
              
              {/* Show reasoning if no articles found */}
              {(!supportingArticles || supportingArticles.length === 0) && 
               (!contradictingArticles || contradictingArticles.length === 0) &&
               newsVerification?.reasoning && (
                <p className="text-xs text-muted-foreground italic">
                  {newsVerification.reasoning}
                </p>
              )}
              
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
    </TooltipProvider>
  );
};
