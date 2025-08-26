/**
 * Simple test to verify mashability scoring integration
 */

import { JobStateManager } from './jobStateManager.ts';

// Test data
const testSongs = [
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

const testAnalyses = [
  {
    song_id: 'song1',
    tempo: 120,
    key: 'C',
    energy: 0.8,
    spectral_characteristics: { centroid: 1500, rolloff: 3000 }
  },
  {
    song_id: 'song2',
    tempo: 128,
    key: 'G',
    energy: 0.7,
    spectral_characteristics: { centroid: 1800, rolloff: 3500 }
  }
];

const testMashabilityScores = [
  {
    song_pair: ['song1', 'song2'],
    score: 75.5,
    compatibility_factors: {
      tempo_compatibility: 0.8,
      key_compatibility: 0.7,
      energy_compatibility: 0.9
    }
  }
];

function runTests() {
  console.log('Testing mashability scoring integration...');
  
  try {
    // Test 1: Create job and add analyses
    const jobId = crypto.randomUUID();
    const job = JobStateManager.createJob(jobId, testSongs);
    console.log('✓ Job created successfully');
    
    // Test 2: Add analyses
    for (const analysis of testAnalyses) {
      JobStateManager.addAnalysis(jobId, analysis);
    }
    console.log('✓ Analyses added successfully');
    
    // Test 3: Set mashability scores
    const updatedJob = JobStateManager.setMashabilityScores(jobId, testMashabilityScores);
    
    if (updatedJob && updatedJob.mashabilityScores && updatedJob.mashabilityScores.length === 1) {
      console.log('✓ Mashability scores set successfully');
      console.log(`  Score: ${updatedJob.mashabilityScores[0].score}`);
      console.log(`  Progress: ${updatedJob.progress}%`);
      console.log(`  Step: ${updatedJob.currentStep}`);
    } else {
      throw new Error('Failed to set mashability scores');
    }
    
    // Test 4: Test validation with invalid scores
    const invalidScores = [
      {
        song_pair: ['song1'], // Invalid: should have 2 songs
        score: 'invalid', // Invalid: should be number
        compatibility_factors: {}
      }
    ];
    
    const invalidResult = JobStateManager.setMashabilityScores(jobId, invalidScores);
    if (invalidResult === null) {
      console.log('✓ Validation correctly rejected invalid scores');
    } else {
      throw new Error('Validation should have rejected invalid scores');
    }
    
    // Test 5: Test with empty scores
    const emptyResult = JobStateManager.setMashabilityScores(jobId, []);
    if (emptyResult === null) {
      console.log('✓ Validation correctly rejected empty scores');
    } else {
      throw new Error('Validation should have rejected empty scores');
    }
    
    console.log('\n✅ All mashability scoring integration tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

// Run the tests
runTests();