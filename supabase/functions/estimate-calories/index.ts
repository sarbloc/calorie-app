// Supabase Edge Function: Estimate Calories
// Proxies image + description to OpenClaw webhook, keeping the token server-side

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENCLAW_HOOKS_URL = Deno.env.get('OPENCLAW_HOOKS_URL')
const OPENCLAW_HOOKS_TOKEN = Deno.env.get('OPENCLAW_HOOKS_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!OPENCLAW_HOOKS_URL || !OPENCLAW_HOOKS_TOKEN) {
      console.error('OPENCLAW_HOOKS_URL or OPENCLAW_HOOKS_TOKEN is not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    // Verify the caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth verification failed:', authError?.message)
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { image, message } = await req.json()

    if (!image) {
      return jsonResponse({ error: 'image is required' }, 400)
    }

    const res = await fetch(`${OPENCLAW_HOOKS_URL}/estimate-calories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
      body: JSON.stringify({ image, message }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`OpenClaw returned ${res.status}: ${text}`)
      return jsonResponse({ error: `Estimation failed: ${res.status}` }, 502)
    }

    const data = await res.json()
    return jsonResponse(data)
  } catch (error) {
    console.error('Estimate calories error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
