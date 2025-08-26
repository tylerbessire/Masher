import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompatibilityScoreProps {
  score: number;
  reasons: string[];
  suggestions: string[];
  className?: string;
}

export const CompatibilityScore = ({ 
  score, 
  reasons, 
  suggestions, 
  className 
}: CompatibilityScoreProps) => {
  const getScoreColor = () => {
    if (score >= 80) return "text-electric-green";
    if (score >= 60) return "text-electric-yellow";
    if (score >= 40) return "text-electric-blue";
    return "text-electric-red";
  };

  const getScoreEmoji = () => {
    if (score >= 80) return "🔥";
    if (score >= 60) return "✨";
    if (score >= 40) return "⚡";
    return "🎯";
  };

  const getBadgeVariant = () => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  return (
    <Card className={cn(
      "p-4 space-y-4 border-sunset-glow/30 bg-gradient-card/50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sunset-glow" />
          <span className="text-sm font-medium text-foreground">Mashup Compatibility</span>
        </div>
        <Badge variant={getBadgeVariant()} className="font-bold">
          {getScoreEmoji()} {score}%
        </Badge>
      </div>

      {/* Score Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Compatibility Score</span>
          <span className={`text-sm font-bold ${getScoreColor()}`}>
            {score}/100
          </span>
        </div>
        <Progress 
          value={score} 
          className="h-2 bg-cobalt-deep/50" 
        />
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-twilight-pink" />
            <span className="text-xs font-medium text-twilight-pink uppercase tracking-wide">
              Analysis
            </span>
          </div>
          <div className="space-y-1">
            {reasons.map((reason, index) => (
              <div key={index} className="text-xs text-muted-foreground leading-relaxed">
                • {reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-3 w-3 text-cyan-bright" />
            <span className="text-xs font-medium text-cyan-bright uppercase tracking-wide">
              Suggestions
            </span>
          </div>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="text-xs text-cyan-bright/80 leading-relaxed">
                💡 {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Interpretation */}
      <div className="pt-2 border-t border-border/30">
        <div className="text-xs text-center text-muted-foreground">
          {score >= 80 && "🎉 Perfect mashup material!"}
          {score >= 60 && score < 80 && "🎵 Great potential for creative mixing"}
          {score >= 40 && score < 60 && "🎨 Challenging but potentially innovative"}
          {score < 40 && "🔬 Experimental territory - high creativity required"}
        </div>
      </div>
    </Card>
  );
};