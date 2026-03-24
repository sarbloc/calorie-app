// Supabase Edge Function: Telegram Auth
// Validates Telegram Mini-App initData, creates a GoTrue user, and returns a real session

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const EDGE_SERVICE_ROLE_KEY = Deno.env.get('EDGE_SERVICE_ROLE_KEY')

// CORS headers for browser requests
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()

    if (!initData) {
      return jsonResponse({ error: 'initData is required' }, 400)
    }

    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    // Parse initData (URL-encoded key-value pairs)
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')

    if (!hash) {
      return jsonResponse({ error: 'Invalid initData: missing hash' }, 400)
    }

    // Remove hash from params for verification
    params.delete('hash')

    // Sort params by key and build data check string
    const sortedKeys = Array.from(params.keys()).sort()
    const dataCheckString = sortedKeys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n')

    // Compute HMAC-SHA256 per Telegram spec:
    // 1. Derive secret_key = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN)
    // 2. Compute hash = HMAC_SHA256(key=secret_key, msg=data_check_string)
    const encoder = new TextEncoder()
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const secretKeyBytes = await crypto.subtle.sign(
      'HMAC',
      webAppDataKey,
      encoder.encode(BOT_TOKEN)
    )
    const key = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
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
      return jsonResponse({ error: 'Invalid initData: hash mismatch' }, 401)
    }

    // Parse user data
    const userData = params.get('user')
    if (!userData) {
      return jsonResponse({ error: 'Invalid initData: missing user' }, 400)
    }

    const user = JSON.parse(userData)
    const telegramId = user.id?.toString()

    if (!telegramId) {
      return jsonResponse({ error: 'Invalid initData: missing user id' }, 400)
    }

    // Create Supabase admin client (service role bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL!, EDGE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Deterministic email for this Telegram user
    const email = `tg_${telegramId}@telegram.users.noreply`

    // Derive a deterministic password from telegram_id + bot_token
    const pwKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(BOT_TOKEN + '_password'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const pwBytes = await crypto.subtle.sign('HMAC', pwKey, encoder.encode(telegramId))
    const password = Array.from(new Uint8Array(pwBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Try to sign in first (user may already exist)
    let session = null
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // User doesn't exist yet — create via admin API
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username: user.username || null,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
        },
      })

      if (createError) {
        console.error('Error creating auth user:', createError)
        return jsonResponse({ error: 'Failed to create user' }, 500)
      }

      // Now sign in to get a real session
      const { data: retrySignIn, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      })

      if (retryError) {
        console.error('Error signing in after create:', retryError)
        return jsonResponse({ error: 'Failed to sign in' }, 500)
      }

      session = retrySignIn.session

      // Create profile linked to auth user
      await supabaseAdmin.from('profiles').upsert({
        id: createData.user.id,
        telegram_id: telegramId,
        telegram_username: user.username || null,
        telegram_first_name: user.first_name || null,
        telegram_last_name: user.last_name || null,
      })
    } else {
      session = signInData.session

      // Update profile info on each login
      await supabaseAdmin.from('profiles').upsert({
        id: signInData.user.id,
        telegram_id: telegramId,
        telegram_username: user.username || null,
        telegram_first_name: user.first_name || null,
        telegram_last_name: user.last_name || null,
      })
    }

    if (!session) {
      return jsonResponse({ error: 'Failed to create session' }, 500)
    }

    return jsonResponse({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: session.user.id,
        telegram_id: telegramId,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })

  } catch (error) {
    console.error('Telegram auth error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
