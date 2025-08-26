import React, { useState, useCallback, useEffect } from 'react';
import { YouTubeSearch, type YouTubeSearchResult } from '@/components/YouTubeSearch';
import { SongSlot } from '@/components/SongSlot';
import { MashupZone } from '@/components/MashupZone';
import { SongLibrary } from '@/components/SongLibrary';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ParticlesBackground from '@/components/ParticlesBackground';

interface Song {
  id: string;
  name: string;
  artist: string;
  audio_url?: string;
  analysis?: any;
  file?: File;
}

const MashupStudio: React.FC = () => {
  const [song1, setSong1] = useState<Song | null>(null);
  const [song2, setSong2] = useState<Song | null>(null);
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [mashabilityScore, setMashabilityScore] = useState<any | null>(null);

  useEffect(() => {
    const getMashability = async () => {
      if (song1?.analysis && song2?.analysis) {
        toast.info("Calculating mashability...");
        try {
          const response = await fetch('http://localhost:8002/calculate-mashability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              song1_analysis: song1.analysis,
              song2_analysis: song2.analysis,
            }),
          });
          const data = await response.json();
          if (response.ok) {
            setMashabilityScore(data);
            toast.success("Mashability score calculated!");
          } else {
            throw new Error(data.detail || "Failed to calculate mashability");
          }
        } catch (error: any) {
          toast.error(`Error: ${error.message}`);
        }
      }
    };
    getMashability();
  }, [song1, song2]);

  const handleDragStart = useCallback((e: React.DragEvent, song: Song) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(song));
  }, []);

  const handleDropSong1 = (song: Song) => setSong1(song);
  const handleDropSong2 = (song: Song) => setSong2(song);

  const handleAnalyzeSong = async (songToAnalyze: Song) => {
    let audioBlob: Blob;

    if (songToAnalyze.file) {
      audioBlob = songToAnalyze.file;
    } else if (songToAnalyze.audio_url) {
      toast.info(`Analyzing from URL: ${songToAnalyze.name}`);
      const audioResponse = await fetch(songToAnalyze.audio_url);
      audioBlob = await audioResponse.blob();
    } else {
      toast.error("No audio data found for this song.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      const analysisResponse = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Audio, songId: songToAnalyze.id }),
      });
      const analysisResult = await analysisResponse.json();

      if (!analysisResult.success) {
        throw new Error(analysisResult.detail || "Analysis service returned an error.");
      }

      const analyzedSong = { ...songToAnalyze, analysis: analysisResult.analysis };

      setSavedSongs(prev => prev.map(s => s.id === songToAnalyze.id ? analyzedSong : s));
      setSong1(prevSong1 => (prevSong1?.id === songToAnalyze.id ? analyzedSong : prevSong1));
      setSong2(prevSong2 => (prevSong2?.id === songToAnalyze.id ? analyzedSong : prevSong2));

      toast.success(`Analysis complete: ${songToAnalyze.name}`);
    };
  };

  const handleYouTubeSelection = async (result: YouTubeSearchResult) => {
    toast.info(`Starting download: ${result.title}`);
    try {
      const response = await fetch('http://localhost:7999/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: result.url }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Download failed');

      const audioBlob = await (await fetch(data.url)).blob();
      const newSong: Song = {
        id: crypto.randomUUID(),
        name: result.title,
        artist: 'YouTube',
        audio_url: data.url,
        file: new File([audioBlob], `${result.title}.mp3`, { type: 'audio/mpeg' })
      };

      setSavedSongs(prev => [...prev, newSong]);
      toast.success(`Downloaded: ${result.title}`);
      
      // Automatically place in an empty slot
      if (!song1) {
        setSong1(newSong);
      } else if (!song2) {
        setSong2(newSong);
      }

      handleAnalyzeSong(newSong);
    } catch (error: any) {
      toast.error(`Download failed: ${error.message}`);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // This handler helps ensure the browser correctly registers the end of the drag from the sheet.
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 relative">
      <ParticlesBackground />
      <div className="relative z-10">
        <div className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0" style={{ backgroundColor: 'hsl(25, 100%, 85%)' }}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-orange-500" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Masher</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered music mashup creation studio</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <SongLibrary songs={savedSongs} onSongDragStart={handleDragStart} onSongDragEnd={handleDragEnd} />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <YouTubeSearch onSongSelected={handleYouTubeSelection} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SongSlot song={song1} title="Song 1" onDrop={handleDropSong1} />
                <SongSlot song={song2} title="Song 2" onDrop={handleDropSong2} />
              </div>
            </div>
            <div className="lg:col-span-1">
              <MashupZone
                selectedSongs={([song1, song2].filter(Boolean) as Song[])}
                mashabilityScore={mashabilityScore}
                onRemoveSong={(songId) => {
                  if (song1?.id === songId) setSong1(null);
                  if (song2?.id === songId) setSong2(null);
                }}
                onClearAll={() => { setSong1(null); setSong2(null); }}
                allSongs={savedSongs}
                className="sticky top-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MashupStudio;
