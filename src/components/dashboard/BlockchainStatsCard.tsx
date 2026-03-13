import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link2, Shield, TrendingUp, Database } from "lucide-react";
import { getBlockchain } from "@/lib/analysisBlockchain";

export function BlockchainStatsCard() {
  const [stats, setStats] = useState<{
    totalBlocks: number;
    totalAnalyses: number;
    predictions: Record<string, number>;
    avgConfidence: string;
    chainValid: boolean;
    latestBlock: number;
  } | null>(null);

  useEffect(() => {
    const blockchain = getBlockchain();
    setStats(blockchain.getStats());
  }, []);

  if (!stats) return null;

  const predictionEntries = Object.entries(stats.predictions);
  const maxPredictions = Math.max(...Object.values(stats.predictions));

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="text-purple-500" />
          Blockchain Statistics
        </CardTitle>
        <CardDescription>
          Immutable analysis chain verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Blocks</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalBlocks}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Analyses</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Latest Block</span>
            </div>
            <div className="text-2xl font-bold">#{stats.latestBlock}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg Confidence</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Chain Integrity</span>
            <Badge className={stats.chainValid ? "bg-green-500" : "bg-red-500"}>
              {stats.chainValid ? "✓ Valid" : "✗ Invalid"}
            </Badge>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Prediction Distribution</span>
            {predictionEntries.map(([prediction, count]) => (
              <div key={prediction} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{prediction}</span>
                  <span className="text-muted-foreground">
                    {count} ({((count / stats.totalAnalyses) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(count / maxPredictions) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Each analysis is cryptographically secured in an immutable blockchain structure.
            Verification codes can be used to retrieve and verify past analyses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
