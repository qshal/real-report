import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Zap, TrendingUp } from "lucide-react";
import { 
  generateNLPModelComparison, 
  calculateEfficiencyScore,
  getModelRecommendation 
} from "@/lib/nlpModelComparison";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function NLPModelComparison() {
  const comparison = generateNLPModelComparison();
  const accuracyRec = getModelRecommendation('accuracy');
  const speedRec = getModelRecommendation('speed');
  const efficiencyRec = getModelRecommendation('efficiency');

  // Prepare data for charts
  const performanceData = comparison.models.map(model => ({
    name: model.modelName,
    F1: (model.f1Score * 100).toFixed(1),
    Accuracy: (model.accuracy * 100).toFixed(1),
    Precision: (model.precision * 100).toFixed(1),
    Recall: (model.recall * 100).toFixed(1),
  }));

  const resourceData = comparison.models.map(model => ({
    name: model.modelName,
    "Inference (ms)": model.inferenceTime,
    "Memory (MB)": model.memoryUsage / 10, // Scale down for visibility
    "Training (hrs)": model.trainingTime,
  }));

  const radarData = comparison.models.slice(0, 3).map(model => ({
    model: model.modelName,
    Performance: model.f1Score * 100,
    Speed: 100 - model.inferenceTime,
    Efficiency: calculateEfficiencyScore(model) * 100,
    Memory: 100 - (model.memoryUsage / 20),
  }));

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="text-purple-500" />
          NLP Model Comparison: BERT vs RoBERTa vs Others
        </CardTitle>
        <CardDescription>
          Comprehensive comparison of transformer models for fake news detection
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Best Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{accuracyRec.recommended}</div>
                  <p className="text-xs text-muted-foreground mt-1">{accuracyRec.reason}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Fastest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{speedRec.recommended}</div>
                  <p className="text-xs text-muted-foreground mt-1">{speedRec.reason}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Most Efficient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{efficiencyRec.recommended}</div>
                  <p className="text-xs text-muted-foreground mt-1">{efficiencyRec.reason}</p>
                </CardContent>
              </Card>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="F1" fill="#8b5cf6" />
                  <Bar dataKey="Accuracy" fill="#3b82f6" />
                  <Bar dataKey="Precision" fill="#10b981" />
                  <Bar dataKey="Recall" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2">
              {comparison.models.map((model) => (
                <div key={model.modelName} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <div className="font-semibold">{model.modelName}</div>
                    <div className="text-xs text-muted-foreground">{model.architecture} • {model.parameters} params</div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">F1: {(model.f1Score * 100).toFixed(1)}%</Badge>
                    <Badge variant="outline">Acc: {(model.accuracy * 100).toFixed(1)}%</Badge>
                    {model.modelName === comparison.bestModel && (
                      <Badge className="bg-green-500">Best</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparison.trainingHistory}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'F1 Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="bert.f1" 
                    stroke="#3b82f6" 
                    name="BERT" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="roberta.f1" 
                    stroke="#8b5cf6" 
                    name="RoBERTa" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="distilbert.f1" 
                    stroke="#10b981" 
                    name="DistilBERT" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Training Convergence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RoBERTa converges fastest</span>
                      <Badge variant="outline">~20 epochs</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BERT stable convergence</span>
                      <Badge variant="outline">~25 epochs</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DistilBERT quick but lower</span>
                      <Badge variant="outline">~18 epochs</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Final Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RoBERTa F1</span>
                      <Badge className="bg-purple-500">91.2%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BERT F1</span>
                      <Badge className="bg-blue-500">89.1%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DistilBERT F1</span>
                      <Badge className="bg-green-500">86.3%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Inference (ms)" fill="#ef4444" />
                  <Bar dataKey="Memory (MB)" fill="#f59e0b" />
                  <Bar dataKey="Training (hrs)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-2">
              {comparison.models.map((model) => (
                <div key={model.modelName} className="p-3 rounded-lg border bg-card/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{model.modelName}</span>
                    <Badge variant="outline">
                      Efficiency: {(calculateEfficiencyScore(model) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Inference</div>
                      <div className="font-semibold">{model.inferenceTime}ms</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Memory</div>
                      <div className="font-semibold">{model.memoryUsage}MB</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Training</div>
                      <div className="font-semibold">{model.trainingTime}h</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={comparison.featureImportance} 
                  layout="vertical"
                  margin={{ left: 150 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 0.3]} />
                  <YAxis type="category" dataKey="feature" width={140} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{payload[0].payload.feature}</p>
                            <p className="text-sm text-muted-foreground">{payload[0].payload.description}</p>
                            <p className="text-sm font-semibold mt-1">
                              Importance: {(payload[0].value as number * 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="importance" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key NLP Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.featureImportance.map((feature) => (
                    <div key={feature.feature} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {(feature.importance * 100).toFixed(0)}%
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{feature.feature}</div>
                        <div className="text-xs text-muted-foreground">{feature.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
