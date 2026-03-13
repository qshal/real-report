import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, Target, Zap, RefreshCw } from "lucide-react";
import { generateTrainingHistory, generateTestPredictions, calculateModelMetrics, formatMetrics } from "@/lib/modelEvaluation";
import type { TrainingMetrics, ModelMetrics } from "@/lib/modelEvaluation";

export function TrainingGraphs() {
  const [trainingHistory, setTrainingHistory] = useState<TrainingMetrics[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    setLoading(true);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate synthetic training data
    const history = generateTrainingHistory(50);
    const predictions = generateTestPredictions(1000);
    const metrics = calculateModelMetrics(predictions);
    
    setTrainingHistory(history);
    setModelMetrics(metrics);
    setLoading(false);
  };

  const refreshData = () => {
    loadTrainingData();
  };

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-brand-highlight animate-pulse" />
            Loading Model Metrics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-highlight"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestMetrics = trainingHistory[trainingHistory.length - 1];

  return (
    <div className="space-y-6">
      {/* Model Performance Overview */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-brand-highlight" />
                Model Performance Metrics
              </CardTitle>
              <CardDescription>
                Comprehensive evaluation of the fake news detection model
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modelMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-2xl font-bold text-signal-real">
                  {(modelMetrics.f1Score * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">F1 Score</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-2xl font-bold text-brand-highlight">
                  {(modelMetrics.accuracy * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-2xl font-bold text-blue-500">
                  {(modelMetrics.precision * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Precision</div>
              </div>
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/20">
                <div className="text-2xl font-bold text-purple-500">
                  {(modelMetrics.recall * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Recall</div>
              </div>
            </div>
          )}

          <Tabs defaultValue="training" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="training">Training History</TabsTrigger>
              <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
              <TabsTrigger value="confusion">Confusion Matrix</TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="space-y-4">
              {/* Loss Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training & Validation Loss</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="trainLoss" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Training Loss"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="valLoss" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Validation Loss"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Accuracy Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training & Validation Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis domain={[0.4, 1]} />
                      <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="trainAccuracy" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Training Accuracy"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="valAccuracy" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Validation Accuracy"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* F1 Score Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">F1 Score Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis domain={[0.4, 1]} />
                      <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="trainF1" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Training F1"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="valF1" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        name="Validation F1"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              {modelMetrics && (
                <>
                  {/* Per-Class Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Per-Class Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(modelMetrics.classMetrics).map(([className, metrics]) => (
                          <div key={className} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-lg capitalize">{className}</h4>
                              <Badge variant="outline">Support: {metrics.support}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-500">
                                  {(metrics.precision * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">Precision</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-purple-500">
                                  {(metrics.recall * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">Recall</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-signal-real">
                                  {(metrics.f1Score * 100).toFixed(1)}%
                                </div>
                                <div className="text-sm text-muted-foreground">F1 Score</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                          <div className="text-xl font-bold text-green-500">
                            {(modelMetrics.specificity * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Specificity</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            True negative rate
                          </div>
                        </div>
                        <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                          <div className="text-xl font-bold text-orange-500">
                            {modelMetrics.auc.toFixed(3)}
                          </div>
                          <div className="text-sm text-muted-foreground">AUC-ROC</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Area under curve
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="confusion" className="space-y-4">
              {modelMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Confusion Matrix</CardTitle>
                    <CardDescription>
                      Detailed breakdown of prediction accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                      <div className="text-center p-6 rounded-lg border border-signal-real/30 bg-signal-real/10">
                        <div className="text-2xl font-bold text-signal-real">
                          {modelMetrics.confusionMatrix.truePositive}
                        </div>
                        <div className="text-sm text-muted-foreground">True Positive</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Correctly identified fake
                        </div>
                      </div>
                      <div className="text-center p-6 rounded-lg border border-signal-fake/30 bg-signal-fake/10">
                        <div className="text-2xl font-bold text-signal-fake">
                          {modelMetrics.confusionMatrix.falsePositive}
                        </div>
                        <div className="text-sm text-muted-foreground">False Positive</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Incorrectly flagged as fake
                        </div>
                      </div>
                      <div className="text-center p-6 rounded-lg border border-signal-fake/30 bg-signal-fake/10">
                        <div className="text-2xl font-bold text-signal-fake">
                          {modelMetrics.confusionMatrix.falseNegative}
                        </div>
                        <div className="text-sm text-muted-foreground">False Negative</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Missed fake news
                        </div>
                      </div>
                      <div className="text-center p-6 rounded-lg border border-signal-real/30 bg-signal-real/10">
                        <div className="text-2xl font-bold text-signal-real">
                          {modelMetrics.confusionMatrix.trueNegative}
                        </div>
                        <div className="text-sm text-muted-foreground">True Negative</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Correctly identified real
                        </div>
                      </div>
                    </div>

                    {/* Confusion Matrix Visualization */}
                    <div className="mt-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { name: 'True Positive', value: modelMetrics.confusionMatrix.truePositive, fill: '#10b981' },
                            { name: 'False Positive', value: modelMetrics.confusionMatrix.falsePositive, fill: '#ef4444' },
                            { name: 'True Negative', value: modelMetrics.confusionMatrix.trueNegative, fill: '#10b981' },
                            { name: 'False Negative', value: modelMetrics.confusionMatrix.falseNegative, fill: '#ef4444' },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Training Summary */}
      {latestMetrics && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-brand-highlight" />
              Training Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{latestMetrics.epoch}</div>
                <div className="text-sm text-muted-foreground">Epochs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{latestMetrics.trainLoss.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">Final Train Loss</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{latestMetrics.valLoss.toFixed(4)}</div>
                <div className="text-sm text-muted-foreground">Final Val Loss</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{latestMetrics.learningRate.toExponential(2)}</div>
                <div className="text-sm text-muted-foreground">Learning Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}