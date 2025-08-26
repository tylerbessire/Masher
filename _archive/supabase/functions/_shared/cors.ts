export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const tunnelBypassHeaders = {
  'User-Agent': 'Supabase-Edge-Function/1.0',
  'bypass-tunnel-reminder': 'true'
}