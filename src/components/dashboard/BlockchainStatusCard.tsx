import { useEffect, useState } from "react";
import { Shield, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBlockchainStatus } from "@/lib/blockchain";
import { getBlockchainApiStatus } from "@/lib/blockchainApi";
import type { BlockchainStatus } from "@/lib/blockchainApi";

export function BlockchainStatusCard() {
  const [frontendStatus, setFrontendStatus] = useState(getBlockchainStatus());
  const [backendStatus, setBackendStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      try {
        const backend = await getBlockchainApiStatus();
        setBackendStatus(backend);
        setFrontendStatus(getBlockchainStatus());
      } catch (error) {
        console.error('Failed to check blockchain status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isFullyConnected = frontendStatus.connected && backendStatus?.connected;
  const hasPartialConnection = frontendStatus.connected || backendStatus?.connected;

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="text-brand-highlight" />
          Blockchain Verification
        </CardTitle>
        <CardDescription>
          Immutable storage and verification of analysis results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 animate-pulse" />
            Checking blockchain status...
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {/* Overall Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Status</span>
                <Badge 
                  className={
                    isFullyConnected 
                      ? "border-signal-real/30 bg-signal-real/10 text-signal-real"
                      : hasPartialConnection
                      ? "border-signal-warn/30 bg-signal-warn/10 text-signal-warn"
                      : "border-signal-fake/30 bg-signal-fake/10 text-signal-fake"
                  }
                >
                  {isFullyConnected ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </>
                  ) : hasPartialConnection ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Partial
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Disconnected
                    </>
                  )}
                </Badge>
              </div>

              {/* Frontend Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Frontend (MetaMask)</span>
                <Badge variant={frontendStatus.connected ? "default" : "outline"}>
                  {frontendStatus.connected ? "Ready" : "Not configured"}
                </Badge>
              </div>

              {/* Backend Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Backend Service</span>
                <Badge variant={backendStatus?.connected ? "default" : "outline"}>
                  {backendStatus?.connected ? "Connected" : "Offline"}
                </Badge>
              </div>

              {/* Contract Address */}
              {(frontendStatus.contractDeployed || backendStatus?.contract_address) && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Contract Address</span>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {backendStatus?.contract_address || "Not configured"}
                  </div>
                </div>
              )}

              {/* Wallet Address */}
              {backendStatus?.wallet_address && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Service Wallet</span>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {backendStatus.wallet_address}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {!frontendStatus.connected && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://metamask.io/', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Install MetaMask
                </Button>
              )}
              
              {backendStatus?.contract_address && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const explorerUrl = backendStatus.rpc_url?.includes('polygon') 
                      ? `https://polygonscan.com/address/${backendStatus.contract_address}`
                      : `https://sepolia.etherscan.io/address/${backendStatus.contract_address}`;
                    window.open(explorerUrl, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Contract
                </Button>
              )}
            </div>

            {/* Status Messages */}
            <div className="text-xs text-muted-foreground">
              {isFullyConnected ? (
                "✅ All analysis results will be stored on blockchain for verification"
              ) : hasPartialConnection ? (
                "⚠️ Partial blockchain integration - some features may be limited"
              ) : (
                "❌ Blockchain features disabled - analysis results stored locally only"
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}