import { useState } from "react";
import { Shield, CheckCircle, XCircle, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { HybridAnalysisResult } from "@/lib/analyzeNewsHybrid";

interface BlockchainVerificationBadgeProps {
  analysis: HybridAnalysisResult;
  compact?: boolean;
}

export function BlockchainVerificationBadge({ 
  analysis, 
  compact = false 
}: BlockchainVerificationBadgeProps) {
  const [copied, setCopied] = useState<string | null>(null);
  
  const blockchain = analysis.blockchain;
  const metadata = analysis.metadata?.blockchainVerification as any;

  if (!blockchain && !metadata) {
    return null;
  }

  const isStored = blockchain?.stored || false;
  const isVerified = blockchain?.verified || false;
  const txHash = blockchain?.txHash || metadata?.txHash;
  const contentHash = blockchain?.contentHash || metadata?.contentHash;
  const error = blockchain?.error;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(`${type} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getExplorerUrl = (hash: string, type: 'tx' | 'address') => {
    // Default to Sepolia testnet - you can make this configurable
    const baseUrl = 'https://sepolia.etherscan.io';
    return type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={
              isStored 
                ? "border-signal-real/30 bg-signal-real/10 text-signal-real cursor-pointer"
                : error
                ? "border-signal-warn/30 bg-signal-warn/10 text-signal-warn cursor-pointer"
                : "border-muted bg-muted/50 text-muted-foreground cursor-pointer"
            }
          >
            <Shield className="h-3 w-3 mr-1" />
            {isStored ? "Verified" : error ? "Partial" : "Pending"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {isStored ? (
              <>Stored on blockchain with hash: {contentHash?.slice(0, 10)}...</>
            ) : error ? (
              <>Blockchain error: {error}</>
            ) : (
              <>Blockchain verification pending</>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-brand-highlight" />
        <span className="text-sm font-medium">Blockchain Verification</span>
        <Badge 
          className={
            isStored 
              ? "border-signal-real/30 bg-signal-real/10 text-signal-real"
              : error
              ? "border-signal-warn/30 bg-signal-warn/10 text-signal-warn"
              : "border-muted bg-muted/50 text-muted-foreground"
          }
        >
          {isStored ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Stored
            </>
          ) : error ? (
            <>
              <AlertTriangle className="h-3 w-3 mr-1" />
              Error
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </>
          )}
        </Badge>
      </div>

      {error && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {contentHash && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Content Hash:</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => copyToClipboard(contentHash, 'Content Hash')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-xs font-mono break-all bg-muted/50 p-1 rounded">
            {contentHash}
          </div>
        </div>
      )}

      {txHash && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Transaction:</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={() => copyToClipboard(txHash, 'Transaction Hash')}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={() => window.open(getExplorerUrl(txHash, 'tx'), '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="text-xs font-mono break-all bg-muted/50 p-1 rounded">
            {txHash}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {isStored ? (
          "✅ Analysis permanently stored on blockchain for verification"
        ) : (
          "⚠️ Analysis not stored on blockchain - verification limited"
        )}
      </div>
    </div>
  );
}