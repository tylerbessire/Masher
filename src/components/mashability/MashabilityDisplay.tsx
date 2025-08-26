import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { MashabilityResult } from '@/types/mashability';


interface MashabilityDisplayProps {
  mashabilityResult: MashabilityResult | null;
  onWeightsChange: (weights: any) => void;
}

export const MashabilityDisplay: React.FC<MashabilityDisplayProps> = ({ mashabilityResult, onWeightsChange }) => {
  const [weights, setWeights] = useState({
    harmonic: 0.35,
    rhythmic: 0.35,
    spectral: 0.15,
    vocal: 0.15,
  });

  const handleWeightChange = (dimension: string, value: number) => {
    const newWeights = { ...weights, [dimension]: value };
    setWeights(newWeights);
    onWeightsChange(newWeights);
  };

  if (!mashabilityResult) {
    return <div className="p-4 text-center">Analyze two songs to see their mashability.</div>;
  }

  const barData = Object.entries(mashabilityResult.dimension_scores).map(([name, score]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    score,
  }));

  return (
    <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
      <h3 className="text-2xl font-bold text-center">Mashability Score: {mashabilityResult.overall_score.toFixed(1)}%</h3>

      <div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} />
            <Bar dataKey="score" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h4 className="text-md font-semibold">Adjust Importance Weights</h4>
        {Object.entries(weights).map(([dimension, weight]) => (
          <div key={dimension} className="flex items-center space-x-3">
            <label className="w-20 text-sm capitalize">{dimension}:</label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={weight}
              onChange={(e) => handleWeightChange(dimension, parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="w-12 text-sm text-right">{(weight * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold">Detailed Analysis</h4>

        {mashabilityResult.compatibility_breakdown.harmonic && (
          <div className="p-3 bg-gray-50 rounded">
            <h5 className="font-medium mb-2">Harmonic Compatibility</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Key Match: {(mashabilityResult.compatibility_breakdown.harmonic.key_compatibility * 100).toFixed(0)}%</div>
              <div>Chord Similarity: {(mashabilityResult.compatibility_breakdown.harmonic.chord_similarity * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {mashabilityResult.compatibility_breakdown.rhythmic && (
          <div className="p-3 bg-gray-50 rounded">
            <h5 className="font-medium mb-2">Rhythmic Compatibility</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Tempo Ratio: {mashabilityResult.compatibility_breakdown.rhythmic.tempo_ratio.toFixed(2)}</div>
              <div>Beat Confidence: {(mashabilityResult.compatibility_breakdown.rhythmic.beat_confidence * 100).toFixed(0)}%</div>
              <div>Groove Match: {(mashabilityResult.compatibility_breakdown.rhythmic.groove_similarity * 100).toFixed(0)}%</div>
              <div>Swing Match: {(mashabilityResult.compatibility_breakdown.rhythmic.swing_compatibility * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {mashabilityResult.compatibility_breakdown.spectral && (
          <div className="p-3 bg-gray-50 rounded">
            <h5 className="font-medium mb-2">Spectral Compatibility</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Timbre (MFCC): {(mashabilityResult.compatibility_breakdown.spectral.mfcc_similarity * 100).toFixed(0)}%</div>
              <div>Brightness: {(mashabilityResult.compatibility_breakdown.spectral.brightness_compatibility * 100).toFixed(0)}%</div>
              <div>Dynamic Range: {(mashabilityResult.compatibility_breakdown.spectral.dynamic_range_compatibility * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {mashabilityResult.compatibility_breakdown.vocal && (
          <div className="p-3 bg-gray-50 rounded">
            <h5 className="font-medium mb-2">Vocal Compatibility</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Presence 1: {(mashabilityResult.compatibility_breakdown.vocal.vocal_presence_1 * 100).toFixed(0)}%</div>
              <div>Presence 2: {(mashabilityResult.compatibility_breakdown.vocal.vocal_presence_2 * 100).toFixed(0)}%</div>
              <div>Overlap Risk: {(mashabilityResult.compatibility_breakdown.vocal.overlap_risk * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations & Warnings */}
      {mashabilityResult.recommendations?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-md font-semibold">Recommendations</h4>
          {mashabilityResult.recommendations.map((rec: string, index: number) => (
            <div key={index} className="p-2 bg-blue-50 rounded text-sm text-blue-800">💡 {rec}</div>
          ))}
        </div>
      )}
      {mashabilityResult.warnings?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-md font-semibold">Warnings</h4>
          {mashabilityResult.warnings.map((warning: string, index: number) => (
            <div key={index} className="p-2 bg-yellow-50 rounded text-sm text-yellow-800">⚠️ {warning}</div>
          ))}
        </div>
      )}
    </div>
  );
};
