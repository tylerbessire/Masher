import React, { useEffect, useRef } from 'react';
// @ts-ignore - wavesurfer has no types by default
import WaveSurfer from 'wavesurfer.js';

interface Props {
  url: string;
  regions?: { start: number; end: number; color?: string }[];
  playing?: boolean;
}

export const Waveform: React.FC<Props> = ({ url, regions = [], playing }) => {
  const container = useRef<HTMLDivElement | null>(null);
  const ws = useRef<any>();

  useEffect(() => {
    if (!container.current) return;
    ws.current = WaveSurfer.create({
      container: container.current,
      waveColor: '#88f',
      progressColor: '#555',
      cursorColor: '#000'
    });
    ws.current.load(url);
    regions.forEach(r => ws.current.addRegion({ ...r, drag: true, resize: true }));
    return () => ws.current.destroy();
  }, [url]);

  useEffect(() => {
    if (!ws.current) return;
    if (playing) ws.current.play();
    else ws.current.pause();
  }, [playing]);

  return <div ref={container} className="w-full h-24" />;
};
