import { useState, useCallback } from 'react';
import { analyzeAudio, computeCompatibility } from '@/utils/audioAnalysis';
import type { AnalysisResult, CompatibilityWeights } from '@/utils/audioAnalysis';
import { toast } from 'sonner';

interface Song {
  id: string;
  audio_url?: string;
}

export function useAudioAnalysis() {
  const [analyzedSongs, setAnalyzedSongs] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSong = useCallback(async (song: Song): Promise<AnalysisResult | null> => {
    try {
      const cached = analyzedSongs.get(song.id);
      if (cached) {
        toast.success(`Using cached analysis for ${song.id}`);
        return cached;
      }

      if (!song || !song.id || !song.audio_url) {
        toast.error('Invalid song data for analysis. Missing ID or audio URL.');
        return null;
      }

      setIsAnalyzing(true);
      toast.info(`Analyzing ${song.id}...`);

      const result = await analyzeAudio(song.id, song.audio_url);
      
      if (!result) {
        toast.error(`Analysis returned no results for ${song.id}`);
        return null;
      }

      setAnalyzedSongs(prev => new Map(prev).set(song.id, result));
      toast.success(`Analysis complete for ${song.id}!`);
      return result;

    } catch (error) {
      console.error(`Analysis error for song ${song?.id || 'unknown'}:`, error);
      
      let errorMessage = 'An unknown error occurred during analysis.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(`Analysis failed for ${song?.id || 'song'}: ${errorMessage}`);
      return null;

    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzedSongs]);

  const analyzeMashupCompatibility = useCallback(async (songs: Song[], weights?: CompatibilityWeights) => {
    const analyses: AnalysisResult[] = [];
    for (const song of songs) {
      let analysis = analyzedSongs.get(song.id);
      if (!analysis) {
        analysis = await analyzeSong(song);
      }

      if (analysis) {
        analyses.push(analysis);
      } else {
        toast.error("Compatibility check failed: one or more songs could not be analyzed.");
        return { score: 0, reasons: ["Analysis failed for one or more songs."], suggestions: [] };
      }
    }

    if (analyses.length < 2) {
      return { score: 0, reasons: ["Need at least 2 analyzed songs."], suggestions: [] };
    }

    const compatibility = computeCompatibility(analyses, weights);
    toast.success(`Mashup compatibility: ${compatibility.score}%`);
    return compatibility;
  }, [analyzedSongs, analyzeSong]);

  const getAnalysis = useCallback((songId: string): AnalysisResult | undefined => {
    return analyzedSongs.get(songId);
  }, [analyzedSongs]);

  return {
    isAnalyzing,
    analyzeSong,
    getAnalysis,
    analyzedSongs,
    analyzeMashupCompatibility,
  };
}
