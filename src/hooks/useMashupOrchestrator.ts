import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMashupOrchestrator = () => {
  const [masterplan, setMasterplan] = useState<any>(null);
  const [creativeVision, setCreativeVision] = useState<string>('');
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionMessage, setExecutionMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMasterplan = useCallback(async (
    song1Analysis: any,
    song2Analysis: any,
    mashabilityScore: any,
    userPreferences: any = {}
  ) => {
    setIsCreating(true);
    setError(null);
    setMasterplan(null);
    setCreativeVision('');
    setFinalAudioUrl(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('claude-mashup-orchestrator', {
        body: {
          song1_analysis: song1Analysis,
          song2_analysis: song2Analysis,
          mashability_score: mashabilityScore,
          user_preferences: userPreferences
        }
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.details || 'Masterplan creation failed in API.');

      setMasterplan(data.masterplan);
      setCreativeVision(data.creative_vision);

      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Masterplan creation failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, []);

  const executeMasterplan = useCallback(async (songs: any[], jobId: string) => {
    if (!masterplan) throw new Error('No masterplan to execute');

    setIsExecuting(true);
    setExecutionProgress(0);
    setExecutionMessage('Initiating rendering process...');
    setError(null);
    setFinalAudioUrl(null);

    try {

      // For streaming responses, we must use `fetch` directly, not supabase.functions.invoke
      // We need to construct the full URL and add the Authorization header manually.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;

      if (!supabaseUrl || !accessToken) {
        throw new Error("Supabase client not configured correctly. Make sure VITE_SUPABASE_URL is set in your .env file.");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/execute-masterplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ masterplan, songs, job_id: jobId })
      });

      if (!response.ok) throw new Error(`Execution failed to start: ${response.statusText}`);

      if (!response.body) throw new Error('No response body from execution service');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              setExecutionProgress(data.progress || 0);
              setExecutionMessage(data.message || '');
              if (data.storage_path) {
                const { data: signedUrlData, error: urlError } = await supabase.storage.from('mashups').createSignedUrl(data.storage_path, 3600);
                if (urlError) throw urlError;
                setFinalAudioUrl(signedUrlData.signedUrl);
              }
            } catch (e) {
              console.error("Failed to parse stream data chunk:", line);
            }
          }
        }
      }
      return finalAudioUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsExecuting(false);
    }
  }, [masterplan, finalAudioUrl]);

  return {
    masterplan,
    creativeVision,
    finalAudioUrl,
    createMasterplan,
    executeMasterplan,
    isCreating,
    isExecuting,
    executionProgress,
    executionMessage,
    error
  };
}
