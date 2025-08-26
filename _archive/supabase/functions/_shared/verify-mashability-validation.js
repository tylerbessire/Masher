/**
 * Verification script for mashability scoring validation
 */

// Mock the calculateMashabilityScores function logic for testing
function validateAnalysesForMashability(analyses) {
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

  return true;
}

function runValidationTests() {
  console.log('Testing mashability scoring validation...');
  
  const validAnalyses = [
    {
      song_id: 'song1',
      tempo: 120,
      key: 'C',
      energy: 0.8,
      spectral_characteristics: { centroid: 1500 }
    },
    {
      song_id: 'song2',
      tempo: 128,
      key: 'G',
      energy: 0.7,
      spectral_characteristics: { centroid: 1800 }
    }
  ];

  try {
    // Test 1: Valid analyses should pass
    validateAnalysesForMashability(validAnalyses);
    console.log('✓ Valid analyses passed validation');

    // Test 2: Empty array should fail
    try {
      validateAnalysesForMashability([]);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.message.includes('At least 2 song analyses')) {
        console.log('✓ Empty array correctly rejected');
      } else {
        throw error;
      }
    }

    // Test 3: Single analysis should fail
    try {
      validateAnalysesForMashability([validAnalyses[0]]);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.message.includes('At least 2 song analyses')) {
        console.log('✓ Single analysis correctly rejected');
      } else {
        throw error;
      }
    }

    // Test 4: Missing tempo should fail
    try {
      const invalidAnalyses = [
        { ...validAnalyses[0], tempo: undefined },
        validAnalyses[1]
      ];
      validateAnalysesForMashability(invalidAnalyses);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.message.includes('missing required fields')) {
        console.log('✓ Missing tempo correctly rejected');
      } else {
        throw error;
      }
    }

    // Test 5: Missing key should fail
    try {
      const invalidAnalyses = [
        { ...validAnalyses[0], key: null },
        validAnalyses[1]
      ];
      validateAnalysesForMashability(invalidAnalyses);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.message.includes('missing required fields')) {
        console.log('✓ Missing key correctly rejected');
      } else {
        throw error;
      }
    }

    // Test 6: Missing spectral characteristics should fail
    try {
      const invalidAnalyses = [
        { ...validAnalyses[0], spectral_characteristics: null },
        validAnalyses[1]
      ];
      validateAnalysesForMashability(invalidAnalyses);
      throw new Error('Should have failed');
    } catch (error) {
      if (error.message.includes('missing spectral characteristics')) {
        console.log('✓ Missing spectral characteristics correctly rejected');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All validation tests passed!');

  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
    throw error;
  }
}

// Run the tests
runValidationTests();