import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    return { data, error }
  }

  const signUp = async (email, password) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
    setAuthError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setAuthError(error.message)
    return { data, error }
  }

  /**
   * Sign in with Telegram Mini-App
   * Uses window.Telegram.WebApp.initData which is only available inside Telegram
   */
  const signInWithTelegram = async () => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured' }
    setAuthError('')

    // Check if we're inside Telegram
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setAuthError('Telegram WebApp not available. Please open this app from Telegram.')
      return { error: 'Telegram WebApp not available' }
    }

    const initData = tg.initData
    if (!initData) {
      setAuthError('No initData available from Telegram')
      return { error: 'No initData' }
    }

    try {
      // Call our Supabase Edge Function to validate initData and get JWT
      const baseUrl = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL
        || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth` : '')
      if (!baseUrl) {
        setAuthError('Supabase URL not configured')
        return { error: 'Supabase URL not configured' }
      }
      const edgeFunctionUrl = baseUrl
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ initData }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const result = await response.json()

      if (!response.ok) {
        setAuthError(result.error || 'Authentication failed')
        return { error: result.error }
      }

      // Set the Supabase session with the returned JWT
      const { data, error } = await supabase.auth.setSession({
        access_token: result.jwt,
        refresh_token: result.jwt, // For simplicity, using same token; in prod use proper refresh token
      })

      if (error) {
        setAuthError(error.message)
        return { error }
      }

      return { data, user: result.user }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setAuthError('Request timed out. Please try again.')
        return { error: 'Request timed out' }
      }
      const msg = err instanceof Error ? err.message : 'Network error'
      setAuthError(msg)
      return { error: msg }
    }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signInWithTelegram, 
      signOut, 
      authError, 
      isConfigured: isSupabaseConfigured 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
