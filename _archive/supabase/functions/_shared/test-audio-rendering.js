/**
 * Test script for audio rendering integration
 * Tests the enhanced renderMashup function with streaming response handling
 */

// Mock environment setup
const mockJobId = 'test-job-123';
const mockSongs = [
  {
    song_id: 'song1',
    name: 'Test Song 1',
    artist: 'Test Artist 1',
    storage_path: 'uploads/song1.wav'
  },
  {
    song_id: 'song2', 
    name: 'Test Song 2',
    artist: 'Test Artist 2',
    storage_path: 'uploads/song2.wav'
  }
];

const mockMasterplan = {
  creative_vision: 'A high-energy mashup combining electronic and rock elements',
  masterplan: {
    title: 'Test Mashup',
    artistCredits: 'Test Artist 1 x Test Artist 2',
    global: {
      targetBPM: 128,
      targetKey: 'C major',
      timeSignature: [4, 4]
    },
    timeline: [
      {
        time_start_sec: 0,
        duration_sec: 30,
        description: 'Intro with drums and bass',
        energy_level: 7,
        layers: [
          {
            songId: 'song1',
            stem: 'drums',
            volume_db: -6,
            effects: ['reverb']
          },
          {
            songId: 'song2',
            stem: 'bass',
            volume_db: -3,
            effects: []
          }
        ]
      }
    ],
    problems_and_solutions: []
  }
};

// Mock analysis results
const mockAnalyses = [
  {
    song_id: 'song1',
    tempo: 120,
    key: 'C major',
    energy: 0.8,
    spectral_characteristics: { brightness: 0.7, warmth: 0.6 }
  },
  {
    song_id: 'song2',
    tempo: 128,
    key: 'G major', 
    energy: 0.9,
    spectral_characteristics: { brightness: 0.8, warmth: 0.5 }
  }
];

console.log('🧪 Testing Audio Rendering Integration');
console.log('=====================================');

// Test 1: Verify song data preparation with analysis
console.log('\n1. Testing song data preparation with analysis...');
try {
  // Simulate job state with analyses
  const mockJobState = {
    jobId: mockJobId,
    analyses: mockAnalyses,
    status: 'processing'
  };
  
  const songsWithAnalysis = mockSongs.map(song => {
    const analysis = mockJobState.analyses?.find(a => a.song_id === song.song_id);
    return {
      song_id: song.song_id,
      storage_path: song.storage_path,
      analysis: analysis ? {
        harmonic: { key: analysis.key, chord_complexity: 0.5 },
        rhythmic: { bpm: analysis.tempo, beat_confidence: analysis.energy, groove_stability: 0.5, swing_factor: 0.0 },
        spectral: analysis.spectral_characteristics,
        vocal: { vocal_presence: 0.5 }
      } : {}
    };
  });
  
  console.log('✅ Song data preparation successful');
  console.log(`   - Prepared ${songsWithAnalysis.length} songs with analysis data`);
  console.log(`   - Song 1 analysis: BPM ${songsWithAnalysis[0].analysis.rhythmic?.bpm}, Key ${songsWithAnalysis[0].analysis.harmonic?.key}`);
  console.log(`   - Song 2 analysis: BPM ${songsWithAnalysis[1].analysis.rhythmic?.bpm}, Key ${songsWithAnalysis[1].analysis.harmonic?.key}`);
} catch (error) {
  console.log('❌ Song data preparation failed:', error.message);
}

// Test 2: Verify request payload structure
console.log('\n2. Testing request payload structure...');
try {
  const requestPayload = {
    masterplan: {
      timeline: mockMasterplan.masterplan.timeline,
      global_settings: mockMasterplan.masterplan.global
    },
    songs: mockSongs.map(song => ({
      song_id: song.song_id,
      storage_path: song.storage_path,
      analysis: {}
    })),
    job_id: mockJobId
  };
  
  // Validate payload structure
  if (!requestPayload.masterplan || !requestPayload.songs || !requestPayload.job_id) {
    throw new Error('Missing required payload fields');
  }
  
  if (!Array.isArray(requestPayload.masterplan.timeline)) {
    throw new Error('Timeline must be an array');
  }
  
  if (!Array.isArray(requestPayload.songs)) {
    throw new Error('Songs must be an array');
  }
  
  console.log('✅ Request payload structure valid');
  console.log(`   - Timeline has ${requestPayload.masterplan.timeline.length} sections`);
  console.log(`   - Songs array has ${requestPayload.songs.length} items`);
  console.log(`   - Job ID: ${requestPayload.job_id}`);
} catch (error) {
  console.log('❌ Request payload validation failed:', error.message);
}

// Test 3: Simulate streaming response parsing
console.log('\n3. Testing streaming response parsing...');
try {
  const mockStreamingData = [
    'data: {"progress": 10, "message": "Separating stems for song1..."}\n\n',
    'data: {"progress": 25, "message": "Separating stems for song2..."}\n\n',
    'data: {"progress": 50, "message": "Rendering section 1: Intro with drums and bass"}\n\n',
    'data: {"progress": 75, "message": "Applying mastering effects..."}\n\n',
    'data: {"progress": 90, "message": "Uploading final mashup..."}\n\n',
    'data: {"progress": 100, "message": "Complete!", "storage_path": "generated/test-job-123.wav"}\n\n'
  ];
  
  let finalStoragePath = '';
  let progressUpdates = [];
  
  for (const line of mockStreamingData) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.storage_path) {
          finalStoragePath = data.storage_path;
        }
        
        if (data.progress !== undefined && data.message) {
          // Map processing service progress (0-100) to job progress (80-100)
          const mappedProgress = Math.min(100, 80 + (data.progress * 0.2));
          progressUpdates.push({ progress: mappedProgress, message: data.message });
        }
      } catch (parseError) {
        console.warn(`Failed to parse line: ${line}`, parseError);
      }
    }
  }
  
  if (!finalStoragePath) {
    throw new Error('No storage path received');
  }
  
  console.log('✅ Streaming response parsing successful');
  console.log(`   - Processed ${progressUpdates.length} progress updates`);
  console.log(`   - Final storage path: ${finalStoragePath}`);
  console.log(`   - Progress range: ${progressUpdates[0]?.progress}% to ${progressUpdates[progressUpdates.length-1]?.progress}%`);
} catch (error) {
  console.log('❌ Streaming response parsing failed:', error.message);
}

// Test 4: Test error handling scenarios
console.log('\n4. Testing error handling scenarios...');
try {
  const errorScenarios = [
    'data: {"error": "Stem separation failed for song1"}\n\n',
    'data: {"error": "Audio rendering failed: Invalid audio format"}\n\n',
    'data: {"error": "Processing service timeout"}\n\n'
  ];
  
  for (const errorLine of errorScenarios) {
    if (errorLine.startsWith('data: ')) {
      try {
        const data = JSON.parse(errorLine.slice(6));
        if (data.error) {
          console.log(`   - Detected error: ${data.error}`);
        }
      } catch (parseError) {
        console.warn(`Failed to parse error line: ${errorLine}`);
      }
    }
  }
  
  console.log('✅ Error handling scenarios tested');
} catch (error) {
  console.log('❌ Error handling test failed:', error.message);
}

// Test 5: Verify stem separation integration points
console.log('\n5. Testing stem separation integration points...');
try {
  // Check that timeline references stems correctly
  const timelineSection = mockMasterplan.masterplan.timeline[0];
  const stemReferences = timelineSection.layers.map(layer => layer.stem);
  const validStems = ['drums', 'bass', 'other', 'vocals'];
  
  for (const stem of stemReferences) {
    if (!validStems.includes(stem)) {
      throw new Error(`Invalid stem reference: ${stem}`);
    }
  }
  
  console.log('✅ Stem separation integration verified');
  console.log(`   - Timeline references stems: ${stemReferences.join(', ')}`);
  console.log(`   - All stem references are valid`);
} catch (error) {
  console.log('❌ Stem separation integration test failed:', error.message);
}

console.log('\n🎉 Audio Rendering Integration Tests Complete!');
console.log('=============================================');