import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Music, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AudioAnalysisDisplay } from "./AudioAnalysisDisplay";

interface Song {
  id: string;
  name: string;
  artist: string;
  analysis?: any;
}

interface SongLibraryProps {
  songs: Song[];
  onSongDragStart: (e: React.DragEvent, song: Song) => void;
  onSongDragEnd: (e: React.DragEvent) => void;
}

export const SongLibrary = ({ songs, onSongDragStart, onSongDragEnd }: SongLibraryProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-[hsl(100,20%,85%)]">
          <Music className="mr-2 h-4 w-4" />
          Song Library
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Song Library</SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <div className="space-y-2">
            {songs.length > 0 ? (
              songs.map((song) => (
                <Collapsible key={song.id} className="group">
                  <div
                    draggable
                    onDragStart={(e) => onSongDragStart(e, song)}
                    onDragEnd={onSongDragEnd}
                    className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-grab border"
                  >
                    <div className="flex-grow">
                      <p className="font-semibold">{song.name}</p>
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                    </div>
                    {song.analysis && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                  {song.analysis && (
                    <CollapsibleContent className="p-4">
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
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))
            ) : (
              <p className="text-muted-foreground text-center">Your song library is empty.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
