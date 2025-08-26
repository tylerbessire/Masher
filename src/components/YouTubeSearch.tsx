import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Interface for a single search result
export interface YouTubeSearchResult {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
}

// Props for the component, including a callback for when a song is selected
interface YouTubeSearchProps {
  onSongSelected: (song: YouTubeSearchResult) => void;
}

export const YouTubeSearch = ({ onSongSelected }: YouTubeSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    console.log("Starting search for query:", query);
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      console.log("Calling local youtube search service...");
      const response = await fetch('http://localhost:7999/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("Service response:", { data });

      console.log("Setting results:", data.results);
      setResults(data.results);
    } catch (e: any) {
      console.error("Error in handleSearch:", e);
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // ... inside YouTubeSearch component ...
  const handleSelect = (song: YouTubeSearchResult) => {
    onSongSelected(song);
    setResults([]); // Clear results after selection
    setQuery(''); // Clear search input
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search YouTube</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="e.g., 'Never Gonna Give You Up'"
            className="youtube-search-input bg-[hsl(100,20%,85%)]"
            style={{ color: '#FFD700', fontWeight: 'bold' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? '...' : 'Search'}
          </Button>
          {results.length > 0 && (
            <Button variant="outline" onClick={() => setResults([])}>Clear</Button>
          )}
        </div>
        {error && <p className="text-red-500">{error}</p>}
        <div className="space-y-2">
          {results.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => handleSelect(item)}>
              <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded-md" />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
