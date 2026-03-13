import { useEffect, useState } from "react";
import { Link2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlockchainStatus, getBlockchainStats, type BlockchainStoreResult } from "@/lib/blockchain";
import { toast } from "sonner";

export const BlockchainStatusCard = () => {
  const [status, setStatus] = useState(getBlockchainStatus());
  const [stats, setStats] = useState<{
    total: number;
    realCount: number;
    fakeCount: number;
    accuracy: number;
    network: string;
    explorer: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const blockchainStats = await getBlockchainStats();
        setStats(blockchainStats);
      } catch (error) {
        console.error("Failed to load blockchain stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-brand-highlight" /> Blockchain Status
        </CardTitle>
        <CardDescription>TruthChain verification network status and statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.connected ? (
              <CheckCircle2 className="h-5 w-5 text-signal-real" />
            ) : (
              <XCircle className="h-5 w-5 text-signal-fake" />
            )}
            <span className="text-sm font-medium">
              {status.connected ? "Connected" : "Not Connected"}
            </span>
          </div>
          <Badge variant={status.contractDeployed ? "default" : "outline"}>
            {status.network}
          </Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total Verifications</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Accuracy</p>
              <p className="text-lg font-semibold">{stats.accuracy.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Real Articles</p>
              <p className="text-lg font-semibold text-signal-real">{stats.realCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fake Articles</p>
              <p className="text-lg font-semibold text-signal-fake">{stats.fakeCount}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load blockchain statistics</p>
        )}

        {status.contractDeployed && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const contractUrl = `${status.explorer}/address/${import.meta.env.VITE_CONTRACT_ADDRESS || ""}`;
              if (contractUrl) {
                window.open(contractUrl, "_blank");
              } else {
                toast.error("Contract address not configured");
              }
            }}
          >
            View Contract on Explorer
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

