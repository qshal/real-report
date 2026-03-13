import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { analyzeNLPFeatures, type NLPFeatureAnalysis } from "@/lib/nlpModelComparison";

interface NLPFeatureAnalysisProps {
  text?: string;
}

export function NLPFeatureAnalysisCard({ text }: NLPFeatureAnalysisProps) {
  // Use sample text if none provided
  const sampleText = text || "Breaking news: Scientists discover amazing new breakthrough that will change everything! You won't believe what happens next. This incredible discovery is shocking the world.";
  
  const features = analyzeNLPFeatures(sampleText);

  const getScoreColor = (score: number): string => {
    if (score > 0.7) return "text-green-600";
    if (score > 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentLabel = (score: number): string => {
    if (score > 0.3) return "Positive";
    if (score < -0.3) return "Negative";
    return "Neutral";
  };

  const getReadabilityLabel = (score: number): string => {
    if (score > 70) return "Easy";
    if (score > 50) return "Moderate";
    if (score > 30) return "Difficult";
    return "Very Difficult";
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-blue-500" />
          NLP Feature Analysis
        </CardTitle>
        <CardDescription>
          Linguistic and semantic features extracted from text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sentiment Analysis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sentiment Score</span>
              <Badge variant="outline">
                {getSentimentLabel(features.sentimentScore)}
              </Badge>
            </div>
            <Progress 
              value={((features.sentimentScore + 1) / 2) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {features.sentimentScore > 0 ? "Positive" : "Negative"} tone detected
            </p>
          </div>

          {/* Emotional Intensity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Emotional Intensity</span>
              <Badge variant="outline" className={getScoreColor(features.emotionalIntensity)}>
                {(features.emotionalIntensity * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress value={features.emotionalIntensity * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {features.emotionalIntensity > 0.5 ? "High" : "Low"} emotional language
            </p>
          </div>

          {/* Readability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Readability</span>
              <Badge variant="outline">
                {getReadabilityLabel(features.readabilityScore)}
              </Badge>
            </div>
            <Progress value={features.readabilityScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Flesch Reading Ease: {features.readabilityScore.toFixed(1)}
            </p>
          </div>

          {/* Lexical Diversity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lexical Diversity</span>
              <Badge variant="outline">
                {(features.lexicalDiversity * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress value={features.lexicalDiversity * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Vocabulary richness (Type-Token Ratio)
            </p>
          </div>

          {/* Clickbait Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                Clickbait Score
                {features.clickbaitScore > 0.5 && (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
              </span>
              <Badge 
                variant="outline" 
                className={features.clickbaitScore > 0.5 ? "border-red-500 text-red-600" : ""}
              >
                {(features.clickbaitScore * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress 
              value={features.clickbaitScore * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {features.clickbaitScore > 0.5 ? "High" : "Low"} sensationalism detected
            </p>
          </div>

          {/* Sentence Complexity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sentence Complexity</span>
              <Badge variant="outline">
                {(features.sentenceComplexity * 100).toFixed(0)}%
              </Badge>
            </div>
            <Progress value={features.sentenceComplexity * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Average sentence structure complexity
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">{features.namedEntityCount}</div>
            <div className="text-xs text-muted-foreground">Named Entities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{features.averageWordLength.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Word Length</div>
          </div>
        </div>

        {/* Risk Assessment */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">NLP Risk Assessment</div>
                <p className="text-xs text-muted-foreground">
                  {features.clickbaitScore > 0.5 && features.emotionalIntensity > 0.6
                    ? "⚠️ High risk: Sensational language with emotional manipulation detected"
                    : features.clickbaitScore > 0.3 || features.emotionalIntensity > 0.5
                    ? "⚡ Moderate risk: Some sensational or emotional elements present"
                    : "✓ Low risk: Balanced language with minimal sensationalism"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
