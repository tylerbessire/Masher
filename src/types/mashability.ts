export interface MashabilityResult {
  overall_score: number;
  dimension_scores: Record<string, number>;
  compatibility_breakdown: Record<string, any>;
  recommendations: string[];
  warnings: string[];
}

export interface UserWeights {
  harmonic: number;
  rhythmic: number;
  spectral: number;
  vocal: number;
}
