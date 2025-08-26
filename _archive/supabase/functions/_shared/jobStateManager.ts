/**
 * Job State Management System
 * 
 * Provides in-memory job state storage with automatic cleanup and concurrent handling
 * for mashup generation jobs.
 */

export interface Song {
  song_id: string;
  name: string;
  artist: string;
  storage_path: string;
}

export interface AnalysisResult {
  song_id: string;
  tempo: number;
  key: string;
  energy: number;
  spectral_characteristics: any;
  // Add other analysis fields as needed
}

export interface MashabilityScore {
  song_pair: [string, string];
  score: number;
  compatibility_factors: any;
}

export interface Masterplan {
  creative_vision: string;
  masterplan: {
    title: string;
    artistCredits: string;
    global: {
      targetBPM: number;
      targetKey: string;
      timeSignature: [number, number];
    };
    timeline: Array<{
      time_start_sec: number;
      duration_sec: number;
      description: string;
      energy_level: number;
      layers: Array<{
        songId: string;
        stem: string;
        volume_db: number;
        effects: string[];
      }>;
    }>;
    problems_and_solutions: Array<{
      problem: string;
      solution: string;
    }>;
  };
}

export interface JobState {
  jobId: string;
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  currentStep: string;
  songs: Song[];
  analyses?: AnalysisResult[];
  mashabilityScores?: MashabilityScore[];
  masterplan?: Masterplan;
  result_url?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * In-memory job state store with automatic cleanup and concurrent handling
 */
class JobStateStore {
  private jobs: Map<string, JobState> = new Map();
  private cleanupInterval: any = null;
  private readonly MAX_JOB_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Create a new job with initial state
   */
  createJob(jobId: string, songs: Song[]): JobState {
    const now = new Date();
    const jobState: JobState = {
      jobId,
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing mashup generation...',
      songs,
      created_at: now,
      updated_at: now,
    };

    this.jobs.set(jobId, jobState);
    console.log(`Created job ${jobId} with ${songs.length} songs`);
    return jobState;
  }

  /**
   * Get job state by ID
   */
  getJob(jobId: string): JobState | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Update job state with partial updates
   */
  updateJob(jobId: string, updates: Partial<Omit<JobState, 'jobId' | 'created_at'>>): JobState | null {
    const existingJob = this.jobs.get(jobId);
    if (!existingJob) {
      console.warn(`Attempted to update non-existent job ${jobId}`);
      return null;
    }

    const updatedJob: JobState = {
      ...existingJob,
      ...updates,
      updated_at: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    console.log(`Updated job ${jobId}: ${updates.currentStep || 'status update'}`);
    return updatedJob;
  }

  /**
   * Delete a specific job
   */
  deleteJob(jobId: string): boolean {
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      console.log(`Deleted job ${jobId}`);
    }
    return deleted;
  }

  /**
   * Get all active jobs (for monitoring/debugging)
   */
  getAllJobs(): JobState[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job count for monitoring
   */
  getJobCount(): number {
    return this.jobs.size;
  }

  /**
   * Start automatic cleanup of old jobs
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, this.CLEANUP_INTERVAL_MS);

    console.log('Started job state cleanup timer');
  }

  /**
   * Clean up jobs older than MAX_JOB_AGE_MS
   */
  private cleanupOldJobs(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.MAX_JOB_AGE_MS);
    let cleanedCount = 0;

    for (const [jobId, jobState] of this.jobs.entries()) {
      if (jobState.created_at < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old jobs. Active jobs: ${this.jobs.size}`);
    }
  }

  /**
   * Force cleanup of old jobs (can be called manually)
   */
  forceCleanup(): number {
    const initialCount = this.jobs.size;
    this.cleanupOldJobs();
    return initialCount - this.jobs.size;
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Stopped job state cleanup timer');
    }
  }
}

// Global singleton instance for concurrent job handling
const jobStateStore = new JobStateStore();

/**
 * Public API for job state management
 */
export const JobStateManager = {
  /**
   * Create a new mashup job
   */
  createJob: (jobId: string, songs: Song[]): JobState => {
    return jobStateStore.createJob(jobId, songs);
  },

  /**
   * Get job state by ID
   */
  getJob: (jobId: string): JobState | null => {
    return jobStateStore.getJob(jobId);
  },

  /**
   * Update job with new state information
   */
  updateJob: (jobId: string, updates: Partial<Omit<JobState, 'jobId' | 'created_at'>>): JobState | null => {
    return jobStateStore.updateJob(jobId, updates);
  },

  /**
   * Delete a job
   */
  deleteJob: (jobId: string): boolean => {
    return jobStateStore.deleteJob(jobId);
  },

  /**
   * Get all jobs (for monitoring)
   */
  getAllJobs: (): JobState[] => {
    return jobStateStore.getAllJobs();
  },

  /**
   * Get current job count
   */
  getJobCount: (): number => {
    return jobStateStore.getJobCount();
  },

  /**
   * Force cleanup of old jobs
   */
  forceCleanup: (): number => {
    return jobStateStore.forceCleanup();
  },

  /**
   * Update job progress with step information
   */
  updateProgress: (jobId: string, progress: number, currentStep: string): JobState | null => {
    return jobStateStore.updateJob(jobId, { progress, currentStep });
  },

  /**
   * Mark job as complete with results
   */
  completeJob: (jobId: string, result_url?: string, masterplan?: Masterplan): JobState | null => {
    return jobStateStore.updateJob(jobId, {
      status: 'complete',
      progress: 100,
      currentStep: 'Mashup generation complete!',
      result_url,
      masterplan,
    });
  },

  /**
   * Mark job as failed with error message and enhanced error details
   */
  failJob: (jobId: string, error_message: string): JobState | null => {
    // Sanitize error message to remove sensitive information
    const sanitizedError = error_message
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
      .replace(/password[=:]\s*[^\s&]+/gi, 'password=[REDACTED]')
      .replace(/key[=:]\s*[^\s&]+/gi, 'key=[REDACTED]');
    
    console.error(`Job ${jobId} failed: ${sanitizedError}`);
    
    return jobStateStore.updateJob(jobId, {
      status: 'failed',
      currentStep: 'Mashup generation failed',
      error_message: sanitizedError,
    });
  },

  /**
   * Add analysis results to job
   */
  addAnalysis: (jobId: string, analysis: AnalysisResult): JobState | null => {
    const job = jobStateStore.getJob(jobId);
    if (!job) return null;

    const analyses = job.analyses || [];
    analyses.push(analysis);

    return jobStateStore.updateJob(jobId, {
      analyses,
      progress: Math.min(50, (analyses.length / job.songs.length) * 50),
      currentStep: `Analyzed ${analyses.length}/${job.songs.length} songs`,
    });
  },

  /**
   * Set mashability scores for job
   */
  setMashabilityScores: (jobId: string, scores: MashabilityScore[]): JobState | null => {
    // Validate scores before storing
    if (!scores || scores.length === 0) {
      console.warn(`No mashability scores provided for job ${jobId}`);
      return null;
    }

    // Validate each score has required fields
    for (const score of scores) {
      if (!score.song_pair || score.song_pair.length !== 2 || typeof score.score !== 'number') {
        console.error(`Invalid mashability score format for job ${jobId}:`, score);
        return null;
      }
    }

    return jobStateStore.updateJob(jobId, {
      mashabilityScores: scores,
      progress: 60,
      currentStep: `Calculated ${scores.length} mashability scores`,
    });
  },

  /**
   * Set masterplan for job
   */
  setMasterplan: (jobId: string, masterplan: Masterplan): JobState | null => {
    return jobStateStore.updateJob(jobId, {
      masterplan,
      progress: 80,
      currentStep: 'Generated creative masterplan',
    });
  },

  /**
   * Check if a job exists and is in a valid state
   */
  isJobValid: (jobId: string): boolean => {
    const job = jobStateStore.getJob(jobId);
    return job !== null && job.status !== 'failed';
  },

  /**
   * Get job statistics for monitoring
   */
  getJobStats: () => {
    const jobs = jobStateStore.getAllJobs();
    return {
      total: jobs.length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'complete').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      oldest: jobs.length > 0 ? Math.min(...jobs.map(j => j.created_at.getTime())) : null,
      newest: jobs.length > 0 ? Math.max(...jobs.map(j => j.created_at.getTime())) : null
    };
  },
};

// Export the store instance for advanced usage if needed
export { jobStateStore };