import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AlertTriangle, Salad, Loader2 } from 'lucide-react'

export default function LoginView() {
  const { signInWithTelegram, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    // Check if we're running inside Telegram
    setIsTelegram(!!window.Telegram?.WebApp)
  }, [])

  const handleTelegramSignIn = async () => {
    setLoading(true)
    await signInWithTelegram()
    // loading stays true until auth completes or fails
  }

  if (!isConfigured) {
    return (
      <div className="view">
        <div className="card">
          <div className="empty-state">
            <AlertTriangle size={48} color="#F59E0B" style={{ marginBottom: 12 }} />
            <h3 style={{ marginBottom: 8 }}>Supabase Not Configured</h3>
            <p style={{ fontSize: 13 }}>
              Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file to enable authentication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If inside Telegram Mini-App, use native auth
  if (isTelegram) {
    return (
      <div className="view">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Salad size={48} color="#22C55E" style={{ marginBottom: 8 }} />
          <h1 style={{ fontSize: 24, fontWeight: '700' }}>Calorie Tracker</h1>
          <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
            Sign in to continue
          </p>
        </div>

        <div className="card">
          <button
            className="btn-telegram"
            onClick={handleTelegramSignIn}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#0088CC',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Signing in…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Sign in with Telegram
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Fallback for browser/dev testing
  return (
    <div className="view">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Salad size={48} color="#22C55E" style={{ marginBottom: 8 }} />
        <h1 style={{ fontSize: 24, fontWeight: '700' }}>Calorie Tracker</h1>
        <p className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>
          Sign in to continue
        </p>
      </div>

      <div className="card">
        <div style={{ 
          padding: 16, 
          backgroundColor: '#FEF3C7', 
          borderRadius: 8, 
          marginBottom: 16,
          fontSize: 13,
          color: '#92400E'
        }}>
          <strong>⚠️ This app works best inside Telegram.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Open this page from your Telegram mini-app to sign in automatically.
          </p>
        </div>
        
        <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
          <p>To test locally, you can use browser DevTools to simulate Telegram:</p>
          <code style={{ 
            display: 'block', 
            marginTop: 8, 
            padding: 8, 
            backgroundColor: '#F3F4F6', 
            borderRadius: 4,
            fontSize: 11
          }}>
            window.Telegram = {{ WebApp: {{ initData: 'test' }} }}
          </code>
        </div>
      </div>
    </div>
  )
}
