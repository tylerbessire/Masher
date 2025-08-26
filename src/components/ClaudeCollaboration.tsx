import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Sparkles, Music2, Brain } from 'lucide-react';

interface ClaudeCollaborationProps {
  mashupConcept: string;
  analysisData?: any[];
  quickSuggestions?: string[];
  onIterationRequest: (feedback: string) => void;
}

export function ClaudeCollaboration({ 
  mashupConcept, 
  analysisData = [], 
  quickSuggestions = [],
  onIterationRequest 
}: ClaudeCollaborationProps) {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) return;
    
    setIsLoading(true);
    try {
      await onIterationRequest(feedback);
      setFeedback('');
    } finally {
      setIsLoading(false);
    }
  };

  const defaultSuggestions = [
    "Make it more energetic and danceable",
    "Add more vocal harmonies",
    "Create a slower, emotional bridge",
    "Emphasize the bass and drums",
    "Make the transition smoother",
    "Add orchestral elements"
  ];

  const suggestions = quickSuggestions.length > 0 ? quickSuggestions : defaultSuggestions;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Claude Creative Collaboration
        </CardTitle>
        <CardDescription>
          Collaborate with Claude to refine your mashup concept and explore creative variations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Concept Display */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="h-4 w-4 text-primary" />
            <span className="font-medium">Current Concept</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {mashupConcept}
          </p>
        </div>

        {/* Analysis Data Summary */}
        {analysisData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Technical Analysis Available</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisData.map((data, i) => {
                if (!data) return null;
                
                // Use the new analysis structure
                const bpm = data.rhythmic?.bpm || 0;
                const key = data.harmonic?.key || 'Unknown';
                const energy = data.vocal?.vocal_presence || 0;
                
                return (
                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                    Song {i + 1}: {bpm.toFixed(0)} BPM, {key}, {energy.toFixed(2)} Energy
                  </Badge>
                )
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* Quick Suggestions */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Quick Suggestions</span>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto p-2 text-xs text-left justify-start"
                onClick={() => setFeedback(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Feedback */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Custom Direction</span>
          <Textarea
            placeholder="Describe how you'd like to modify the mashup concept... (e.g., 'Make it darker and more mysterious', 'Add electronic elements', 'Focus on the emotional climax')"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          
          <Button 
            onClick={handleSendFeedback}
            disabled={!feedback.trim() || isLoading}
            className="w-full"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Collaborating with Claude...' : 'Collaborate on New Version'}
          </Button>
        </div>

        {/* Pro Tips */}
        <div className="p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
          <div className="text-xs font-medium mb-1">💡 Pro Tips</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Be specific about musical elements (tempo, key, instruments)</div>
            <div>• Mention emotional feelings you want to evoke</div>
            <div>• Reference song sections (verse, chorus, bridge, outro)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}