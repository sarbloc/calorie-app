import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useMeals } from './hooks/useMeals'
import { useGoals } from './hooks/useGoals'
import LoginView from './views/LoginView'

// ─── Sub-views ───────────────────────────────────────────────────────────────

function DashboardView({ user, meals, goals }) {
  const { entries, totals } = meals
  const { goals: g } = goals

  const consumed = totals.total_calories || 0
  const calorieGoal = g.calorie_goal || 2000
  const remaining = Math.max(0, calorieGoal - consumed)
  const progress = Math.min((consumed / calorieGoal) * 100, 100)

  return (
    <div className="view">
      <h1 className="mb-4">Today</h1>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Calories</span>
          <span className="text-muted">{consumed} / {calorieGoal} kcal</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-muted mt-2">
          {remaining > 0 ? `${remaining} remaining` : '🎉 Goal reached!'}
        </p>
      </div>

      <div className="card">
        <span className="card-title">Macros</span>
        <div className="macro-grid">
          {[
            { label: 'Protein', value: totals.total_protein || 0, goal: g.protein_goal || 150 },
            { label: 'Carbs',   value: totals.total_carbs   || 0, goal: g.carbs_goal   || 250 },
            { label: 'Fat',    value: totals.total_fat      || 0, goal: g.fat_goal      ||  65 },
          ].map(({ label, value, goal }) => (
            <div key={label} className="macro-item">
              <div className="macro-value">{value}g</div>
              <div className="macro-label">{label}</div>
              <div className="macro-label" style={{ opacity: 0.5 }}>/ {goal}g</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="card-title">Today&apos;s Log</span>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={entry.id} className="food-entry">
              <div className="food-info">
                <h4>{entry.name}</h4>
                <p>{entry.protein || 0}g P · {entry.carbs || 0}g C · {entry.fat || 0}g F</p>
              </div>
              <span className="food-calories">{entry.calories || 0} kcal</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No entries yet. Add your first meal!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryView({ userId }) {
  // Placeholder: fetching past dates grouped by day
  const [history, setHistory] = useState([])

  return (
    <div className="view">
      <h1 className="mb-4">History</h1>
      {history.length > 0 ? (
        history.map((day, idx) => (
          <div key={idx} className="card">
            <div className="card-header">
              <span className="card-title">{day.date}</span>
              <span className="text-accent">{day.total_calories} kcal</span>
            </div>
            <p className="text-muted">{day.entries?.length || 0} entries</p>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p>No history yet. Start logging meals!</p>
        </div>
      )}
    </div>
  )
}

function IntakeView({ userId, onAddEntry }) {
  const [name, setName]     = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fat, setFat]           = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !calories) return

    setSubmitting(true)
    await onAddEntry({
      name,
      calories: parseInt(calories) || 0,
      protein:  parseInt(protein)  || 0,
      carbs:    parseInt(carbs)    || 0,
      fat:      parseInt(fat)      || 0,
    })

    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setImagePreview(null)
    setSubmitting(false)
  }

  return (
    <div className="view">
      <h1 className="mb-4">Log Intake</h1>

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <span className="card-title">Photo (Optional)</span>
          <div className="input-group mt-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="input"
            />
          </div>
          {uploading && <p className="text-muted" style={{ fontSize: '13px' }}>Loading preview…</p>}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '12px' }}
            />
          )}
          <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
            Image stored locally (Supabase Storage integration pending).
          </p>
        </div>

        <div className="card">
          <div className="input-group">
            <label className="input-label">Food Name</label>
            <input
              type="text" className="input"
              placeholder="e.g., Grilled Chicken Salad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Calories (kcal)</label>
            <input
              type="number" className="input"
              placeholder="kcal"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required min="0"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'Protein (g)', value: protein, setter: setProtein },
              { label: 'Carbs (g)',   value: carbs,   setter: setCarbs   },
              { label: 'Fat (g)',     value: fat,     setter: setFat     },
            ].map(({ label, value, setter }) => (
              <div key={label} className="input-group">
                <label className="input-label">{label}</label>
                <input
                  type="number" className="input"
                  placeholder="0" value={value}
                  onChange={(e) => setter(e.target.value)}
                  min="0"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingsView({ goals, onSaveGoals }) {
  const [calorieGoal, setCalorieGoal] = useState(goals?.calorie_goal || 2000)
  const [proteinGoal,  setProteinGoal]  = useState(goals?.protein_goal || 150)
  const [carbsGoal,    setCarbsGoal]    = useState(goals?.carbs_goal   || 250)
  const [fatGoal,      setFatGoal]      = useState(goals?.fat_goal     ||  65)
  const [notifications, setNotifications] = useState(true)
  const [saved,        setSaved]         = useState(false)
  const [saving,       setSaving]        = useState(false)
  const { user, signOut } = useAuth()

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await onSaveGoals({
      calorie_goal: parseInt(calorieGoal) || 2000,
      protein_goal:  parseInt(proteinGoal)  || 150,
      carbs_goal:    parseInt(carbsGoal)    || 250,
      fat_goal:      parseInt(fatGoal)      ||  65,
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="view">
      <h1 className="mb-4">Settings</h1>

      <div className="card">
        <span className="card-title">Daily Goals</span>

        {[
          { label: 'Calories (kcal)', value: calorieGoal, setter: setCalorieGoal },
          { label: 'Protein (g)',     value: proteinGoal,  setter: setProteinGoal  },
          { label: 'Carbs (g)',       value: carbsGoal,    setter: setCarbsGoal    },
          { label: 'Fat (g)',         value: fatGoal,      setter: setFatGoal      },
        ].map(({ label, value, setter }) => (
          <div key={label} className="settings-item">
            <span className="settings-label">{label}</span>
            <input
              type="number"
              className="input"
              style={{ width: '100px', textAlign: 'right' }}
              value={value}
              onChange={(e) => setter(e.target.value)}
              min="0"
            />
          </div>
        ))}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Goals'}
        </button>
      </div>

      <div className="card">
        <div className="settings-section">
          <span className="settings-title">Notifications</span>
          <div className="settings-item">
            <span className="settings-label">Meal Reminders</span>
            <button
              className={`toggle ${notifications ? 'active' : ''}`}
              onClick={() => setNotifications(!notifications)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <span className="card-title">Account</span>
        <p className="text-muted mt-2" style={{ fontSize: '13px', marginBottom: '12px' }}>
          {user?.email}
        </p>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={signOut}>
          Sign Out
        </button>
      </div>

      <div className="card">
        <span className="card-title">About</span>
        <p className="text-muted mt-2" style={{ fontSize: '13px' }}>Calorie Tracker v0.1.0</p>
        <p className="text-muted" style={{ fontSize: '13px' }}>Supabase + Telegram Mini App</p>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null

  const meals  = useMeals(userId)
  const goals  = useGoals(userId)

  const [currentView, setCurrentView] = useState('dashboard')

  if (loading) {
    return (
      <div className="app-container">
        <main className="main-content">
          <div className="empty-state">
            <p className="text-muted">Loading…</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-container">
        <main className="main-content">
          <LoginView />
        </main>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView user={user} meals={meals}  goals={goals} />
      case 'history':   return <HistoryView   userId={userId} />
      case 'intake':     return <IntakeView    userId={userId} onAddEntry={meals.addMeal} />
      case 'settings':   return <SettingsView  goals={goals.goals} onSaveGoals={goals.saveGoals} />
      default:           return <DashboardView user={user} meals={meals} goals={goals} />
    }
  }

  return (
    <div className="app-container">
      <main className="main-content">{renderView()}</main>

      <nav className="nav-bar">
        {[
          { key: 'dashboard', icon: '📊', label: 'Dashboard' },
          { key: 'intake',    icon: '➕', label: 'Log'       },
          { key: 'history',   icon: '📅', label: 'History'   },
          { key: 'settings',  icon: '⚙️',  label: 'Settings'  },
        ].map(({ key, icon, label }) => (
          <button
            key={key}
            className={`nav-item ${currentView === key ? 'active' : ''}`}
            onClick={() => setCurrentView(key)}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
