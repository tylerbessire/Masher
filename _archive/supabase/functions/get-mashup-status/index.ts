import { JobStateManager } from '../_shared/jobStateManager.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface StatusRequest {
  jobId: string;
}

interface StatusResponse {
  jobId: string;
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  currentStep: string;
  created_at: Date;
  updated_at: Date;
  estimated_completion?: string;
  processing_time_elapsed?: string;
  error_message?: string;
  error_details?: {
    type: string;
    recoverable: boolean;
    suggested_action: string;
  };
  result_url?: string;
  title?: string;
  concept?: string;
  timeline?: any[];
  metadata?: {
    songs_count: number;
    analyses_completed: number;
    mashability_scores_count: number;
    has_masterplan: boolean;
  };
}

/**
 * Calculate estimated completion time based on current progress and elapsed time
 */
function calculateEstimatedCompletion(progress: number, elapsedMs: number): string | undefined {
  if (progress <= 0 || progress >= 100) return undefined;
  
  const estimatedTotalMs = (elapsedMs / progress) * 100;
  const remainingMs = estimatedTotalMs - elapsedMs;
  
  if (remainingMs <= 0) return undefined;
  
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
  
  if (remainingMinutes < 1) return 'Less than 1 minute';
  if (remainingMinutes === 1) return '1 minute';
  if (remainingMinutes < 60) return `${remainingMinutes} minutes`;
  
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  
  if (hours === 1 && minutes === 0) return '1 hour';
  if (hours === 1) return `1 hour ${minutes} minutes`;
  if (minutes === 0) return `${hours} hours`;
  return `${hours} hours ${minutes} minutes`;
}

/**
 * Format elapsed time in a human-readable format
 */
function formatElapsedTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Categorize and provide actionable guidance for different error types
 */
function categorizeError(errorMessage: string): StatusResponse['error_details'] {
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
    return {
      type: 'network_error',
      recoverable: true,
      suggested_action: 'Check your internet connection and try again. The system will automatically retry network failures.'
    };
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('corrupt') || lowerError.includes('format')) {
    return {
      type: 'audio_format_error',
      recoverable: false,
      suggested_action: 'Please check that your audio files are valid and in a supported format (MP3, WAV, M4A). Try re-uploading with different files.'
    };
  }
  
  if (lowerError.includes('service') || lowerError.includes('unavailable') || lowerError.includes('500')) {
    return {
      type: 'service_error',
      recoverable: true,
      suggested_action: 'One of our processing services is temporarily unavailable. Please try again in a few minutes.'
    };
  }
  
  if (lowerError.includes('analysis') || lowerError.includes('scoring')) {
    return {
      type: 'processing_error',
      recoverable: true,
      suggested_action: 'There was an issue analyzing your audio files. This may be due to complex audio content. Try with different songs or try again later.'
    };
  }
  
  return {
    type: 'unknown_error',
    recoverable: true,
    suggested_action: 'An unexpected error occurred. Please try again, and if the problem persists, contact support.'
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobId }: StatusRequest = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ 
          error: 'Job ID is required',
          error_details: {
            type: 'validation_error',
            recoverable: false,
            suggested_action: 'Please provide a valid job ID to check status.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Checking status for job ${jobId}`);

    // Get job state from the job state manager
    const jobState = JobStateManager.getJob(jobId);

    if (!jobState) {
      return new Response(
        JSON.stringify({ 
          error: 'Job not found',
          message: `No job found with ID ${jobId}. The job may have expired or never existed.`,
          error_details: {
            type: 'job_not_found',
            recoverable: false,
            suggested_action: 'Please check your job ID or start a new mashup generation. Jobs expire after 24 hours.'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Calculate timing information
    const now = new Date();
    const elapsedMs = now.getTime() - jobState.created_at.getTime();
    const processingTimeElapsed = formatElapsedTime(elapsedMs);
    const estimatedCompletion = jobState.status === 'processing' 
      ? calculateEstimatedCompletion(jobState.progress, elapsedMs)
      : undefined;

    // Build comprehensive response with real job tracking
    const response: StatusResponse = {
      jobId: jobState.jobId,
      status: jobState.status,
      progress: jobState.progress,
      currentStep: jobState.currentStep,
      created_at: jobState.created_at,
      updated_at: jobState.updated_at,
      processing_time_elapsed: processingTimeElapsed,
      ...(estimatedCompletion && { estimated_completion: estimatedCompletion }),
      
      // Enhanced error handling with actionable guidance
      ...(jobState.error_message && { 
        error_message: jobState.error_message,
        error_details: categorizeError(jobState.error_message)
      }),
      
      // Job completion with actual audio URLs and metadata
      ...(jobState.result_url && { result_url: jobState.result_url }),
      ...(jobState.masterplan && { 
        title: jobState.masterplan.masterplan.title,
        concept: jobState.masterplan.creative_vision,
        timeline: jobState.masterplan.masterplan.timeline
      }),
      
      // Detailed metadata about processing progress
      metadata: {
        songs_count: jobState.songs.length,
        analyses_completed: jobState.analyses?.length || 0,
        mashability_scores_count: jobState.mashabilityScores?.length || 0,
        has_masterplan: !!jobState.masterplan,
      }
    };

    console.log(`Job ${jobId} status: ${jobState.status}, progress: ${jobState.progress}%, step: ${jobState.currentStep}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking mashup status:', error);
    
    // Enhanced error response with actionable guidance
    return new Response(
      JSON.stringify({
        error: 'Failed to check mashup status',
        details: error.message,
        error_details: {
          type: 'system_error',
          recoverable: true,
          suggested_action: 'There was a system error checking your job status. Please try again in a moment.'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});