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
      // Call our Supabase Edge Function to validate initData and get a session
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'telegram-auth',
        { body: { initData } }
      )

      if (fnError) {
        setAuthError(fnError.message || 'Authentication failed')
        return { error: fnError.message }
      }

      if (result?.error) {
        setAuthError(result.error)
        return { error: result.error }
      }

      // Exchange the OTP for a real session
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: 'magiclink',
      })

      if (error) {
        setAuthError(error.message)
        return { error }
      }

      return { data, user: result.user }
    } catch (err) {
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
