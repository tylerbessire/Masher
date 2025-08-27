import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface Track {
  id: string;
  url: string;
}

export const fetchJSON = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
};

export const useTrack = (id: string): UseQueryResult<Track> =>
  useQuery({ queryKey: ['track', id], queryFn: () => fetchJSON<Track>(`/tracks/${id}`) });

export const createTrackFromUrl = (url: string) =>
  fetchJSON<Track>('/tracks:from_url', {
    method: 'POST',
    body: JSON.stringify({ url })
  });

export interface JobStatus {
  id: string;
  stage: string;
  status: string;
}

export const useJobs = (): UseQueryResult<JobStatus[]> =>
  useQuery({ queryKey: ['jobs'], queryFn: () => fetchJSON<JobStatus[]>('/jobs') });
