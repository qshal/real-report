import { AlertTriangle, Gauge, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  predicted_label: string;
  confidence: number;
};

const ratio = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

export const AnalysisOverviewCards = ({ history }: { history: Row[] }) => {
  const total = history.length;
  const fakeCount = history.filter((row) => row.predicted_label === "fake").length;
  const misleadingCount = history.filter((row) => row.predicted_label === "misleading").length;
  const realCount = history.filter((row) => row.predicted_label === "real").length;
  const avgConfidence = total > 0 ? Math.round(history.reduce((sum, row) => sum + row.confidence, 0) / total) : 0;

  const highConfidence = history.filter((row) => row.confidence >= 80).length;
  const mediumConfidence = history.filter((row) => row.confidence >= 60 && row.confidence < 80).length;
  const lowConfidence = history.filter((row) => row.confidence < 60).length;

  return (
    <section className="grid gap-4 lg:grid-cols-5">
      <Card className="glass-panel lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>Total analyzed</CardDescription>
          <CardTitle>{total}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="glass-panel lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>High-risk detections</CardDescription>
          <CardTitle>{fakeCount}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="glass-panel lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>Average confidence</CardDescription>
          <CardTitle>{avgConfidence}%</CardTitle>
        </CardHeader>
      </Card>

      <Card className="glass-panel lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk distribution</CardTitle>
          <CardDescription>How your analyzed articles are classified.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-signal-fake"><ShieldAlert className="h-4 w-4" /> Fake</span><span>{fakeCount} ({ratio(fakeCount, total)}%)</span></p>
          <p className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-signal-warn"><AlertTriangle className="h-4 w-4" /> Misleading</span><span>{misleadingCount} ({ratio(misleadingCount, total)}%)</span></p>
          <p className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-signal-real"><Gauge className="h-4 w-4" /> Real</span><span>{realCount} ({ratio(realCount, total)}%)</span></p>
          <div className="pt-2 text-xs text-muted-foreground">Confidence bands: High {highConfidence}, Medium {mediumConfidence}, Low {lowConfidence}</div>
        </CardContent>
      </Card>
    </section>
  );
};
