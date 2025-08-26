import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MashabilityResult, UserWeights } from '@/types/mashability';

// --- Hook ---
export const useMashabilityScoring = () => {
  const [score, setScore] = useState<MashabilityResult | null>(null);

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateMashability = useCallback(async (
    song1Analysis: any,
    song2Analysis: any,
    weights?: UserWeights

  ): Promise<MashabilityResult | null> => {

    setIsCalculating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('mashability-scoring', {
        body: {
          song1_analysis: song1Analysis,
          song2_analysis: song2Analysis,
          user_weights: weights
        }
      });

      if (invokeError) throw invokeError;
      if (!data.success) throw new Error(data.error || 'Mashability calculation failed in API.');

      const result = data.mashability;
      setScore(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown scoring error occurred.';
      setError(errorMessage);
      console.error("Mashability calculation error:", errorMessage);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  return {
    score,
    calculateMashability,
    isCalculating,
    error
  };
};
