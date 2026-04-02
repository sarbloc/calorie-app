// Supabase Edge Function: Estimate Calories
// Calls NVIDIA's Kimi K2.5 API directly for vision-based calorie estimation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

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
    if (!NVIDIA_API_KEY) {
      console.error('NVIDIA_API_KEY is not set')
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

    const res = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: message },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
        top_p: 1.0,
        stream: false,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`NVIDIA API returned ${res.status}: ${text}`)
      return jsonResponse({ error: `Estimation failed: ${res.status}`, detail: text }, 502)
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || ''
    return jsonResponse({ reply })
  } catch (error) {
    console.error('Estimate calories error:', error)
    return jsonResponse({ error: 'Internal server error', detail: String(error) }, 500)
  }
})
