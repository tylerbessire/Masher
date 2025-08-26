/**
 * Test suite for JobStateManager
 * 
 * Run with: deno test --allow-all jobStateManager.test.ts
 */

import { assertEquals, assertNotEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { JobStateManager, Song, JobState } from './jobStateManager.ts';

// Test data
const testSongs: Song[] = [
  {
    song_id: 'song1',
    name: 'Test Song 1',
    artist: 'Test Artist 1',
    storage_path: '/path/to/song1.mp3'
  },
  {
    song_id: 'song2', 
    name: 'Test Song 2',
    artist: 'Test Artist 2',
    storage_path: '/path/to/song2.mp3'
  }
];

Deno.test("JobStateManager - Create Job", () => {
  const jobId = crypto.randomUUID();
  const jobState = JobStateManager.createJob(jobId, testSongs);

  assertEquals(jobState.jobId, jobId);
  assertEquals(jobState.status, 'processing');
  assertEquals(jobState.progress, 0);
  assertEquals(jobState.songs.length, 2);
  assertEquals(jobState.currentStep, 'Initializing mashup generation...');
  assert(jobState.created_at instanceof Date);
  assert(jobState.updated_at instanceof Date);
});

Deno.test("JobStateManager - Get Job", () => {
  const jobId = crypto.randomUUID();
  
  // Job should not exist initially
  assertEquals(JobStateManager.getJob(jobId), null);
  
  // Create job
  const createdJob = JobStateManager.createJob(jobId, testSongs);
  
  // Job should now exist
  const retrievedJob = JobStateManager.getJob(jobId);
  assertEquals(retrievedJob?.jobId, jobId);
  assertEquals(retrievedJob?.songs.length, 2);
});

Deno.test("JobStateManager - Update Job", () => {
  const jobId = crypto.randomUUID();
  
  // Create job
  JobStateManager.createJob(jobId, testSongs);
  
  // Update job progress
  const updatedJob = JobStateManager.updateProgress(jobId, 50, 'Processing audio analysis...');
  
  assertEquals(updatedJob?.progress, 50);
  assertEquals(updatedJob?.currentStep, 'Processing audio analysis...');
  assertNotEquals(updatedJob?.updated_at, updatedJob?.created_at);
});

Deno.test("JobStateManager - Complete Job", () => {
  const jobId = crypto.randomUUID();
  
  // Create job
  JobStateManager.createJob(jobId, testSongs);
  
  // Complete job
  const completedJob = JobStateManager.completeJob(jobId, 'https://example.com/mashup.mp3');
  
  assertEquals(completedJob?.status, 'complete');
  assertEquals(completedJob?.progress, 100);
  assertEquals(completedJob?.result_url, 'https://example.com/mashup.mp3');
  assertEquals(completedJob?.currentStep, 'Mashup generation complete!');
});

Deno.test("JobStateManager - Fail Job", () => {
  const jobId = crypto.randomUUID();
  
  // Create job
  JobStateManager.createJob(jobId, testSongs);
  
  // Fail job
  const failedJob = JobStateManager.failJob(jobId, 'Audio analysis service unavailable');
  
  assertEquals(failedJob?.status, 'failed');
  assertEquals(failedJob?.error_message, 'Audio analysis service unavailable');
  assertEquals(failedJob?.currentStep, 'Mashup generation failed');
});

Deno.test("JobStateManager - Add Analysis", () => {
  const jobId = crypto.randomUUID();
  
  // Create job
  JobStateManager.createJob(jobId, testSongs);
  
  // Add analysis for first song
  const analysis1 = {
    song_id: 'song1',
    tempo: 120,
    key: 'C',
    energy: 0.8,
    spectral_characteristics: {}
  };
  
  const updatedJob = JobStateManager.addAnalysis(jobId, analysis1);
  
  assertEquals(updatedJob?.analyses?.length, 1);
  assertEquals(updatedJob?.analyses?.[0].song_id, 'song1');
  assertEquals(updatedJob?.progress, 25); // 1/2 songs = 50% of 50% = 25%
  assertEquals(updatedJob?.currentStep, 'Analyzed 1/2 songs');
});

Deno.test("JobStateManager - Concurrent Jobs", () => {
  const jobId1 = crypto.randomUUID();
  const jobId2 = crypto.randomUUID();
  
  // Create multiple jobs
  const job1 = JobStateManager.createJob(jobId1, testSongs);
  const job2 = JobStateManager.createJob(jobId2, testSongs);
  
  // Both jobs should exist independently
  assertEquals(job1.jobId, jobId1);
  assertEquals(job2.jobId, jobId2);
  
  // Update one job shouldn't affect the other
  JobStateManager.updateProgress(jobId1, 50, 'Processing...');
  
  const retrievedJob1 = JobStateManager.getJob(jobId1);
  const retrievedJob2 = JobStateManager.getJob(jobId2);
  
  assertEquals(retrievedJob1?.progress, 50);
  assertEquals(retrievedJob2?.progress, 0);
});

Deno.test("JobStateManager - Delete Job", () => {
  const jobId = crypto.randomUUID();
  
  // Create job
  JobStateManager.createJob(jobId, testSongs);
  
  // Verify job exists
  assert(JobStateManager.getJob(jobId) !== null);
  
  // Delete job
  const deleted = JobStateManager.deleteJob(jobId);
  assertEquals(deleted, true);
  
  // Verify job no longer exists
  assertEquals(JobStateManager.getJob(jobId), null);
  
  // Deleting non-existent job should return false
  const deletedAgain = JobStateManager.deleteJob(jobId);
  assertEquals(deletedAgain, false);
});

Deno.test("JobStateManager - Get Job Count", () => {
  const initialCount = JobStateManager.getJobCount();
  
  const jobId1 = crypto.randomUUID();
  const jobId2 = crypto.randomUUID();
  
  JobStateManager.createJob(jobId1, testSongs);
  assertEquals(JobStateManager.getJobCount(), initialCount + 1);
  
  JobStateManager.createJob(jobId2, testSongs);
  assertEquals(JobStateManager.getJobCount(), initialCount + 2);
  
  JobStateManager.deleteJob(jobId1);
  assertEquals(JobStateManager.getJobCount(), initialCount + 1);
  
  JobStateManager.deleteJob(jobId2);
  assertEquals(JobStateManager.getJobCount(), initialCount);
});

console.log("All JobStateManager tests completed successfully!");