import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { getBlockchain, formatVerificationCode, type AnalysisBlock } from "@/lib/analysisBlockchain";
import { toast } from "sonner";

export function BlockchainSearchCard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    block?: AnalysisBlock;
    similarBlocks?: AnalysisBlock[];
    message: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a verification code or text to search");
      return;
    }

    setSearching(true);
    const blockchain = getBlockchain();

    // Check if it's a verification code or text
    const isCode = searchQuery.startsWith("VRF-");
    
    let result;
    if (isCode) {
      result = blockchain.searchByCode(searchQuery.trim());
    } else {
      result = blockchain.searchByContent(searchQuery.trim());
    }

    setSearchResult(result);
    setSearching(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="text-blue-500" />
          Blockchain Analysis Search
        </CardTitle>
        <CardDescription>
          Search by verification code or content to find previous analyses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter verification code (VRF-XXXX-...) or text content"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>

        {searchResult && (
          <div className="space-y-4">
            <Alert className={searchResult.found ? "border-green-500" : "border-yellow-500"}>
              <AlertDescription className="flex items-center gap-2">
                {searchResult.found ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-yellow-500" />
                )}
                {searchResult.message}
              </AlertDescription>
            </Alert>

            {searchResult.found && searchResult.block && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Block #{searchResult.block.blockNumber}</CardTitle>
                    <Badge className="bg-green-500">Verified</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Verification Code:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {formatVerificationCode(searchResult.block.verificationCode)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(searchResult.block!.verificationCode)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Timestamp:</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(searchResult.block.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Prediction:</span>
                      <Badge variant="outline" className="uppercase">
                        {searchResult.block.data.prediction}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence:</span>
                      <span className="text-sm font-semibold">
                        {searchResult.block.data.confidence.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Trust Score:</span>
                      <span className="text-sm font-semibold">
                        {searchResult.block.data.trustScore.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Model Used:</span>
                      <Badge variant="outline">{searchResult.block.data.modelUsed}</Badge>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-1">Content:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {searchResult.block.data.inputText.substring(0, 200)}
                      {searchResult.block.data.inputText.length > 200 && "..."}
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">
                      {searchResult.block.data.explanation}
                    </p>
                  </div>

                  {searchResult.block.data.nlpFeatures && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">NLP Features:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Sentiment</div>
                          <div className="text-sm font-semibold">
                            {searchResult.block.data.nlpFeatures.sentiment.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Clickbait</div>
                          <div className="text-sm font-semibold">
                            {(searchResult.block.data.nlpFeatures.clickbait * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Readability</div>
                          <div className="text-sm font-semibold">
                            {searchResult.block.data.nlpFeatures.readability.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Block Hash:</span>
                        <code className="block mt-1 text-[10px] break-all">
                          {searchResult.block.hash}
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Previous Hash:</span>
                        <code className="block mt-1 text-[10px] break-all">
                          {searchResult.block.previousHash}
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!searchResult.found && searchResult.similarBlocks && searchResult.similarBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Similar Analyses Found:</p>
                {searchResult.similarBlocks.map((block) => (
                  <Card key={block.blockNumber} className="border-yellow-500/30">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            Block #{block.blockNumber}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(block.timestamp)}
                          </p>
                        </div>
                        <Badge className="uppercase">{block.data.prediction}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {block.data.inputText.substring(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span>Confidence: {block.data.confidence.toFixed(1)}%</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSearchQuery(block.verificationCode);
                            handleSearch();
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Full
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
