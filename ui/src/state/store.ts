import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { createContext, useContext, useMemo, useState } from 'react';

export interface TrackState {
  id: string;
  url: string;
  stems: Record<string, boolean>;
}

interface Store {
  tracks: Record<string, TrackState>;
  pairId?: string;
  setPair: (a: string, b: string) => void;
  toggleStem: (trackId: string, stem: string) => void;
}

const StoreContext = createContext<Store | undefined>(undefined);
const queryClient = new QueryClient();

export const StoreProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [tracks, setTracks] = useState<Record<string, TrackState>>({});
  const [pairId, setPairId] = useState<string | undefined>();

  const store = useMemo<Store>(() => ({
    tracks,
    pairId,
    setPair: (a: string, b: string) => {
      setPairId(`${a}_${b}`);
    },
    toggleStem: (trackId: string, stem: string) => {
      setTracks(prev => ({
        ...prev,
        [trackId]: {
          ...prev[trackId],
          stems: { ...prev[trackId]?.stems, [stem]: !prev[trackId]?.stems?.[stem] }
        }
      }));
    }
  }), [tracks, pairId]);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </QueryClientProvider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
