import {
  BadgeCheck,
  BarChart3,
  Bot,
  Brain,
  Chrome,
  CircleCheckBig,
  Download,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  ScanText,
  ShieldAlert,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { exportFakeNewsDeckPpt } from "@/lib/exportDeckPpt";

const modelScores = [
  { model: "LR", f1: 0.84 },
  { model: "SVM", f1: 0.87 },
  { model: "RF", f1: 0.89 },
  { model: "BERT", f1: 0.94 },
];

const bestModelRadar = [
  { metric: "Accuracy", value: 0.95 },
  { metric: "Precision", value: 0.93 },
  { metric: "Recall", value: 0.94 },
  { metric: "F1", value: 0.94 },
  { metric: "AUC", value: 0.96 },
];

const Index = () => {
  return (
    <main className="deck-bg min-h-screen py-8 md:py-12">
      <div className="container space-y-6 md:space-y-8">
        <section className="hero-panel relative overflow-hidden rounded-3xl p-6 text-primary-foreground md:p-10">
          <div className="signature-orb" aria-hidden="true" />
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-4 py-1.5 text-sm font-semibold">
                <Newspaper className="h-4 w-4" /> Fake News Detection Using AI
              </p>
              <Button variant="secondary" onClick={exportFakeNewsDeckPpt} className="shrink-0">
                <Download className="h-4 w-4" /> Export PPT
              </Button>
            </div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-5xl">
              Professional AI/Media Deck Theme with Icon System and Metrics Visuals
            </h1>
            <div className="flex flex-wrap gap-3">
              <span className="meta-chip bg-primary-foreground/12 text-primary-foreground">TRACK • AI / NLP / Social Impact</span>
              <span className="meta-chip bg-primary-foreground/12 text-primary-foreground">TEAM LEADER • [Your Name]</span>
              <span className="meta-chip bg-primary-foreground/12 text-primary-foreground">TEAM • [Your Team Name]</span>
            </div>
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">ABSTRACT</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="metric-card">
              <ShieldAlert className="mb-3 h-6 w-6 text-signal-fake" />
              <h3 className="mb-2 text-xl font-semibold">Problem</h3>
              <p className="text-muted-foreground">Misinformation spreads quickly on social media and erodes trust in public information.</p>
            </article>
            <article className="metric-card">
              <Brain className="mb-3 h-6 w-6 text-accent" />
              <h3 className="mb-2 text-xl font-semibold">Approach</h3>
              <p className="text-muted-foreground">NLP classification + source credibility analysis + explainable confidence scoring.</p>
            </article>
            <article className="metric-card">
              <Megaphone className="mb-3 h-6 w-6 text-signal-real" />
              <h3 className="mb-2 text-xl font-semibold">Impact</h3>
              <p className="text-muted-foreground">Helps users identify misleading content and promotes informed media consumption.</p>
            </article>
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">PROBLEM STATEMENT</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Fake news can trigger public panic and social polarization.",
              "Manual fact-checking cannot scale to viral content volume.",
              "Users need instant credibility checks before sharing content.",
              "Current tools often lack confidence scoring and explanations.",
            ].map((point) => (
              <article key={point} className="metric-card flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-signal-warn" />
                <p className="text-lg leading-relaxed text-foreground">{point}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">PROPOSED SOLUTION</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <article className="metric-card">
              <ScanText className="mb-3 h-6 w-6 text-accent" />
              <h3 className="mb-2 text-lg font-semibold">NLP Classification</h3>
              <p className="text-muted-foreground">Headline/body analysis to classify content as Real, Fake, or Misleading.</p>
            </article>
            <article className="metric-card">
              <ShieldCheck className="mb-3 h-6 w-6 text-signal-real" />
              <h3 className="mb-2 text-lg font-semibold">Source Credibility</h3>
              <p className="text-muted-foreground">Domain reliability and historical behavior contribute to trust score.</p>
            </article>
            <article className="metric-card">
              <BarChart3 className="mb-3 h-6 w-6 text-brand-soft" />
              <h3 className="mb-2 text-lg font-semibold">Detection Score</h3>
              <p className="text-muted-foreground">A confidence score (0–100) offers transparent decision support.</p>
            </article>
            <article className="metric-card">
              <Chrome className="mb-3 h-6 w-6 text-brand-highlight" />
              <h3 className="mb-2 text-lg font-semibold">Web Interface</h3>
              <p className="text-muted-foreground">Browser extension and web app experience for real-time verification.</p>
            </article>
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">PROOF OF CONCEPT</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="metric-card">
              <h3 className="mb-4 text-xl font-semibold">Model Comparison (F1 Score)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelScores}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <XAxis dataKey="model" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0.8, 1]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="f1" fill="hsl(var(--brand-highlight))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="metric-card">
              <h3 className="mb-4 text-xl font-semibold">Best Model Radar (BERT)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={bestModelRadar}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0.8, 1]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="hsl(var(--brand))"
                      fill="hsl(var(--brand-highlight))"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">MVP (MINIMUM VIABLE PRODUCT FEATURES)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className="metric-card">
              <LayoutDashboard className="mb-3 h-6 w-6 text-accent" />
              <p className="font-semibold">Text/URL Input</p>
            </article>
            <article className="metric-card">
              <Bot className="mb-3 h-6 w-6 text-brand-highlight" />
              <p className="font-semibold">Real/Fake/Misleading Prediction</p>
            </article>
            <article className="metric-card">
              <BadgeCheck className="mb-3 h-6 w-6 text-signal-real" />
              <p className="font-semibold">Source Trust Badge</p>
            </article>
            <article className="metric-card">
              <Workflow className="mb-3 h-6 w-6 text-brand-soft" />
              <p className="font-semibold">Explanation + Recent Checks</p>
            </article>
          </div>
        </section>

        <section className="glass-panel p-6 md:p-8">
          <h2 className="section-title">CONCLUSION</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="metric-card">
              <CircleCheckBig className="mb-3 h-6 w-6 text-signal-real" />
              <p className="text-lg font-semibold">Reduces misinformation spread with fast credibility signals.</p>
            </article>
            <article className="metric-card">
              <Users className="mb-3 h-6 w-6 text-brand-highlight" />
              <p className="text-lg font-semibold">Improves public trust in authentic media sources.</p>
            </article>
            <article className="metric-card">
              <Newspaper className="mb-3 h-6 w-6 text-brand-soft" />
              <p className="text-lg font-semibold">Builds a scalable framework for responsible digital journalism.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;


