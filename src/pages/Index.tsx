import { ArrowRight, Download, ShieldCheck, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { exportFakeNewsDeckPpt } from "@/lib/exportDeckPpt";

const Index = () => {
  return (
    <main className="deck-bg min-h-screen py-10">
      <div className="container space-y-6">
        <section className="hero-panel relative overflow-hidden rounded-3xl p-8 text-primary-foreground md:p-10">
          <div className="signature-orb" aria-hidden="true" />
          <div className="relative z-10 space-y-6">
            <p className="meta-chip max-w-max bg-primary-foreground/12 text-primary-foreground">AI / NLP / Social Impact</p>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-5xl">Enhanced URL Analysis — AI-Powered News Verification</h1>
            <p className="max-w-2xl text-lg text-primary-foreground/85">
              Advanced URL content extraction with AI analysis, news cross-referencing, and source credibility assessment for comprehensive fact-checking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link to="/auth">
                  Open project workspace <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" onClick={exportFakeNewsDeckPpt} className="border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20">
                <Download /> Export PPT
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="metric-card">
            <ShieldCheck className="mb-3 h-6 w-6 text-signal-real" />
            <h2 className="mb-2 text-2xl font-semibold">Enhanced URL Analysis</h2>
            <p className="text-muted-foreground">
              Advanced content extraction from URLs with multiple fallback strategies, AI-powered analysis, and comprehensive source credibility assessment.
            </p>
          </article>
          <article className="metric-card">
            <Workflow className="mb-3 h-6 w-6 text-brand-highlight" />
            <h2 className="mb-2 text-2xl font-semibold">Multi-Component Analysis</h2>
            <p className="text-muted-foreground">
              Combines AI analysis (40%), news verification (35%), and source credibility (25%) for comprehensive fact-checking with risk assessment.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
};

export default Index;
