// Supabase Edge Function: Estimate Calories
// Calls NVIDIA's Kimi K2.5 API for nutrition estimation (image + text or text-only)

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

    if (!image && !message) {
      return jsonResponse({ error: 'image or message is required' }, 400)
    }

    // Build system message based on whether image is provided
    const systemText = image
      ? [
          'You are an expert nutritionist. Analyze the provided food photo and any accompanying text.',
          'Identify every food item, estimate portion sizes, and calculate nutritional values.',
          'If the user provides a description, treat it as the primary source of truth.',
        ].join(' ')
      : [
          'You are an expert nutritionist. Based on the food description provided,',
          'identify all food items, estimate typical portion sizes, and calculate nutritional values.',
        ].join(' ')

    const systemMessage = [
      systemText,
      'Return ONLY a valid JSON object. No markdown, no code fences, no explanation.',
      'Format: {"items":[{"name":"food","portion":"amount","calories":0,"protein":0,"carbs":0,"fat":0}],"total":{"name":"summary","calories":0,"protein":0,"carbs":0,"fat":0}}',
      'All numeric values must be integers. Calories in kcal, protein/carbs/fat in grams.',
    ].join('\n')

    // Build user content conditionally
    const userContent: Array<Record<string, unknown>> = []
    if (message) {
      userContent.push({ type: 'text', text: message })
    }
    if (image) {
      userContent.push({ type: 'image_url', image_url: { url: image } })
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
          { role: 'system', content: systemMessage },
          { role: 'user', content: userContent },
        ],
        max_tokens: 2048,
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
    const finishReason = data.choices?.[0]?.finish_reason || 'unknown'
    console.log('AI response (first 500):', reply.substring(0, 500))
    console.log('Finish reason:', finishReason)
    return jsonResponse({ reply })
  } catch (error) {
    console.error('Estimate calories error:', error)
    return jsonResponse({ error: 'Internal server error', detail: String(error) }, 500)
  }
})
