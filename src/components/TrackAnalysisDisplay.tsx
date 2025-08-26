import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AnalysisResult } from '@/utils/audioAnalysis'; // Use the new main interface
import { Zap, KeyRound, Activity, Sun } from 'lucide-react';

export function TrackAnalysisDisplay({ analysis }: { analysis: AnalysisResult }) {
  if (!analysis) return null;
  
  // Additional safety checks
  if (!analysis.rhythmic || !analysis.harmonic || !analysis.spectral || !analysis.vocal) {
    console.warn('TrackAnalysisDisplay: Analysis missing required sections', analysis);
    return null;
  }

  // Safely extract values with fallbacks
  const bpm = analysis.rhythmic?.bpm || 0;
  const key = analysis.harmonic?.key || 'Unknown';
  const energy = analysis.vocal?.vocal_presence || 0;
  const brightness = analysis.spectral?.brightness ? (analysis.spectral.brightness / 8000) : 0; // Normalize to 0-1

  return (
    <Card className="p-4 space-y-3 bg-secondary/50">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Track Analysis</h4>
        {/* Mood is not in the new analysis, can be added later */}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span>Tempo: {bpm.toFixed(0)} BPM</span>
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <span>Key: {key}</span>
        </div>
      </div>
      <div className="space-y-1 pt-2 border-t border-border">
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" /> Energy
        </label>
        <Progress value={Math.max(0, Math.min(100, energy * 100))} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground flex items-center gap-2">
          <Sun className="h-4 w-4" /> Brightness
        </label>
        <Progress value={Math.max(0, Math.min(100, brightness * 100))} />
      </div>
    </Card>
  );
}
