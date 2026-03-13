import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, BarChart3, RefreshCw, Download } from "lucide-react";
import { generateTestPredictions, calculateModelMetrics, formatMetrics } from "@/lib/modelEvaluation";
import type { ModelMetrics } from "@/lib/modelEvaluation";

export function ModelPerformanceCard() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate test predictions and calculate metrics
    const predictions = generateTestPredictions(1000);
    const calculatedMetrics = calculateModelMetrics(predictions);
    
    setMetrics(calculatedMetrics);
    setLoading(false);
  };

  const downloadReport = () => {
    if (!metrics) return;
    
    const report = formatMetrics(metrics);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model-performance-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="text-brand-highlight animate-pulse" />
            Loading Model Performance...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-2 bg-muted rounded w-full"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-signal-real";
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.7) return "text-yellow-500";
    if (score >= 0.6) return "text-orange-500";
    return "text-signal-fake";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.9) return "Excellent";
    if (score >= 0.8) return "Good";
    if (score >= 0.7) return "Fair";
    if (score >= 0.6) return "Poor";
    return "Critical";
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="text-brand-highlight" />
              Model Performance
            </CardTitle>
            <CardDescription>
              Comprehensive evaluation metrics for fake news detection
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadMetrics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="confusion">Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">F1 Score</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getScoreColor(metrics.f1Score)}>
                      {getScoreBadge(metrics.f1Score)}
                    </Badge>
                    <span className={`font-bold ${getScoreColor(metrics.f1Score)}`}>
                      {(metrics.f1Score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={metrics.f1Score * 100} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Accuracy</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getScoreColor(metrics.accuracy)}>
                      {getScoreBadge(metrics.accuracy)}
                    </Badge>
                    <span className={`font-bold ${getScoreColor(metrics.accuracy)}`}>
                      {(metrics.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={metrics.accuracy * 100} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Precision</span>
                  <span className={`font-bold ${getScoreColor(metrics.precision)}`}>
                    {(metrics.precision * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.precision * 100} className="h-2" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recall</span>
                  <span className={`font-bold ${getScoreColor(metrics.recall)}`}>
                    {(metrics.recall * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.recall * 100} className="h-2" />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-lg font-bold text-orange-500">
                  {metrics.auc.toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">AUC-ROC Score</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Area under ROC curve
                </div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-lg font-bold text-green-500">
                  {(metrics.specificity * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Specificity</div>
                <div className="text-xs text-muted-foreground mt-1">
                  True negative rate
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4">
            {/* Per-Class Metrics */}
            <div className="space-y-4">
              <h4 className="font-semibold">Per-Class Performance</h4>
              {Object.entries(metrics.classMetrics).map(([className, classMetrics]) => (
                <div key={className} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium capitalize">{className}</h5>
                    <Badge variant="outline">
                      {classMetrics.support} samples
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Precision</span>
                      <span className="font-medium">
                        {(classMetrics.precision * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={classMetrics.precision * 100} className="h-1" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Recall</span>
                      <span className="font-medium">
                        {(classMetrics.recall * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={classMetrics.recall * 100} className="h-1" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">F1 Score</span>
                      <span className={`font-medium ${getScoreColor(classMetrics.f1Score)}`}>
                        {(classMetrics.f1Score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={classMetrics.f1Score * 100} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="confusion" className="space-y-4">
            {/* Confusion Matrix */}
            <div className="space-y-4">
              <h4 className="font-semibold">Confusion Matrix</h4>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="text-center p-4 rounded-lg border border-signal-real/30 bg-signal-real/10">
                  <div className="text-xl font-bold text-signal-real">
                    {metrics.confusionMatrix.truePositive}
                  </div>
                  <div className="text-xs text-muted-foreground">True Positive</div>
                </div>
                <div className="text-center p-4 rounded-lg border border-signal-fake/30 bg-signal-fake/10">
                  <div className="text-xl font-bold text-signal-fake">
                    {metrics.confusionMatrix.falsePositive}
                  </div>
                  <div className="text-xs text-muted-foreground">False Positive</div>
                </div>
                <div className="text-center p-4 rounded-lg border border-signal-fake/30 bg-signal-fake/10">
                  <div className="text-xl font-bold text-signal-fake">
                    {metrics.confusionMatrix.falseNegative}
                  </div>
                  <div className="text-xs text-muted-foreground">False Negative</div>
                </div>
                <div className="text-center p-4 rounded-lg border border-signal-real/30 bg-signal-real/10">
                  <div className="text-xl font-bold text-signal-real">
                    {metrics.confusionMatrix.trueNegative}
                  </div>
                  <div className="text-xs text-muted-foreground">True Negative</div>
                </div>
              </div>

              {/* Matrix Interpretation */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>True Positive:</strong> Correctly identified fake news</p>
                <p><strong>False Positive:</strong> Real news incorrectly flagged as fake</p>
                <p><strong>True Negative:</strong> Correctly identified real news</p>
                <p><strong>False Negative:</strong> Fake news that was missed</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}