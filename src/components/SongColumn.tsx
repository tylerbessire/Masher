import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioAnalysisDisplay } from "@/components/AudioAnalysisDisplay";

interface Song {
  id: string;
  name: string;
  artist: string;
  audio_url?: string;
  analysis?: any;
}

interface SongColumnProps {
  title: string;
  songs: Song[];
  onSongsChange: (songs: Song[]) => void;
  onDragStart: (e: React.DragEvent, song: Song) => void;
  onAnalyzeSong: (song: Song) => void;
  className?: string;
}

export const SongColumn = ({ 
  title, 
  songs, 
  onSongsChange, 
  onDragStart,
  onAnalyzeSong,
  className 
}: SongColumnProps) => {

  const removeSong = (songId: string) => {
    onSongsChange(songs.filter(song => song.id !== songId));
  };

  return (
    <Card className={cn("bg-card border p-4", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {songs.map((song) => (
            <div key={song.id} className="space-y-2">
              <div
                draggable
                onDragStart={(e) => onDragStart(e, song)}
                className="group flex items-center justify-between p-3 bg-background rounded-lg border transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {song.analysis ? (
                    <div className="text-xs text-green-500">Analyzed</div>
                  ) : (
                    <div className="text-xs text-yellow-500">Analyzing...</div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeSong(song.id)} className="hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {song.analysis && (
                <AudioAnalysisDisplay 
                  features={{
                    tempo: song.analysis.rhythmic?.bpm,
                    energy: song.analysis.vocal?.vocal_presence,
                    danceability: song.analysis.rhythmic?.beat_confidence,
                    valence: song.analysis.harmonic?.key_confidence,
                    speechiness: song.analysis.vocal?.vocal_presence,
                    acousticness: 1 - (song.analysis.spectral?.brightness || 0) / 8000,
                    genre: song.analysis.harmonic?.key
                  }} 
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};