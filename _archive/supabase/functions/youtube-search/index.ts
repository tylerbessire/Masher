import { corsHeaders } from '../_shared/cors.ts'

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3'

interface YouTubeVideo {
  id: string
  title: string
  url: string
  duration: string
  thumbnail: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable not set.')
    }

    const { query } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: "A 'query' parameter is required." }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Searching YouTube for: ${query}`)

    // Step 1: Search for videos
    const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(
      query
    )}&key=${YOUTUBE_API_KEY}&maxResults=5&type=video`

    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text()
      console.error('YouTube Search API error:', errorBody)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch from YouTube Search API',
          details: errorBody,
        }),
        {
          status: searchResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    const searchData = await searchResponse.json()
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')

    if (!videoIds) {
      return new Response(JSON.stringify({ success: true, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Get video details (including duration)
    const videosUrl = `${YOUTUBE_API_URL}/videos?part=snippet,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    const videosResponse = await fetch(videosUrl)
    if (!videosResponse.ok) {
      const errorBody = await videosResponse.text()
      console.error('YouTube Videos API error:', errorBody)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch from YouTube Videos API',
          details: errorBody,
        }),
        {
          status: videosResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    const videosData = await videosResponse.json()

    // Helper function to parse ISO 8601 duration
    const parseDuration = (isoDuration: string) => {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
        const matches = isoDuration.match(regex)

        if (!matches) return '0:00'

        const hours = matches[1] ? parseInt(matches[1], 10) : 0
        const minutes = matches[2] ? parseInt(matches[2], 10) : 0
        const seconds = matches[3] ? parseInt(matches[3], 10) : 0

        let formated_time = ''

        if (hours > 0) {
            formated_time += `${hours}:`
        }

        formated_time += `${minutes.toString().padStart(2, '0')}:`
        formated_time += seconds.toString().padStart(2, '0')

        return formated_time
    }

    const results: YouTubeVideo[] = videosData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      duration: parseDuration(item.contentDetails.duration),
      thumbnail: item.snippet.thumbnails.default.url,
    }))

    console.log(`Found ${results.length} results`)

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})