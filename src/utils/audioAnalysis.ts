// src/utils/audioAnalysis.ts

export interface AnalysisResult {
  version: string;
  harmonic: {
    key: string;
    key_confidence: number;
    chord_progression: string[];
    chord_complexity: number;
  };
  rhythmic: {
    bpm: number;
    beat_confidence: number;
    groove_stability: number;
    swing_factor: number;
  };
  spectral: {
    mfccs: number[][];
    dynamic_range: number;
    brightness: number;
  };
  vocal: {
    vocal_presence: number;
  };
}

export interface CompatibilityWeights {
  bpmDifference?: number;
  keyCompatibility?: number;
  energyBalance?: number;
  spectralBalance?: number;
  rhythmicComplexity?: number;
}

// --- API Communication ---

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function analyzeAudio(songId: string, audioUrl: string): Promise<AnalysisResult> {
  try {
    if (!songId || !audioUrl) {
      throw new Error('Invalid songId or audioUrl provided');
    }

    const audioData = await urlToBase64(audioUrl);

    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, audioData }),
    });

    if (!response.ok) {
      throw new Error(`Analysis service returned an error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.detail || 'Analysis failed');
    }

    return result.analysis as AnalysisResult;
  } catch (error) {
    console.error(`Audio analysis failed for song ${songId}:`, error);
    throw error;
  }
}


export interface CompatibilityResult {
  score: number;
  reasons: string[];
  suggestions: string[];
}

export function computeCompatibility(
  analyses: AnalysisResult[],
  weights?: CompatibilityWeights
): CompatibilityResult {
  if (analyses.length < 2) {
    return {
      score: 0,
      reasons: ['Need at least 2 songs for compatibility analysis'],
      suggestions: ['Add more songs to analyze compatibility']
    };
  }

  const defaultWeights: Required<CompatibilityWeights> = {
    bpmDifference: 0.3,
    keyCompatibility: 0.25,
    energyBalance: 0.2,
    spectralBalance: 0.15,
    rhythmicComplexity: 0.1
  };

  const finalWeights = { ...defaultWeights, ...weights };
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let totalScore = 0;

  // Compare first two songs (can be extended for multiple songs)
  const song1 = analyses[0];
  const song2 = analyses[1];

  // BPM Compatibility
  const bpmDiff = Math.abs(song1.rhythmic.bpm - song2.rhythmic.bpm);
  const bpmScore = Math.max(0, 100 - (bpmDiff * 2)); // Penalize BPM differences
  totalScore += bpmScore * finalWeights.bpmDifference;

  if (bpmDiff > 20) {
    reasons.push(`Large BPM difference: ${bpmDiff.toFixed(1)} BPM`);
    suggestions.push('Consider using tempo adjustment tools');
  }

  // Key Compatibility (simplified - using key names)
  const keyScore = getKeyCompatibilityScore(song1.harmonic.key, song2.harmonic.key);
  totalScore += keyScore * finalWeights.keyCompatibility;

  if (keyScore < 50) {
    reasons.push(`Keys may not be harmonically compatible`);
    suggestions.push('Consider key shifting one of the tracks');
  }

  // Energy Balance (using vocal presence as proxy for energy)
  const energyDiff = Math.abs(song1.vocal.vocal_presence - song2.vocal.vocal_presence);
  const energyScore = Math.max(0, 100 - (energyDiff * 100)); // Assuming vocal_presence is 0-1
  totalScore += energyScore * finalWeights.energyBalance;

  if (energyDiff > 0.3) {
    reasons.push(`Significant energy difference between tracks`);
    suggestions.push('Consider adjusting levels or choosing tracks with similar energy');
  }

  // Spectral Balance (using brightness and dynamic range)
  const spectralScore = getSpectralCompatibilityScore(song1.spectral, song2.spectral);
  totalScore += spectralScore * finalWeights.spectralBalance;

  // Rhythmic Complexity (using groove stability and swing factor)
  const rhythmScore = getRhythmCompatibilityScore(song1.rhythmic, song2.rhythmic);
  totalScore += rhythmScore * finalWeights.rhythmicComplexity;

  return {
    score: Math.round(totalScore),
    reasons,
    suggestions
  };
}

function getKeyCompatibilityScore(key1: string, key2: string): number {
  // Simplified Camelot wheel compatibility
  // In a real implementation, you'd have a proper Camelot wheel lookup
  if (key1 === key2) return 100;
  // Adjacent keys are somewhat compatible
  return 60; // Simplified score
}

function getSpectralCompatibilityScore(spec1: any, spec2: any): number {
  // Compare spectral characteristics between tracks
  const brightnessDiff = Math.abs(spec1.brightness - spec2.brightness);
  const dynamicRangeDiff = Math.abs(spec1.dynamic_range - spec2.dynamic_range);
  
  // Normalize differences (brightness is typically 0-8000Hz, dynamic_range is in dB)
  const normalizedBrightnessDiff = brightnessDiff / 8000;
  const normalizedDynamicDiff = Math.abs(dynamicRangeDiff) / 100; // Assuming max 100dB difference
  
  const avgDiff = (normalizedBrightnessDiff + normalizedDynamicDiff) / 2;
  return Math.max(0, 100 - (avgDiff * 100));
}

function getRhythmCompatibilityScore(rhythm1: any, rhythm2: any): number {
  // Compare rhythmic characteristics
  const grooveStabilityDiff = Math.abs(rhythm1.groove_stability - rhythm2.groove_stability);
  const swingFactorDiff = Math.abs(rhythm1.swing_factor - rhythm2.swing_factor);
  const beatConfidenceDiff = Math.abs(rhythm1.beat_confidence - rhythm2.beat_confidence);
  
  const avgDiff = (grooveStabilityDiff + swingFactorDiff + beatConfidenceDiff) / 3;
  return Math.max(0, 100 - (avgDiff * 100));
}

