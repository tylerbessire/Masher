import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { songId, fileName, fileSize, contentType } = await req.json();
    if (!songId || !fileName) {
      return new Response(JSON.stringify({ error: 'songId and fileName are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate songId to prevent path traversal and weird characters
    const idStr = String(songId);
    const idValid = /^[a-zA-Z0-9_-]{1,64}$/.test(idStr);
    if (!idValid) {
      return new Response(JSON.stringify({ error: 'Invalid songId format' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Enhanced filename sanitization and validation
    const rawName = String(fileName);
    const safeName = rawName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9-_.]/g, '');
    const dotIdx = safeName.lastIndexOf('.');
    const ext = dotIdx > -1 ? safeName.slice(dotIdx + 1).toLowerCase() : '';
    const allowed = new Set(['mp3','wav','m4a','flac','ogg','aac']);
    if (!ext || !allowed.has(ext)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Optional size/type checks (when provided by client)
    if (typeof fileSize === 'number' && fileSize > 50 * 1024 * 1024) { // 50MB
      return new Response(JSON.stringify({ error: 'File too large (max 50MB)' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof contentType === 'string' && !contentType.startsWith('audio/')) {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const path = `uploads/${idStr}/${safeName}`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRole) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceRole);
    const { data, error } = await supabase.storage.from('mashups').createSignedUploadUrl(path, { upsert: true });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create signed upload URL');
    }

    // data contains { signedUrl, token }
    return new Response(JSON.stringify({ path, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to create signed upload', details: (e as Error).message } ), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } 
});
