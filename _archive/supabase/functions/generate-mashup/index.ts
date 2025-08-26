import { JobStateManager, Song, AnalysisResult, MashabilityScore, Masterplan } from '../_shared/jobStateManager.ts';
import { corsHeaders, tunnelBypassHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MashupRequest {
  songs: Song[];
}

// Service endpoints from environment variables
const SERVICE_ENDPOINTS = {
  analysis: Deno.env.get('ANALYSIS_API_URL') || 'http://localhost:8000',
  scoring: Deno.env.get('SCORING_API_URL') || 'http://localhost:8002', 
  orchestrator: Deno.env.get('ORCHESTRATOR_API_URL') || 'http://localhost:8003',
  processing: Deno.env.get('PROCESSING_API_URL') || 'http://localhost:8001',
  separation: Deno.env.get('SEPARATION_API_URL') || 'http://localhost:8004'
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Timeout configuration - different timeouts for different operations
const TIMEOUT_CONFIG = {
  analysis: 45000,    // 45 seconds for audio analysis
  scoring: 30000,     // 30 seconds for mashability scoring
  orchestrator: 60000, // 60 seconds for Claude AI masterplan
  processing: 300000,  // 5 minutes for audio rendering
  download: 30000     // 30 seconds for file downloads
};

// Service availability tracking
const SERVICE_STATUS = {
  analysis: { available: true, lastCheck: Date.now(), failures: 0 },
  scoring: { available: true, lastCheck: Date.now(), failures: 0 },
  orchestrator: { available: true, lastCheck: Date.now(), failures: 0 },
  processing: { available: true, lastCheck: Date.now(), failures: 0 },
  separation: { available: true, lastCheck: Date.now(), failures: 0 }
};

const MAX_SERVICE_FAILURES = 3;
const SERVICE_RECOVERY_TIME = 5 * 60 * 1000; // 5 minutes

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Enhanced error classification for better error handling
 */
function classifyError(error: Error): {
  type: 'network' | 'timeout' | 'service_unavailable' | 'invalid_data' | 'system' | 'unknown';
  recoverable: boolean;
  shouldRetry: boolean;
} {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout') || message.includes('aborted')) {
    return { type: 'timeout', recoverable: true, shouldRetry: true };
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return { type: 'network', recoverable: true, shouldRetry: true };
  }
  
  if (message.includes('503') || message.includes('502') || message.includes('unavailable')) {
    return { type: 'service_unavailable', recoverable: true, shouldRetry: true };
  }
  
  if (message.includes('400') || message.includes('invalid') || message.includes('corrupt')) {
    return { type: 'invalid_data', recoverable: false, shouldRetry: false };
  }
  
  if (message.includes('500') || message.includes('internal')) {
    return { type: 'system', recoverable: true, shouldRetry: true };
  }
  
  return { type: 'unknown', recoverable: true, shouldRetry: true };
}

/**
 * Check if a service is available based on recent failure history
 */
function isServiceAvailable(serviceName: keyof typeof SERVICE_STATUS): boolean {
  const status = SERVICE_STATUS[serviceName];
  const now = Date.now();
  
  // If service has failed too many times recently, check if recovery time has passed
  if (!status.available) {
    if (now - status.lastCheck > SERVICE_RECOVERY_TIME) {
      // Reset service status after recovery time
      status.available = true;
      status.failures = 0;
      console.log(`Service ${serviceName} marked as available after recovery period`);
    }
  }
  
  return status.available;
}

/**
 * Mark a service as failed and update availability status
 */
function markServiceFailure(serviceName: keyof typeof SERVICE_STATUS, error: Error): void {
  const status = SERVICE_STATUS[serviceName];
  status.failures++;
  status.lastCheck = Date.now();
  
  if (status.failures >= MAX_SERVICE_FAILURES) {
    status.available = false;
    console.warn(`Service ${serviceName} marked as unavailable after ${status.failures} failures`);
  }
  
  console.warn(`Service ${serviceName} failure ${status.failures}/${MAX_SERVICE_FAILURES}: ${error.message}`);
}

/**
 * Mark a service as successful and reset failure count
 */
function markServiceSuccess(serviceName: keyof typeof SERVICE_STATUS): void {
  const status = SERVICE_STATUS[serviceName];
  if (status.failures > 0) {
    console.log(`Service ${serviceName} recovered after ${status.failures} failures`);
  }
  status.failures = 0;
  status.available = true;
  status.lastCheck = Date.now();
}

/**
 * Enhanced retry utility with exponential backoff and error classification
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: string,
  serviceName?: keyof typeof SERVICE_STATUS,
  maxRetries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;
  
  // Check service availability before attempting
  if (serviceName && !isServiceAvailable(serviceName)) {
    throw new Error(`Service ${serviceName} is currently unavailable. Please try again later.`);
  }
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Mark service as successful if specified
      if (serviceName) {
        markServiceSuccess(serviceName);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorInfo = classifyError(lastError);
      
      // Mark service failure if specified
      if (serviceName) {
        markServiceFailure(serviceName, lastError);
      }
      
      // Don't retry if error is not recoverable
      if (!errorInfo.shouldRetry) {
        console.error(`${context} failed with non-recoverable error:`, lastError.message);
        throw lastError;
      }
      
      if (attempt === maxRetries) {
        console.error(`${context} failed after ${maxRetries + 1} attempts:`, lastError);
        throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError.message}`);
      }
      
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      );
      
      console.warn(`${context} attempt ${attempt + 1} failed (${errorInfo.type}), retrying in ${delay}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Enhanced HTTP request with dynamic timeout and comprehensive error handling
 */
async function makeServiceRequest(
  url: string, 
  options: RequestInit, 
  timeoutMs?: number,
  serviceName?: keyof typeof SERVICE_STATUS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = timeoutMs || TIMEOUT_CONFIG.analysis; // Default timeout
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`Making request to ${url} with ${timeout}ms timeout`);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...tunnelBypassHeaders,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Try to get more detailed error information from response body
      try {
        const errorBody = await response.text();
        if (errorBody) {
          const parsedError = JSON.parse(errorBody);
          if (parsedError.error || parsedError.message) {
            errorMessage += ` - ${parsedError.error || parsedError.message}`;
          }
        }
      } catch (parseError) {
        // Ignore JSON parse errors, use basic error message
      }
      
      throw new Error(errorMessage);
    }
    
    console.log(`Successfully received response from ${url}`);
    return response;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    
    // Enhance error message with context
    const enhancedError = new Error(`Service request failed: ${error.message}`);
    enhancedError.stack = error.stack;
    throw enhancedError;
    
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Graceful degradation handler for when services are unavailable
 */
function handleServiceUnavailable(serviceName: string, fallbackMessage?: string): never {
  const message = fallbackMessage || `The ${serviceName} service is currently unavailable. Please try again in a few minutes.`;
  throw new Error(message);
}

/**
 * Download audio file from Supabase storage and convert to base64 with enhanced error handling
 */
async function downloadAndEncodeAudio(storagePath: string): Promise<string> {
  try {
    console.log(`Downloading audio file from storage: ${storagePath}`);
    
    const { data, error } = await supabase.storage
      .from('mashups')
      .download(storagePath);
      
    if (error) {
      console.error(`Storage download error for ${storagePath}:`, error);
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        throw new Error(`Audio file not found in storage: ${storagePath}. Please ensure the file was uploaded correctly.`);
      }
      
      if (error.message.includes('unauthorized') || error.message.includes('403')) {
        throw new Error(`Access denied to audio file: ${storagePath}. Please check file permissions.`);
      }
      
      throw new Error(`Failed to download audio file from storage: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`No data received for audio file: ${storagePath}`);
    }
    
    // Validate file size (prevent memory issues with very large files)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (data.size > MAX_FILE_SIZE) {
      throw new Error(`Audio file too large: ${Math.round(data.size / 1024 / 1024)}MB. Maximum size is 50MB.`);
    }
    
    console.log(`Successfully downloaded audio file: ${storagePath} (${Math.round(data.size / 1024)}KB)`);
    
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));
    
    console.log(`Successfully encoded audio file to base64: ${base64.length} characters`);
    return base64;
    
  } catch (error) {
    console.error(`Error downloading and encoding audio file ${storagePath}:`, error);
    
    // Re-throw with enhanced error message
    if (error.message.includes('Failed to download') || error.message.includes('not found')) {
      throw error; // Already has good error message
    }
    
    throw new Error(`Failed to process audio file ${storagePath}: ${error.message}`);
  }
}

/**
 * Call audio analysis service for a single song with comprehensive error handling
 */
async function analyzeSong(song: Song): Promise<AnalysisResult> {
  if (!isServiceAvailable('analysis')) {
    handleServiceUnavailable('audio analysis', 
      'The audio analysis service is temporarily unavailable. Please try again in a few minutes.');
  }
  
  return retryWithBackoff(async () => {
    try {
      console.log(`Starting analysis for song: ${song.name} (${song.song_id})`);
      
      // Validate song data
      if (!song.storage_path || !song.song_id) {
        throw new Error(`Invalid song data: missing storage_path or song_id for ${song.name}`);
      }
      
      const audioData = await downloadAndEncodeAudio(song.storage_path);
      
      const response = await makeServiceRequest(
        `${SERVICE_ENDPOINTS.analysis}/analyze`, 
        {
          method: 'POST',
          body: JSON.stringify({
            audioData,
            songId: song.song_id
          })
        },
        TIMEOUT_CONFIG.analysis,
        'analysis'
      );
      
      const result = await response.json();
      
      // Validate analysis service response
      if (!result) {
        throw new Error('Empty response from analysis service');
      }
      
      if (!result.success) {
        const errorMsg = result.error || result.message || 'Unknown analysis error';
        throw new Error(`Analysis service error: ${errorMsg}`);
      }
      
      // Validate required analysis fields
      if (!result.analysis || !result.analysis.rhythmic || !result.analysis.harmonic) {
        throw new Error('Invalid analysis response: missing required analysis data');
      }
      
      const analysis = result.analysis;
      
      // Validate specific required fields
      if (typeof analysis.rhythmic.bpm !== 'number' || analysis.rhythmic.bpm <= 0) {
        throw new Error('Invalid analysis response: invalid or missing BPM data');
      }
      
      if (!analysis.harmonic.key || typeof analysis.harmonic.key !== 'string') {
        throw new Error('Invalid analysis response: invalid or missing key data');
      }
      
      console.log(`Successfully analyzed song ${song.name}: BPM=${analysis.rhythmic.bpm}, Key=${analysis.harmonic.key}`);
      
      return {
        song_id: song.song_id,
        tempo: analysis.rhythmic.bpm,
        key: analysis.harmonic.key,
        energy: analysis.rhythmic.beat_confidence || 0.5,
        spectral_characteristics: analysis.spectral || {}
      };
      
    } catch (error) {
      console.error(`Analysis failed for song ${song.name} (${song.song_id}):`, error);
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        throw new Error(`Audio analysis timed out for "${song.name}". The file may be too large or complex to analyze.`);
      }
      
      if (error.message.includes('Invalid song data')) {
        throw error; // Already has good error message
      }
      
      throw new Error(`Failed to analyze "${song.name}": ${error.message}`);
    }
  }, `Audio analysis for ${song.name}`, 'analysis');
}

/**
 * Call mashability scoring service with comprehensive error handling
 */
async function calculateMashabilityScores(analyses: AnalysisResult[]): Promise<MashabilityScore[]> {
  // Validate minimum required analyses
  if (!analyses || analyses.length < 2) {
    throw new Error('At least 2 song analyses are required for mashability scoring');
  }

  // Validate that all analyses have required fields
  for (const analysis of analyses) {
    if (!analysis.song_id || typeof analysis.tempo !== 'number' || !analysis.key) {
      throw new Error(`Invalid analysis data for song ${analysis.song_id}: missing required fields (tempo, key)`);
    }
    
    if (!analysis.spectral_characteristics) {
      throw new Error(`Invalid analysis data for song ${analysis.song_id}: missing spectral characteristics`);
    }
  }

  if (!isServiceAvailable('scoring')) {
    handleServiceUnavailable('mashability scoring', 
      'The mashability scoring service is temporarily unavailable. Please try again in a few minutes.');
  }

  return retryWithBackoff(async () => {
    try {
      console.log(`Calculating mashability scores for ${analyses.length} songs`);
      
      const scores: MashabilityScore[] = [];
      const expectedPairs = (analyses.length * (analyses.length - 1)) / 2;
      
      console.log(`Will calculate ${expectedPairs} song pair compatibility scores`);
      
      // Calculate scores for all pairs
      for (let i = 0; i < analyses.length; i++) {
        for (let j = i + 1; j < analyses.length; j++) {
          const analysis1 = analyses[i];
          const analysis2 = analyses[j];
          
          try {
            console.log(`Calculating compatibility between songs ${analysis1.song_id} and ${analysis2.song_id}`);
            
            const requestBody = {
              song1_analysis: {
                harmonic: { key: analysis1.key, chord_complexity: 0.5 },
                rhythmic: { 
                  bpm: analysis1.tempo, 
                  beat_confidence: analysis1.energy, 
                  groove_stability: 0.5, 
                  swing_factor: 0.0 
                },
                spectral: analysis1.spectral_characteristics,
                vocal: { vocal_presence: 0.5 }
              },
              song2_analysis: {
                harmonic: { key: analysis2.key, chord_complexity: 0.5 },
                rhythmic: { 
                  bpm: analysis2.tempo, 
                  beat_confidence: analysis2.energy, 
                  groove_stability: 0.5, 
                  swing_factor: 0.0 
                },
                spectral: analysis2.spectral_characteristics,
                vocal: { vocal_presence: 0.5 }
              }
            };
            
            const response = await makeServiceRequest(
              `${SERVICE_ENDPOINTS.scoring}/calculate-mashability`, 
              {
                method: 'POST',
                body: JSON.stringify(requestBody)
              },
              TIMEOUT_CONFIG.scoring,
              'scoring'
            );
            
            const result = await response.json();
            
            // Validate scoring service response
            if (!result) {
              throw new Error('Empty response from scoring service');
            }
            
            if (typeof result.overall_score !== 'number') {
              throw new Error(`Invalid scoring response: missing or invalid overall_score (got ${typeof result.overall_score})`);
            }
            
            if (result.overall_score < 0 || result.overall_score > 100) {
              throw new Error(`Invalid scoring response: overall_score out of range (${result.overall_score})`);
            }
            
            console.log(`Compatibility score for ${analysis1.song_id}-${analysis2.song_id}: ${result.overall_score}`);
            
            scores.push({
              song_pair: [analysis1.song_id, analysis2.song_id],
              score: result.overall_score,
              compatibility_factors: result.compatibility_breakdown || {}
            });
            
          } catch (pairError) {
            console.error(`Failed to calculate mashability score for songs ${analysis1.song_id} and ${analysis2.song_id}:`, pairError);
            
            // Provide specific error context
            if (pairError.message.includes('timeout')) {
              throw new Error(`Mashability scoring timed out for song pair ${analysis1.song_id}-${analysis2.song_id}. Please try again.`);
            }
            
            throw new Error(`Mashability scoring failed for song pair ${analysis1.song_id}-${analysis2.song_id}: ${pairError.message}`);
          }
        }
      }
      
      // Validate that we got scores for all expected pairs
      if (scores.length !== expectedPairs) {
        throw new Error(`Expected ${expectedPairs} mashability scores but got ${scores.length}. Some song pairs failed to score.`);
      }
      
      console.log(`Successfully calculated ${scores.length} mashability scores`);
      return scores;
      
    } catch (error) {
      console.error('Mashability scoring failed:', error);
      
      if (error.message.includes('Invalid analysis data')) {
        throw error; // Already has good error message
      }
      
      throw new Error(`Mashability scoring failed: ${error.message}`);
    }
  }, 'Mashability scoring', 'scoring');
}

/**
 * Call Claude AI orchestrator service to create masterplan with comprehensive error handling
 */
async function createMasterplan(analyses: AnalysisResult[], scores: MashabilityScore[]): Promise<Masterplan> {
  if (!isServiceAvailable('orchestrator')) {
    handleServiceUnavailable('Claude AI orchestrator', 
      'The AI masterplan generation service is temporarily unavailable. Please try again in a few minutes.');
  }
  
  return retryWithBackoff(async () => {
    try {
      console.log(`Creating masterplan with ${analyses.length} analyses and ${scores.length} scores`);
      
      // Validate input data
      if (!analyses || analyses.length < 2) {
        throw new Error('At least 2 song analyses are required for masterplan creation');
      }
      
      if (!scores || scores.length === 0) {
        throw new Error('At least 1 mashability score is required for masterplan creation');
      }
      
      // Use the first two analyses for the masterplan
      const song1Analysis = analyses[0];
      const song2Analysis = analyses[1];
      
      // Find the mashability score for these two songs
      const mashabilityScore = scores.find(s => 
        (s.song_pair[0] === song1Analysis.song_id && s.song_pair[1] === song2Analysis.song_id) ||
        (s.song_pair[1] === song1Analysis.song_id && s.song_pair[0] === song2Analysis.song_id)
      );
      
      if (!mashabilityScore) {
        console.warn(`No mashability score found for songs ${song1Analysis.song_id} and ${song2Analysis.song_id}, using default`);
      }
      
      console.log(`Creating masterplan for songs ${song1Analysis.song_id} and ${song2Analysis.song_id} with compatibility score ${mashabilityScore?.score || 75}`);
      
      const requestBody = {
        song1_analysis: {
          harmonic: { key: song1Analysis.key, chord_complexity: 0.5 },
          rhythmic: { 
            bpm: song1Analysis.tempo, 
            beat_confidence: song1Analysis.energy, 
            groove_stability: 0.5, 
            swing_factor: 0.0 
          },
          spectral: song1Analysis.spectral_characteristics,
          vocal: { vocal_presence: 0.5 }
        },
        song2_analysis: {
          harmonic: { key: song2Analysis.key, chord_complexity: 0.5 },
          rhythmic: { 
            bpm: song2Analysis.tempo, 
            beat_confidence: song2Analysis.energy, 
            groove_stability: 0.5, 
            swing_factor: 0.0 
          },
          spectral: song2Analysis.spectral_characteristics,
          vocal: { vocal_presence: 0.5 }
        },
        mashability_score: mashabilityScore || { overall_score: 75, compatibility_breakdown: {} },
        user_preferences: {}
      };
      
      const response = await makeServiceRequest(
        `${SERVICE_ENDPOINTS.orchestrator}/create-masterplan`, 
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        },
        TIMEOUT_CONFIG.orchestrator,
        'orchestrator'
      );
      
      const result = await response.json();
      
      // Validate masterplan response
      if (!result) {
        throw new Error('Empty response from Claude AI orchestrator service');
      }
      
      if (!result.creative_vision || typeof result.creative_vision !== 'string') {
        throw new Error('Invalid masterplan response: missing or invalid creative_vision');
      }
      
      if (!result.masterplan || typeof result.masterplan !== 'object') {
        throw new Error('Invalid masterplan response: missing or invalid masterplan object');
      }
      
      const masterplan = result.masterplan;
      
      // Validate required masterplan fields
      if (!masterplan.title || typeof masterplan.title !== 'string') {
        throw new Error('Invalid masterplan response: missing or invalid title');
      }
      
      if (!masterplan.timeline || !Array.isArray(masterplan.timeline)) {
        throw new Error('Invalid masterplan response: missing or invalid timeline');
      }
      
      if (masterplan.timeline.length === 0) {
        throw new Error('Invalid masterplan response: empty timeline');
      }
      
      // Validate timeline entries
      for (let i = 0; i < masterplan.timeline.length; i++) {
        const entry = masterplan.timeline[i];
        if (typeof entry.time_start_sec !== 'number' || typeof entry.duration_sec !== 'number') {
          throw new Error(`Invalid masterplan response: timeline entry ${i} missing time information`);
        }
      }
      
      console.log(`Successfully created masterplan: "${masterplan.title}" with ${masterplan.timeline.length} timeline entries`);
      
      return result as Masterplan;
      
    } catch (error) {
      console.error('Masterplan creation failed:', error);
      
      if (error.message.includes('timeout')) {
        throw new Error('Claude AI masterplan generation timed out. The AI may be processing complex musical relationships. Please try again.');
      }
      
      if (error.message.includes('Invalid masterplan response')) {
        throw error; // Already has good error message
      }
      
      throw new Error(`Failed to create masterplan: ${error.message}`);
    }
  }, 'Claude AI masterplan creation', 'orchestrator');
}

/**
 * Call audio processing service to render the final mashup with comprehensive error handling
 */
async function renderMashup(masterplan: Masterplan, songs: Song[], jobId: string): Promise<string> {
  if (!isServiceAvailable('processing')) {
    handleServiceUnavailable('audio processing', 
      'The audio rendering service is temporarily unavailable. Please try again in a few minutes.');
  }
  
  return retryWithBackoff(async () => {
    try {
      console.log(`Starting audio rendering for job ${jobId} with ${songs.length} songs`);
      
      // Validate input data
      if (!masterplan || !masterplan.masterplan || !masterplan.masterplan.timeline) {
        throw new Error('Invalid masterplan data for audio rendering');
      }
      
      if (!songs || songs.length === 0) {
        throw new Error('No songs provided for audio rendering');
      }
      
      // Prepare song data with analysis results from job state
      const jobState = JobStateManager.getJob(jobId);
      if (!jobState) {
        throw new Error(`Job state not found for job ${jobId}`);
      }
      
      const songsWithAnalysis = songs.map(song => {
        const analysis = jobState.analyses?.find(a => a.song_id === song.song_id);
        if (!analysis) {
          console.warn(`No analysis found for song ${song.song_id}, using defaults`);
        }
        
        return {
          song_id: song.song_id,
          storage_path: song.storage_path,
          analysis: analysis ? {
            harmonic: { key: analysis.key, chord_complexity: 0.5 },
            rhythmic: { 
              bpm: analysis.tempo, 
              beat_confidence: analysis.energy, 
              groove_stability: 0.5, 
              swing_factor: 0.0 
            },
            spectral: analysis.spectral_characteristics,
            vocal: { vocal_presence: 0.5 }
          } : {
            harmonic: { key: 'C', chord_complexity: 0.5 },
            rhythmic: { bpm: 120, beat_confidence: 0.5, groove_stability: 0.5, swing_factor: 0.0 },
            spectral: {},
            vocal: { vocal_presence: 0.5 }
          }
        };
      });
      
      console.log(`Prepared ${songsWithAnalysis.length} songs with analysis data for rendering`);
      
      const requestBody = {
        masterplan: {
          timeline: masterplan.masterplan.timeline,
          global_settings: masterplan.masterplan.global
        },
        songs: songsWithAnalysis,
        job_id: jobId
      };
      
      const response = await makeServiceRequest(
        `${SERVICE_ENDPOINTS.processing}/execute-masterplan`, 
        {
          method: 'POST',
          body: JSON.stringify(requestBody)
        },
        TIMEOUT_CONFIG.processing,
        'processing'
      );
      
      // Handle streaming response from processing service
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from processing service - streaming not supported');
      }
      
      let finalStoragePath = '';
      let lastProgress = 80; // Start from 80% since we're in the rendering phase
      let hasReceivedData = false;
      
      try {
        const decoder = new TextDecoder();
        let buffer = '';
        const startTime = Date.now();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          hasReceivedData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                // Handle errors from processing service
                if (data.error) {
                  console.error(`Processing service error: ${data.error}`);
                  throw new Error(`Audio rendering failed: ${data.error}`);
                }
                
                // Handle progress updates
                if (data.progress !== undefined && data.message) {
                  // Map processing service progress (0-100) to our job progress (80-100)
                  const mappedProgress = Math.min(100, 80 + (data.progress * 0.2));
                  lastProgress = mappedProgress;
                  
                  console.log(`Rendering progress: ${data.progress}% - ${data.message}`);
                  JobStateManager.updateProgress(jobId, mappedProgress, data.message);
                }
                
                // Handle completion with storage path
                if (data.storage_path) {
                  finalStoragePath = data.storage_path;
                  console.log(`Audio rendering completed, file stored at: ${finalStoragePath}`);
                }
                
                // Handle stem separation progress specifically
                if (data.message && data.message.includes('Separating stems')) {
                  console.log(`Stem separation in progress: ${data.message}`);
                }
                
                // Handle warnings (non-fatal issues)
                if (data.warning) {
                  console.warn(`Processing service warning: ${data.warning}`);
                }
                
              } catch (parseError) {
                // Log but don't fail on JSON parse errors - some lines might not be JSON
                console.warn(`Failed to parse streaming response line: ${line}`, parseError);
              }
            }
          }
          
          // Check for timeout during streaming
          const elapsed = Date.now() - startTime;
          if (elapsed > TIMEOUT_CONFIG.processing) {
            throw new Error(`Audio rendering timed out after ${Math.round(elapsed / 1000)} seconds`);
          }
        }
        
        // Process any remaining buffer content
        if (buffer.trim() && buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.storage_path) {
              finalStoragePath = data.storage_path;
            }
            if (data.error) {
              throw new Error(`Audio rendering failed: ${data.error}`);
            }
          } catch (parseError) {
            console.warn(`Failed to parse final buffer content: ${buffer}`, parseError);
          }
        }
        
      } catch (streamError) {
        console.error(`Error reading streaming response: ${streamError}`);
        
        if (streamError.message.includes('timeout')) {
          throw streamError; // Already has good error message
        }
        
        throw new Error(`Failed to process streaming response: ${streamError.message}`);
      } finally {
        reader.releaseLock();
      }
      
      // Validate that we received data from the stream
      if (!hasReceivedData) {
        throw new Error('No data received from processing service - the service may be unresponsive');
      }
      
      // Validate that we received a final storage path
      if (!finalStoragePath) {
        throw new Error('Audio rendering completed but no storage path was returned from processing service');
      }
      
      // Verify the file was actually uploaded by checking if it exists
      try {
        const pathParts = finalStoragePath.split('/');
        const fileName = pathParts.pop();
        const folderPath = pathParts.join('/');
        
        const { data, error } = await supabase.storage
          .from('mashups')
          .list(folderPath || '');
          
        if (error) {
          console.warn(`Could not verify file upload: ${error.message}`);
        } else {
          const fileExists = data?.some(file => file.name === fileName);
          if (!fileExists) {
            throw new Error(`Rendered audio file not found in storage: ${finalStoragePath}`);
          }
          
          console.log(`Successfully verified rendered file exists in storage: ${finalStoragePath}`);
        }
      } catch (verificationError) {
        console.warn(`File verification failed: ${verificationError.message}`);
        // Don't fail the entire process for verification errors, but log it
      }
      
      console.log(`Audio rendering successfully completed for job ${jobId}`);
      return finalStoragePath;
      
    } catch (error) {
      console.error(`Audio rendering failed for job ${jobId}:`, error);
      
      if (error.message.includes('timeout')) {
        throw new Error(`Audio rendering timed out. This can happen with complex mashups or large audio files. Please try again with shorter songs or simpler arrangements.`);
      }
      
      if (error.message.includes('Invalid masterplan data')) {
        throw error; // Already has good error message
      }
      
      throw new Error(`Audio rendering failed: ${error.message}`);
    }
  }, 'Audio rendering', 'processing');
}

/**
 * Background processing chain that orchestrates all services with comprehensive error handling
 */
async function processBackground(jobId: string, songs: Song[]) {
  const startTime = Date.now();
  let currentPhase = 'initialization';
  
  try {
    console.log(`Starting background processing for job ${jobId} with ${songs.length} songs`);
    
    // Validate input data
    if (!songs || songs.length < 2) {
      throw new Error('At least 2 songs are required for mashup generation');
    }
    
    if (songs.length > 3) {
      throw new Error('Maximum 3 songs supported for mashup generation');
    }
    
    // Validate each song has required data
    for (const song of songs) {
      if (!song.song_id || !song.storage_path || !song.name) {
        throw new Error(`Invalid song data: song ${song.song_id || 'unknown'} is missing required fields`);
      }
    }
    
    // Phase 1: Audio Analysis
    currentPhase = 'audio_analysis';
    JobStateManager.updateProgress(jobId, 5, '🎵 Starting audio analysis...');
    
    const analyses: AnalysisResult[] = [];
    const analysisErrors: string[] = [];
    
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const progressBase = 5 + (i * 25); // Distribute 25% progress per song (up to 3 songs = 75%)
      const progressEnd = progressBase + 20;
      
      try {
        JobStateManager.updateProgress(jobId, progressBase, `🔍 Analyzing "${song.name}" (${i + 1}/${songs.length})...`);
        
        // Add intermediate progress updates during analysis
        setTimeout(() => {
          JobStateManager.updateProgress(jobId, progressBase + 5, `🎼 Extracting musical features from "${song.name}"...`);
        }, 1000);
        
        setTimeout(() => {
          JobStateManager.updateProgress(jobId, progressBase + 10, `🎹 Analyzing tempo and key of "${song.name}"...`);
        }, 3000);
        
        const analysis = await analyzeSong(song);
        analyses.push(analysis);
        JobStateManager.addAnalysis(jobId, analysis);
        
        JobStateManager.updateProgress(jobId, progressEnd, `✅ Analyzed "${song.name}" - BPM: ${analysis.tempo}, Key: ${analysis.key}`);
        console.log(`Successfully analyzed song ${i + 1}/${songs.length}: ${song.name} (BPM: ${analysis.tempo}, Key: ${analysis.key})`);
        
      } catch (analysisError) {
        const errorMsg = `Failed to analyze "${song.name}": ${analysisError.message}`;
        analysisErrors.push(errorMsg);
        console.error(errorMsg);
        
        JobStateManager.updateProgress(jobId, progressBase + 15, `⚠️ Could not analyze "${song.name}" - continuing with other tracks...`);
        
        // If we can't analyze any songs, fail immediately
        if (analyses.length === 0 && i === songs.length - 1) {
          throw new Error(`Could not analyze any songs. Last error: ${analysisError.message}`);
        }
        
        // If we have at least 2 successful analyses, continue
        if (analyses.length >= 2) {
          console.warn(`Continuing with ${analyses.length} successful analyses despite error with "${song.name}"`);
          break;
        }
      }
    }
    
    // Validate we have enough analyses before proceeding
    if (analyses.length < 2) {
      const errorSummary = analysisErrors.length > 0 
        ? `Analysis errors: ${analysisErrors.join('; ')}`
        : 'Unknown analysis errors';
      throw new Error(`Insufficient analyses for mashability scoring: got ${analyses.length}, need at least 2. ${errorSummary}`);
    }
    
    console.log(`Phase 1 complete: Successfully analyzed ${analyses.length}/${songs.length} songs`);
    
    // Phase 2: Mashability Scoring
    currentPhase = 'mashability_scoring';
    JobStateManager.updateProgress(jobId, 60, '🧮 Calculating song compatibility scores...');
    
    let scores: MashabilityScore[];
    try {
      // Add intermediate progress for scoring
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 65, '🎯 Analyzing harmonic compatibility...');
      }, 500);
      
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 68, '🥁 Checking rhythmic alignment...');
      }, 1500);
      
      scores = await calculateMashabilityScores(analyses);
      JobStateManager.setMashabilityScores(jobId, scores);
      
      // Find the best compatibility score to show user
      const bestScore = Math.max(...scores.map(s => s.score));
      JobStateManager.updateProgress(jobId, 70, `✅ Compatibility analysis complete - Best match: ${Math.round(bestScore)}%`);
      
      console.log(`Phase 2 complete: Calculated ${scores.length} mashability scores for job ${jobId}, best: ${bestScore}%`);
    } catch (scoringError) {
      console.error(`Mashability scoring failed for job ${jobId}:`, scoringError);
      throw new Error(`Failed to calculate song compatibility: ${scoringError.message}`);
    }
    
    // Phase 3: Creative Masterplan
    currentPhase = 'masterplan_generation';
    JobStateManager.updateProgress(jobId, 72, '🤖 Claude AI is creating your masterplan...');
    
    let masterplan: Masterplan;
    try {
      // Add intermediate progress for AI generation
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 75, '🎨 AI analyzing musical relationships...');
      }, 1000);
      
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 78, '✨ Generating creative concept and timeline...');
      }, 3000);
      
      masterplan = await createMasterplan(analyses, scores);
      JobStateManager.setMasterplan(jobId, masterplan);
      
      JobStateManager.updateProgress(jobId, 82, `🎭 Masterplan created: "${masterplan.masterplan.title}"`);
      console.log(`Phase 3 complete: Generated masterplan "${masterplan.masterplan.title}" for job ${jobId}`);
    } catch (masterplanError) {
      console.error(`Masterplan generation failed for job ${jobId}:`, masterplanError);
      throw new Error(`Failed to generate creative masterplan: ${masterplanError.message}`);
    }
    
    // Phase 4: Audio Rendering
    currentPhase = 'audio_rendering';
    JobStateManager.updateProgress(jobId, 85, '🎧 Starting audio rendering...');
    
    let resultUrl: string;
    try {
      // Use only the songs that were successfully analyzed
      const analyzedSongs = songs.filter(song => 
        analyses.some(analysis => analysis.song_id === song.song_id)
      );
      
      // Add intermediate progress for rendering phases
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 88, '🎵 Separating audio stems...');
      }, 2000);
      
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 92, '🎛️ Applying effects and transitions...');
      }, 8000);
      
      setTimeout(() => {
        JobStateManager.updateProgress(jobId, 96, '🎼 Mixing final audio...');
      }, 15000);
      
      resultUrl = await renderMashup(masterplan, analyzedSongs, jobId);
      
      JobStateManager.updateProgress(jobId, 99, '🎉 Finalizing your mashup...');
      console.log(`Phase 4 complete: Audio rendering completed for job ${jobId}, result: ${resultUrl}`);
    } catch (renderingError) {
      console.error(`Audio rendering failed for job ${jobId}:`, renderingError);
      throw new Error(`Failed to render final mashup: ${renderingError.message}`);
    }
    
    // Complete the job
    JobStateManager.updateProgress(jobId, 100, `🎊 Mashup complete: "${masterplan.masterplan.title}"!`);
    JobStateManager.completeJob(jobId, resultUrl, masterplan);
    
    const totalTime = Date.now() - startTime;
    console.log(`Background processing completed successfully for job ${jobId} in ${Math.round(totalTime / 1000)} seconds`);
    
    // Log any warnings about partial failures
    if (analysisErrors.length > 0) {
      console.warn(`Job ${jobId} completed with warnings: ${analysisErrors.join('; ')}`);
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Background processing failed for job ${jobId} in phase ${currentPhase} after ${Math.round(totalTime / 1000)} seconds:`, error);
    
    // Provide phase-specific error messages
    let userFriendlyError = error.message;
    
    switch (currentPhase) {
      case 'initialization':
        userFriendlyError = `Setup failed: ${error.message}`;
        break;
      case 'audio_analysis':
        userFriendlyError = `Audio analysis failed: ${error.message}. Please check that your audio files are valid and try again.`;
        break;
      case 'mashability_scoring':
        userFriendlyError = `Compatibility analysis failed: ${error.message}. This may be due to complex audio content.`;
        break;
      case 'masterplan_generation':
        userFriendlyError = `AI masterplan generation failed: ${error.message}. Please try again.`;
        break;
      case 'audio_rendering':
        userFriendlyError = `Audio rendering failed: ${error.message}. This may be due to complex arrangements or large files.`;
        break;
    }
    
    JobStateManager.failJob(jobId, userFriendlyError);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStart = Date.now();
  let jobId: string | undefined;

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          details: 'Only POST requests are supported for mashup generation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      );
    }

    // Parse request body with error handling
    let requestBody: MashupRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: 'Request body must be valid JSON with a "songs" array'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { songs } = requestBody;

    // Comprehensive input validation
    if (!songs) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing songs data',
          details: 'Request must include a "songs" array'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!Array.isArray(songs)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid songs data',
          details: 'Songs must be an array'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (songs.length < 2) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient songs',
          details: 'Please provide at least 2 songs for mashup generation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (songs.length > 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many songs',
          details: 'Maximum 3 songs supported for mashup generation'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate each song's data
    const songValidationErrors: string[] = [];
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const songIndex = i + 1;
      
      if (!song || typeof song !== 'object') {
        songValidationErrors.push(`Song ${songIndex}: must be an object`);
        continue;
      }
      
      if (!song.song_id || typeof song.song_id !== 'string') {
        songValidationErrors.push(`Song ${songIndex}: missing or invalid song_id`);
      }
      
      if (!song.storage_path || typeof song.storage_path !== 'string') {
        songValidationErrors.push(`Song ${songIndex}: missing or invalid storage_path`);
      }
      
      if (!song.name || typeof song.name !== 'string') {
        songValidationErrors.push(`Song ${songIndex}: missing or invalid name`);
      }
      
      // Validate storage path format
      if (song.storage_path && !song.storage_path.includes('/')) {
        songValidationErrors.push(`Song ${songIndex}: storage_path appears to be invalid format`);
      }
    }

    if (songValidationErrors.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid song data',
          details: songValidationErrors.join('; ')
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check system capacity (basic rate limiting)
    const currentJobs = JobStateManager.getJobCount();
    const MAX_CONCURRENT_JOBS = 10; // Configurable limit
    
    if (currentJobs >= MAX_CONCURRENT_JOBS) {
      return new Response(
        JSON.stringify({ 
          error: 'System at capacity',
          details: `Too many concurrent mashup jobs (${currentJobs}/${MAX_CONCURRENT_JOBS}). Please try again in a few minutes.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Generate a unique job ID
    jobId = crypto.randomUUID();

    // Create job state with initial status
    let jobState: any;
    try {
      jobState = JobStateManager.createJob(jobId, songs);
    } catch (jobCreationError) {
      console.error(`Failed to create job state for ${jobId}:`, jobCreationError);
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize mashup job',
          details: 'Could not create job tracking. Please try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Created mashup generation job ${jobId} with ${songs.length} songs: ${songs.map(s => s.name).join(', ')}`);

    // Start background processing (fire and forget with enhanced error handling)
    processBackground(jobId, songs).catch(error => {
      console.error(`Background processing error for job ${jobId}:`, error);
      // The error is already handled in processBackground by calling JobStateManager.failJob
    });

    const requestTime = Date.now() - requestStart;
    console.log(`Successfully started mashup job ${jobId} in ${requestTime}ms`);

    // Return job ID immediately for polling
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        message: `Mashup job started successfully with ${songs.length} songs`,
        status: jobState.status,
        progress: jobState.progress,
        estimated_duration: '2-5 minutes', // Rough estimate
        songs_count: songs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const requestTime = Date.now() - requestStart;
    console.error(`Error in generate-mashup function after ${requestTime}ms:`, error);
    
    // If we have a job ID, mark it as failed
    if (jobId) {
      try {
        JobStateManager.failJob(jobId, `System error: ${error.message}`);
      } catch (failJobError) {
        console.error(`Failed to mark job ${jobId} as failed:`, failJobError);
      }
    }
    
    // Provide user-friendly error messages based on error type
    let userError = 'An unexpected error occurred while starting mashup generation';
    let statusCode = 500;
    
    if (error.message.includes('network') || error.message.includes('connection')) {
      userError = 'Network connectivity issue. Please check your connection and try again.';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      userError = 'Request timed out. Please try again.';
      statusCode = 408;
    } else if (error.message.includes('capacity') || error.message.includes('limit')) {
      userError = 'System is currently at capacity. Please try again in a few minutes.';
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({
        error: userError,
        details: error.message,
        timestamp: new Date().toISOString(),
        ...(jobId && { jobId })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
    );
  }
});