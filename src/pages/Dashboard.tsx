import { type FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { BarChart3, Clock3, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AnalysisOverviewCards } from "@/components/dashboard/AnalysisOverviewCards";
import { BlockchainStatusCard } from "@/components/dashboard/BlockchainStatusCard";
import { BlockchainVerificationBadge } from "@/components/dashboard/BlockchainVerificationBadge";
import { DatasetManagerCard } from "@/components/dashboard/DatasetManagerCard";
import { DatasetUploaderCard } from "@/components/dashboard/DatasetUploaderCard";
import { LatestAnalysisCard } from "@/components/dashboard/LatestAnalysisCard";
import { ModelComparisonCard } from "@/components/dashboard/ModelComparisonCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { summarizeAnalysisMetadata } from "@/lib/analysisMetadata";
import { analyzeNewsHybrid } from "@/lib/analyzeNewsHybrid";
import { analysisSchema, type PredictionLabel } from "@/lib/fakeNewsAnalyzer";
import { createNewsCheck, listUserNewsChecks, updateNewsCheckVerification, updateProfile } from "@/lib/newsChecks";
import { storeNewsVerification, getTransactionUrl } from "@/lib/blockchain";

const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(60),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be 3-20 chars: letters, numbers, underscore."),
});

type NewsCheck = Tables<"news_checks"> & {
  baseline_predicted_label?: PredictionLabel | null;
  baseline_confidence?: number | null;
  baseline_explanation?: string | null;
  verified_label?: PredictionLabel | null;
  verified_at?: string | null;
};

const labelStyles: Record<string, string> = {
  real: "border-signal-real/30 bg-signal-real/10 text-signal-real",
  fake: "border-signal-fake/30 bg-signal-fake/10 text-signal-fake",
  misleading: "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
};

const verificationOptions: PredictionLabel[] = ["real", "misleading", "fake"];

const Dashboard = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [inputType, setInputType] = useState<"text" | "url">("text");
  const [textValue, setTextValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [history, setHistory] = useState<NewsCheck[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setUsername(profile?.username ?? "");
  }, [profile?.display_name, profile?.username]);

  useEffect(() => {
    if (!user) return;
    void listUserNewsChecks(user.id)
      .then((rows) => setHistory(rows as NewsCheck[]))
      .catch(() => toast.error("Failed to load analysis history."));
  }, [user]);

  const latestResult = history[0];

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    // Normalize URL: add https:// if protocol is missing
    let normalizedUrl = urlValue.trim();
    if (inputType === "url" && normalizedUrl && !normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const payload =
      inputType === "text"
        ? { inputType, text: textValue }
        : {
            inputType,
            url: normalizedUrl,
          };

    const parsed = analysisSchema.safeParse(payload);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid analysis input.");
      return;
    }

    const parsedPayload = parsed.data as { inputType: "text"; text: string } | { inputType: "url"; url: string };

    setSubmitting(true);

    try {
      const hybridPrediction = await analyzeNewsHybrid(parsedPayload);

      // Prepare content for blockchain storage
      const contentForBlockchain = parsedPayload.inputType === "text" 
        ? parsedPayload.text 
        : `${parsedPayload.url}\n${(hybridPrediction.metadata as any)?.urlContent?.title || ""}\n${(hybridPrediction.metadata as any)?.urlContent?.content || ""}`;

      // Calculate trust score from confidence and metadata
      const trustScore = hybridPrediction.confidence / 100;
      const sourceUrl = parsedPayload.inputType === "url" ? parsedPayload.url : undefined;

      // Store on blockchain (non-blocking - don't wait for it)
      let blockchainResult = null;
      try {
        blockchainResult = await storeNewsVerification(
          contentForBlockchain,
          hybridPrediction.label,
          trustScore,
          hybridPrediction.confidence / 100,
          sourceUrl,
          "hybrid_ai_analysis"
        );

        if (blockchainResult.success && blockchainResult.txHash) {
          toast.success(`Analysis stored on blockchain! Transaction: ${blockchainResult.txHash.slice(0, 10)}...`);
        } else if (blockchainResult.duplicate) {
          toast.info("This analysis already exists on blockchain.");
        } else if (blockchainResult.error) {
          console.warn("Blockchain storage failed:", blockchainResult.error);
          // Don't show error toast - blockchain is optional
        }
      } catch (blockchainError) {
        console.warn("Blockchain storage error:", blockchainError);
        // Continue even if blockchain storage fails
      }

      // Add blockchain verification to metadata
      const metadataWithBlockchain = {
        ...hybridPrediction.metadata,
        blockchainVerification: blockchainResult ? {
          success: blockchainResult.success,
          txHash: blockchainResult.txHash,
          articleHash: blockchainResult.articleHash,
          duplicate: blockchainResult.duplicate,
          error: blockchainResult.error,
          transactionUrl: blockchainResult.txHash ? getTransactionUrl(blockchainResult.txHash) : null,
        } : null,
      };

      const saved = (await createNewsCheck({
        user_id: user.id,
        input_type: parsedPayload.inputType,
        input_text: parsedPayload.inputType === "text" ? parsedPayload.text : null,
        source_url: parsedPayload.inputType === "url" ? parsedPayload.url : null,
        predicted_label: hybridPrediction.label,
        confidence: hybridPrediction.confidence,
        explanation: hybridPrediction.explanation,
        model_name: hybridPrediction.modelName,
        baseline_predicted_label: null,
        baseline_confidence: null,
        baseline_explanation: null,
        analysis_metadata: metadataWithBlockchain as Json,
      })) as NewsCheck;

      setHistory((prev) => [saved, ...prev]);
      toast.success("Analysis completed and stored.");

      if (parsedPayload.inputType === "text") {
        setTextValue("");
      } else {
        setUrlValue("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis could not be saved.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const parsed = profileSchema.safeParse({ displayName, username });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid profile input.");
      return;
    }

    setSavingProfile(true);

    try {
      await updateProfile(user.id, {
        display_name: parsed.data.displayName,
        username: parsed.data.username,
      });
      await refreshProfile();
      toast.success("Profile updated.");
    } catch {
      toast.error("Profile update failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetVerifiedLabel = async (newsCheckId: string, label: PredictionLabel | null) => {
    if (!user) return;
    setVerifyingId(newsCheckId);

    try {
      const updated = (await updateNewsCheckVerification(newsCheckId, user.id, label)) as NewsCheck;
      setHistory((prev) => prev.map((item) => (item.id === newsCheckId ? updated : item)));
      toast.success(label ? "Ground-truth label saved." : "Ground-truth label cleared.");
    } catch {
      toast.error("Failed to update verified label.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <main className="deck-bg min-h-screen py-8">
      <div className="container space-y-6">
        <section className="hero-panel relative overflow-hidden rounded-3xl p-6 text-primary-foreground md:p-8">
          <div className="signature-orb" aria-hidden="true" />
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="meta-chip bg-primary-foreground/12 text-primary-foreground">Private workspace</p>
              <h1 className="max-w-3xl text-3xl font-bold md:text-4xl">AI fake-news analysis dashboard</h1>
              <p className="max-w-2xl text-primary-foreground/85">
                Analyze claims, inspect confidence and trust signals, then verify labels to improve model evaluation quality.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void signOut()}>
              <LogOut /> Logout
            </Button>
          </div>
        </section>

        <AnalysisOverviewCards history={history} />

        <ModelComparisonCard history={history.map(item => ({
          ...item,
          analysis_metadata: item.analysis_metadata as Record<string, unknown> | null
        }))} />

        {/* Blockchain Status Section */}
        <BlockchainStatusCard />

        {/* Dataset Management Section */}
        <section className="grid gap-4 lg:grid-cols-2">
          <DatasetManagerCard />
          <DatasetUploaderCard />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent" /> Submit for analysis
              </CardTitle>
              <CardDescription>
                Submit text or URL and store baseline plus hybrid outputs with confidence, explanation, and metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={inputType} onValueChange={(value) => setInputType(value as "text" | "url")}>
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>
                <form onSubmit={handleAnalyze} className="space-y-3">
                  <TabsContent value="text">
                    <Textarea
                      value={textValue}
                      onChange={(event) => setTextValue(event.target.value)}
                      placeholder="Paste a headline or article content here..."
                      className="min-h-40"
                    />
                  </TabsContent>
                  <TabsContent value="url">
                    <Input
                      type="url"
                      value={urlValue}
                      onChange={(event) => setUrlValue(event.target.value)}
                      placeholder="https://example.com/article"
                    />
                  </TabsContent>
                  <Button type="submit" disabled={submitting}>
                    <ShieldCheck /> {submitting ? "Analyzing..." : "Analyze and save"}
                  </Button>
                </form>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Profile settings</CardTitle>
                <CardDescription>Keep your analyst identity updated.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleProfileSave}>
                  <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" />
                  <Button type="submit" variant="outline" disabled={savingProfile}>
                    Save profile
                  </Button>
                </form>
              </CardContent>
            </Card>

            <LatestAnalysisCard item={latestResult} />
          </div>
        </section>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="text-brand-highlight" /> Analysis history
            </CardTitle>
            <CardDescription>Only your account can view these records.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                  No analyses yet — run your first check above.
                </p>
              ) : (
                history.map((item) => {
                  const meta = summarizeAnalysisMetadata(item.analysis_metadata);

                  return (
                    <article key={item.id} className="rounded-xl border border-border/80 bg-card/80 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={labelStyles[item.predicted_label] ?? ""}>HYBRID: {item.predicted_label.toUpperCase()}</Badge>
                          {item.baseline_predicted_label ? (
                            <Badge variant="outline" className={labelStyles[item.baseline_predicted_label] ?? ""}>
                              BASELINE: {item.baseline_predicted_label.toUpperCase()}
                            </Badge>
                          ) : null}
                          {meta.riskBand ? <Badge variant="outline">Risk: {meta.riskBand}</Badge> : null}
                          {/* Add blockchain verification badge */}
                          {(item.analysis_metadata as any)?.blockchainVerification && (
                            <BlockchainVerificationBadge 
                              analysis={{ 
                                blockchain: (item.analysis_metadata as any).blockchainVerification,
                                metadata: item.analysis_metadata 
                              } as any} 
                              compact 
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <BarChart3 className="h-4 w-4" /> Confidence
                        </span>
                        <span className="font-semibold">{Math.round(item.confidence)}%</span>
                        {meta.fakeProbability !== null ? <span>Fake probability: <span className="font-semibold">{meta.fakeProbability}%</span></span> : null}
                        {meta.trustScore !== null ? <span>Trust score: <span className="font-semibold">{meta.trustScore}%</span></span> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.explanation}</p>
                      <div className="mt-3 border-t border-border/70 pt-3">
                        <p className="mb-2 text-xs text-muted-foreground">Set verified label (ground truth) for precision/recall tracking:</p>
                        <div className="flex flex-wrap gap-2">
                          {verificationOptions.map((label) => {
                            const isActive = item.verified_label === label;
                            return (
                              <Button
                                key={`${item.id}-${label}`}
                                type="button"
                                size="sm"
                                variant={isActive ? "default" : "outline"}
                                disabled={verifyingId === item.id}
                                onClick={() => void handleSetVerifiedLabel(item.id, label)}
                              >
                                {label}
                              </Button>
                            );
                          })}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={verifyingId === item.id || !item.verified_label}
                            onClick={() => void handleSetVerifiedLabel(item.id, null)}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Dashboard;
