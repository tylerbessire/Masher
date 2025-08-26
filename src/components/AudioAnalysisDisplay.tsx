import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type AudioFeatures = {
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  speechiness?: number;
  acousticness?: number;
  genre?: string;
};

interface AudioAnalysisDisplayProps {
  features: AudioFeatures;
  className?: string;
}

const FeatureBar = ({ label, value }: { label: string; value?: number }) => {
  if (value === undefined) return null;
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export const AudioAnalysisDisplay = ({ features, className }: AudioAnalysisDisplayProps) => {
  return (
    <Card className={`p-3 space-y-3 bg-muted/50 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          {features.tempo && (
            <div>
              <span className="text-2xl font-bold text-primary">{Math.round(features.tempo)}</span>
              <span className="text-xs text-muted-foreground ml-1">BPM</span>
            </div>
          )}
          {features.genre && (
            <Badge variant="secondary">{features.genre}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <FeatureBar label="Energy" value={features.energy} />
        <FeatureBar label="Danceability" value={features.danceability} />
        <FeatureBar label="Positivity" value={features.valence} />
      </div>
    </Card>
  );
};