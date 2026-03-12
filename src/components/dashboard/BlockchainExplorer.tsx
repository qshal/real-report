import { useEffect, useState } from "react";
import { ExternalLink, Search, Shield, TrendingUp, Database, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { getBlockchainStatsViaApi, verifyArticleViaApi } from "@/lib/blockchainApi";
import { getTransactionUrl, getContractUrl } from "@/lib/blockchain";
import type { BlockchainStats } from "@/lib/blockchainApi";

interface BlockchainExplorerProps {
  transactionHash?: string;
  network?: string;
  verified?: boolean;
}

export function BlockchainExplorer({ 
  transactionHash, 
  network = "TruthChain", 
  verified = false 
}: BlockchainExplorerProps) {
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [searchContent, setSearchContent] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const blockchainStats = await getBlockchainStatsViaApi();
        setStats(blockchainStats);
      } catch (error) {
        console.error('Failed to load blockchain stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!searchContent.trim()) return;
    
    setSearching(true);
    try {
      const result = await verifyArticleViaApi(searchContent);
      setSearchResult(result);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResult({ verified: false, error: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="text-brand-highlight" />
          TruthChain Explorer
        </CardTitle>
        <CardDescription>
          Explore blockchain-verified news analysis records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Transaction Info */}
        {transactionHash && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Current Verification
            </h4>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge className={verified ? "border-signal-real/30 bg-signal-real/10 text-signal-real" : "border-muted bg-muted/50 text-muted-foreground"}>
                  {verified ? "Verified" : "Pending"}
                </Badge>
                <span className="text-xs text-muted-foreground">{network}</span>
              </div>
              <div className="text-xs font-mono break-all bg-muted/50 p-2 rounded">
                {transactionHash}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-auto p-1"
                onClick={() => window.open(getTransactionUrl(transactionHash), '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View on Explorer
              </Button>
            </div>
          </div>
        )}

        {/* Blockchain Statistics */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Network Statistics
          </h4>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading statistics...</div>
          ) : stats?.storage_enabled ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="text-lg font-semibold">{stats.total_verifications || 0}</div>
                <div className="text-xs text-muted-foreground">Total Verifications</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="text-lg font-semibold">{stats.accuracy_percent || 0}%</div>
                <div className="text-xs text-muted-foreground">Network Accuracy</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-signal-real/10 p-3">
                <div className="text-lg font-semibold text-signal-real">{stats.real_news_count || 0}</div>
                <div className="text-xs text-muted-foreground">Real News</div>
              </div>
              <div className="rounded-lg border border-border/50 bg-signal-fake/10 p-3">
                <div className="text-lg font-semibold text-signal-fake">{stats.fake_news_count || 0}</div>
                <div className="text-xs text-muted-foreground">Fake News</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Blockchain storage not available
            </div>
          )}
        </div>

        <Separator />

        {/* Article Search */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Verify Article
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Paste article text to check if it was previously verified..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={searching || !searchContent.trim()}
              size="sm"
            >
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {searchResult && (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              {searchResult.verified && searchResult.details ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="border-signal-real/30 bg-signal-real/10 text-signal-real">
                      Previously Verified
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(searchResult.details.verification_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <strong>Result:</strong> {searchResult.details.is_real ? "REAL" : "FAKE"}
                  </div>
                  <div className="text-sm">
                    <strong>Trust Score:</strong> {searchResult.details.trust_score}%
                  </div>
                  <div className="text-sm">
                    <strong>Confidence:</strong> {searchResult.details.confidence}%
                  </div>
                  <div className="text-sm">
                    <strong>Source:</strong> {searchResult.details.source}
                  </div>
                  <div className="text-sm">
                    <strong>Method:</strong> {searchResult.details.verification_method}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Not Found</Badge>
                  <span className="text-sm text-muted-foreground">
                    This article has not been verified on the blockchain
                  </span>
                </div>
              )}
              
              {searchResult.error && (
                <div className="text-sm text-signal-fake">
                  Error: {searchResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contract Info */}
        {stats?.contract_address && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Contract Information</h4>
            <div className="text-xs font-mono break-all bg-muted/50 p-2 rounded">
              {stats.contract_address}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={() => window.open(getContractUrl(), '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Contract
              </Button>
              {stats.explorer_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => window.open(stats.explorer_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Network Explorer
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <strong>Privacy Protection:</strong> TruthChain only stores SHA-256 hashes of articles, 
          not the full content. This ensures verification integrity while protecting user privacy.
        </div>
      </CardContent>
    </Card>
  );
}