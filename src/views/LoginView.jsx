import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginView() {
  const { signIn, signUp, authError, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setSubmitting(true)
    setSuccess('')

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setSuccess('')
    } else {
      const { error } = await signUp(email, password)
      if (!error) setSuccess('Check your email to confirm your account!')
    }

    setSubmitting(false)
  }

  if (!isConfigured) {
    return (
      <div className="view">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3 style={{ marginBottom: '8px' }}>Supabase Not Configured</h3>
            <p style={{ fontSize: '13px' }}>
              Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file to enable authentication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🥗</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Calorie Tracker</h1>
        <p className="text-muted" style={{ fontSize: '14px', marginTop: '4px' }}>
          {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {authError && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>
              {authError}
            </p>
          )}

          {success && (
            <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '12px' }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setSuccess(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
