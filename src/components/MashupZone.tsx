import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Trash2, Play, Download, Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMashupGenerator } from "@/hooks/useMashupGenerator";
import { CompatibilityScore } from "@/components/CompatibilityScore";
import { toast } from "sonner";
import { TrackAnalysisDisplay } from "./TrackAnalysisDisplay";
import { MashupTimeline, type MashupSection } from "./MashupTimeline";
import { ClaudeCollaboration } from "./ClaudeCollaboration";

interface Song {
  id: string;
  name: string;
  artist: string;
  analysis?: any;
}

interface MashupResult {
  title: string;
  audioUrl: string;
  concept: string;
  timeline?: MashupSection[];
}

interface MashupZoneProps {
  selectedSongs: Song[];
  mashabilityScore: any | null;
  masterplan: any | null;
  onRemoveSong: (songId: string) => void;
  onClearAll: () => void;
  onSongAdd?: (song: Song) => void;
  allSongs?: Song[];
  className?: string;
  onCreateMashup: () => void;
}

export const MashupZone = ({
  selectedSongs,
  mashabilityScore,
  masterplan,
  onRemoveSong,
  onClearAll,
  onSongAdd,
  allSongs = [],
  className,
}: Omit<MashupZoneProps, 'onCreateMashup'>) => {
  const {
    generateMashup,
    isProcessing: isGenerating,
    progress,
    processingStep,
    mashupResult,
  } = useMashupGenerator();

  const [isIterating, setIsIterating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const handleCreateMashup = async () => {
    if (selectedSongs.length < 2) return;
    // The masterplan is now implicitly created by the generateMashup flow
    await generateMashup(selectedSongs);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const song = JSON.parse(e.dataTransfer.getData('application/json'));
    if (song) {
      if (!selectedSongs.find(s => s.id === song.id)) {
        if (onSongAdd) {
          onSongAdd(song);
          toast.success(`Added ${song.name} to mashup!`);
        }
      }
    }
  };

  return (
    <Card className={cn("bg-card border p-6 space-y-6", className)}>
      <div className="text-center">
        <h2 className="text-3xl font-bold">Mashup Zone</h2>
        <p className="text-sm text-muted-foreground">AI-POWERED MUSIC FUSION ENGINE</p>
      </div>

      <div
        className="min-h-64 border-2 border-dashed rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-4 bg-[hsl(25,100%,90%)]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {selectedSongs.length === 0 ? (
          <div className="space-y-2">
            <Sparkles className="w-10 h-10 mx-auto" />
            <p className="font-bold text-lg">DROP ZONE ACTIVE</p>
            <p className="text-sm">DRAG 2 TRACKS HERE</p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {selectedSongs.map((song) => (
              <div key={song.id} className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background rounded-xl border">
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{song.name}</p>
                    <p className="text-xs text-muted-foreground">{song.artist}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSong(song.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {song.analysis && (
                  <TrackAnalysisDisplay analysis={song.analysis} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(isGenerating || isIterating) && (
          <div className="space-y-3 text-center p-4 bg-muted rounded-xl border">
            <p className="text-sm font-bold">
              {isIterating ? '🤖 CLAUDE ITERATING...' : processingStep}
            </p>
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full h-3" />
                <p className="text-xs">{progress}% COMPLETE</p>
              </div>
            )}
          </div>
        )}

        {mashabilityScore && !isGenerating && !isIterating && selectedSongs.length >= 2 && (
          <CompatibilityScore score={mashabilityScore.overall_score} reasons={mashabilityScore.recommendations} suggestions={mashabilityScore.warnings} />
        )}

        {mashupResult && !isGenerating && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 bg-background rounded-lg border">
              <div className="text-center">
                <h3 className="text-lg font-bold">"{mashupResult.title}"</h3>
                <p className="text-sm text-muted-foreground italic">{mashupResult.concept}</p>
              </div>
              {mashupResult.timeline && <MashupTimeline timeline={mashupResult.timeline} />}
              <div className="flex gap-2 justify-center">
                {mashupResult.audioUrl ? (
                  <>
                    <Button size="sm" onClick={() => { if (audioRef.current) audioRef.current.pause(); audioRef.current = new Audio(mashupResult.audioUrl); audioRef.current.play().catch(e => toast.error('Error playing audio.')); }}>
                      <Play className="h-4 w-4 mr-2" /> Play
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { const link = document.createElement('a'); link.href = mashupResult.audioUrl; link.download = `${mashupResult.title}.mp3`; link.click(); }}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Audio processing coming soon!
                  </div>
                )}
              </div>
            </div>
            <ClaudeCollaboration
              mashupConcept={mashupResult.concept}
              analysisData={selectedSongs.map(s => s.analysis)}
              onIterationRequest={() => {}}
            />
          </div>
        )}
        
        {masterplan && !isGenerating && (
            <div className="space-y-4">
                <div className="space-y-3 p-4 bg-background rounded-lg border">
                    <div className="text-center">
                        <h3 className="text-lg font-bold">"{masterplan.creative_vision}"</h3>
                    </div>
                    {masterplan.masterplan.timeline && <MashupTimeline timeline={masterplan.masterplan.timeline} />}
                </div>
            </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {selectedSongs.length >= 2 && (
          <Button
            onClick={handleCreateMashup}
            size="lg"
            disabled={isGenerating || isIterating}
            className="font-bold w-full text-lg py-6"
          >
            <Zap className="h-6 w-6 mr-3" />
            {isGenerating ? "CREATING..." : (isIterating ? "UPDATE & RE-GENERATE" : "CREATE MASHUP")}
          </Button>
        )}
        {selectedSongs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
          >
            CLEAR ALL
          </Button>
        )}
      </div>
    </Card>
  );
};