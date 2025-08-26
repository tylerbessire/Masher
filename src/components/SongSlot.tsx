import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Music } from "lucide-react";
import { AudioAnalysisDisplay } from "./AudioAnalysisDisplay";

interface Song {
  id: string;
  name: string;
  artist: string;
  analysis?: any;
}

interface SongSlotProps {
  song: Song | null;
  title: string;
  onDrop: (song: Song) => void;
  className?: string;
}

export const SongSlot = ({ song, title, onDrop, className }: SongSlotProps) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const songData = JSON.parse(e.dataTransfer.getData("application/json"));
    onDrop(songData);
  };

  return (
    <Card
      className={cn("bg-card border p-4 transition-all", className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {song ? (
          <div className="space-y-2">
            <div className="p-3 bg-background rounded-lg border">
              <p className="text-sm font-medium truncate">{song.name}</p>
              <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
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
                  genre: song.analysis.harmonic?.key,
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg bg-[hsl(25,100%,90%)]">
            <div className="text-center text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2" />
              <p>Drop a song here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
