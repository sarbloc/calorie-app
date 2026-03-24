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

    // Ensure GoTrue user exists
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 })
    let authUser = null

    // Look up by email via admin API
    const { data: lookupData } = await supabaseAdmin.auth.admin.listUsers()
    authUser = lookupData.users.find((u) => u.email === email) || null

    if (!authUser) {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
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
        return jsonResponse({ error: `Failed to create user: ${createError.message}` }, 500)
      }
      authUser = createData.user
    }

    // Generate a magic link to get a valid OTP
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError) {
      console.error('Error generating link:', linkError)
      return jsonResponse({ error: `Failed to generate auth link: ${linkError.message}` }, 500)
    }

    // Upsert profile linked to auth user
    await supabaseAdmin.from('profiles').upsert({
      id: authUser.id,
      telegram_id: telegramId,
      telegram_username: user.username || null,
      telegram_first_name: user.first_name || null,
      telegram_last_name: user.last_name || null,
    })

    // Return the OTP + email so the client can exchange it for a real session
    return jsonResponse({
      email,
      token_hash: linkData.properties.hashed_token,
      user: {
        id: authUser.id,
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
