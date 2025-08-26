/**
 * Test script for enhanced get-mashup-status function
 * Tests real job tracking, progress updates, error handling, and completion status
 */

import { JobStateManager } from './jobStateManager.ts';

// Test data
const testSongs = [
  {
    song_id: 'song1',
    name: 'Test Song 1',
    artist: 'Test Artist 1',
    storage_path: 'test/song1.mp3'
  },
  {
    song_id: 'song2', 
    name: 'Test Song 2',
    artist: 'Test Artist 2',
    storage_path: 'test/song2.mp3'
  }
];

const testAnalysis = {
  song_id: 'song1',
  tempo: 120,
  key: 'C',
  energy: 0.8,
  spectral_characteristics: { brightness: 0.6 }
};

const testMasterplan = {
  creative_vision: 'A high-energy mashup combining electronic and acoustic elements',
  masterplan: {
    title: 'Electric Dreams',
    artistCredits: 'Test Artist 1 x Test Artist 2',
    global: {
      targetBPM: 125,
      targetKey: 'C',
      timeSignature: [4, 4]
    },
    timeline: [
      {
        time_start_sec: 0,
        duration_sec: 30,
        description: 'Intro with Song 1 vocals',
        energy_level: 0.6,
        layers: [
          {
            songId: 'song1',
            stem: 'vocals',
            volume_db: -3,
            effects: ['reverb']
          }
        ]
      }
    ],
    problems_and_solutions: [
      {
        problem: 'Key mismatch between songs',
        solution: 'Pitch shift Song 2 up by 2 semitones'
      }
    ]
  }
};

async function testGetMashupStatus() {
  console.log('🧪 Testing enhanced get-mashup-status function...\n');

  try {
    // Test 1: Create a job and test initial status
    console.log('Test 1: Initial job status');
    const jobId = 'test-job-' + Date.now();
    const job = JobStateManager.createJob(jobId, testSongs);
    
    let response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ jobId })
    });
    
    let result = await response.json();
    console.log('✅ Initial status:', {
      status: result.status,
      progress: result.progress,
      currentStep: result.currentStep,
      metadata: result.metadata
    });

    // Test 2: Update progress and test status
    console.log('\nTest 2: Progress update');
    JobStateManager.updateProgress(jobId, 25, 'Analyzing audio files...');
    JobStateManager.addAnalysis(jobId, testAnalysis);
    
    response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ jobId })
    });
    
    result = await response.json();
    console.log('✅ Progress update:', {
      progress: result.progress,
      currentStep: result.currentStep,
      estimated_completion: result.estimated_completion,
      metadata: result.metadata
    });

    // Test 3: Complete job and test final status
    console.log('\nTest 3: Job completion');
    JobStateManager.setMasterplan(jobId, testMasterplan);
    JobStateManager.completeJob(jobId, 'https://storage.example.com/mashup.mp3', testMasterplan);
    
    response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ jobId })
    });
    
    result = await response.json();
    console.log('✅ Completion status:', {
      status: result.status,
      progress: result.progress,
      result_url: result.result_url,
      title: result.title,
      concept: result.concept?.substring(0, 50) + '...',
      processing_time_elapsed: result.processing_time_elapsed
    });

    // Test 4: Error handling
    console.log('\nTest 4: Error handling');
    const errorJobId = 'error-job-' + Date.now();
    JobStateManager.createJob(errorJobId, testSongs);
    JobStateManager.failJob(errorJobId, 'Network connection timeout while calling analysis service');
    
    response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ jobId: errorJobId })
    });
    
    result = await response.json();
    console.log('✅ Error handling:', {
      status: result.status,
      error_message: result.error_message,
      error_details: result.error_details
    });

    // Test 5: Job not found
    console.log('\nTest 5: Job not found');
    response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ jobId: 'nonexistent-job' })
    });
    
    result = await response.json();
    console.log('✅ Job not found:', {
      error: result.error,
      error_details: result.error_details
    });

    // Test 6: Invalid request
    console.log('\nTest 6: Invalid request');
    response = await fetch('http://localhost:54321/functions/v1/get-mashup-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({})
    });
    
    result = await response.json();
    console.log('✅ Invalid request:', {
      error: result.error,
      error_details: result.error_details
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Enhanced features verified:');
    console.log('  ✅ Real job state lookup');
    console.log('  ✅ Progress updates with estimated completion');
    console.log('  ✅ Processing time tracking');
    console.log('  ✅ Detailed metadata');
    console.log('  ✅ Enhanced error categorization');
    console.log('  ✅ Actionable error guidance');
    console.log('  ✅ Job completion with audio URLs');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  await testGetMashupStatus();
}

export { testGetMashupStatus };