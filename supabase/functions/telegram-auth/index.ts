// Supabase Edge Function: Telegram Auth
// Validates Telegram Mini-App initData and returns a Supabase JWT

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const EDGE_SERVICE_ROLE_KEY = Deno.env.get('EDGE_SERVICE_ROLE_KEY')

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()

    if (!initData) {
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse initData (URL-encoded key-value pairs)
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    
    if (!hash) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData: missing hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove hash from params for verification
    params.delete('hash')

    // Sort params by key and build data check string
    const sortedKeys = Array.from(params.keys()).sort()
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n')

    // Compute HMAC-SHA256
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(BOT_TOKEN),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(dataCheckString)
    )
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signature))
    const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Constant-time comparison
    if (computedHash !== hash) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData: hash mismatch' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse user data
    const userData = params.get('user')
    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData: missing user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = JSON.parse(decodeURIComponent(userData))
    const telegramId = user.id?.toString()
    
    if (!telegramId) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData: missing user id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase service client to mint custom JWT
    const supabaseAdmin = createClient(SUPABASE_URL, EDGE_SERVICE_ROLE_KEY)

    // Find or create user by telegram_id
    let { data: existingUser, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, telegram_id')
      .eq('telegram_id', telegramId)
      .single()

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error finding user:', findError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create profile if doesn't exist
    if (!existingUser) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({ 
          telegram_id: telegramId,
          telegram_username: user.username || null,
          telegram_first_name: user.first_name || null,
          telegram_last_name: user.last_name || null,
        })
        .select('id, telegram_id')
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        // Try to fetch again in case of race condition
        const { data: retryUser } = await supabaseAdmin
          .from('profiles')
          .select('id, telegram_id')
          .eq('telegram_id', telegramId)
          .single()
        
        if (retryUser) {
          existingUser = retryUser
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to create user profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        existingUser = newProfile
      }
    }

    // Generate a custom JWT with the user's profile ID
    // Using the service role key to sign (bypasses RLS)
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: existingUser.id,
      telegram_id: telegramId,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
      aud: 'authenticated',
    }

    // Create the JWT manually since we're in Edge Function
    const header = { alg: 'HS256', typ: 'JWT' }
    
    const encodeBase64 = (obj: unknown) => {
      return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    }

    const signingInput = `${encodeBase64(header)}.${encodeBase64(payload)}`
    
    const signingKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(EDGE_SERVICE_ROLE_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBytes = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(signingInput))
    const signatureBase64 = encodeBase64(new Uint8Array(signatureBytes))
    
    const jwt = `${signingInput}.${signatureBase64}`

    return new Response(
      JSON.stringify({ 
        jwt,
        user: {
          id: existingUser.id,
          telegram_id: telegramId,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Telegram auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
