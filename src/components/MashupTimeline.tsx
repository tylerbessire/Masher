import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Layers, Zap } from 'lucide-react';

const STEM_COLORS: { [key: string]: string } = {
  vocals: 'bg-blue-500 border-blue-700',
  drums: 'bg-red-500 border-red-700',
  bass: 'bg-yellow-500 border-yellow-700',
  other: 'bg-green-500 border-green-700',
  melody: 'bg-purple-500 border-purple-700',
  piano: 'bg-pink-500 border-pink-700',
  synths: 'bg-indigo-500 border-indigo-700',
  pads: 'bg-teal-500 border-teal-700',
  percussion: 'bg-orange-500 border-orange-700',
  kick: 'bg-gray-500 border-gray-700',
  lead: 'bg-cyan-500 border-cyan-700',
};

export interface MashupLayer {
  songId: string;
  stem: string;
  volume_db: number;
  effects?: string[];
}

export interface MashupSection {
  time_start_sec: number;
  duration_sec: number;
  description: string;
  energy_level: number;
  layers: MashupLayer[];
}

export function MashupTimeline({ timeline }: { timeline: MashupSection[] }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-bold text-center">Mashup Masterplan</h4>
      {timeline.map((section, idx) => (
        <Card key={idx} className="p-4 bg-background/80 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-primary">{section.time_start_sec}s</div>
              <div className="w-px h-4 bg-primary/50 my-1"></div>
              <div className="text-xs font-mono text-muted-foreground">{section.duration_sec}s</div>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{section.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">Energy: {section.energy_level * 100}%</Badge>
              </div>
              <div className="mt-3 space-y-2">
                <h5 className="text-xs font-bold uppercase text-muted-foreground">Layers</h5>
                {section.layers.map((layer, layerIdx) => (
                  <div key={layerIdx} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                    <div className={`w-4 h-4 rounded-sm border ${STEM_COLORS[layer.stem] || STEM_COLORS.other}`}></div>
                    <div className="flex-1">
                      <span className="font-mono text-xs font-bold">{layer.songId}: {layer.stem}</span>
                      <span className="text-xs text-muted-foreground ml-2">(Vol: {layer.volume_db}dB)</span>
                      {layer.effects && layer.effects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {layer.effects.map(effect => (
                            <Badge key={effect} variant="outline" className="text-xs">{effect}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
