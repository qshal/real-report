import { Link2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTransactionUrl } from "@/lib/blockchain";
import type { NewsVerificationRecord } from "@/lib/blockchain";

interface BlockchainVerificationBadgeProps {
  analysis: {
    blockchain?: {
      success?: boolean;
      txHash?: string;
      articleHash?: string;
      duplicate?: boolean;
      previousVerification?: NewsVerificationRecord;
      error?: string;
      transactionUrl?: string;
    };
    metadata?: any;
  };
  compact?: boolean;
}

export const BlockchainVerificationBadge = ({ analysis, compact = false }: BlockchainVerificationBadgeProps) => {
  const verification = analysis.blockchain;

  if (!verification || !verification.success) {
    return null;
  }

  const hasTxHash = !!verification.txHash;
  const isDuplicate = verification.duplicate === true;
  const transactionUrl = verification.transactionUrl || (verification.txHash ? getTransactionUrl(verification.txHash) : null);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="border-brand/30 bg-brand/10 text-brand cursor-help"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {isDuplicate ? "Verified (Duplicate)" : "Blockchain Verified"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <p>{isDuplicate ? "Already verified on blockchain" : "Verified on blockchain"}</p>
              {hasTxHash && transactionUrl && (
                <a
                  href={transactionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Transaction <Link2 className="h-3 w-3" />
                </a>
              )}
              {verification.articleHash && (
                <p className="text-muted-foreground font-mono text-xs">
                  Hash: {verification.articleHash.slice(0, 10)}...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-brand/30 bg-brand/10 text-brand"
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {isDuplicate ? "Verified (Duplicate)" : "Blockchain Verified"}
      {hasTxHash && transactionUrl && (
        <a
          href={transactionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Link2 className="h-3 w-3" />
        </a>
      )}
    </Badge>
  );
};

