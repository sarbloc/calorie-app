import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase client (uses env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// View Components
function DashboardView({ dailyData, todaysIntake }) {
  const calorieGoal = dailyData?.calorie_goal || 2000
  const consumed = todaysIntake?.total_calories || 0
  const remaining = Math.max(0, calorieGoal - consumed)
  const progress = Math.min((consumed / calorieGoal) * 100, 100)

  const protein = todaysIntake?.total_protein || 0
  const carbs = todaysIntake?.total_carbs || 0
  const fat = todaysIntake?.total_fat || 0

  return (
    <div className="view">
      <h1 className="mb-4">Today</h1>

      {/* Daily Goal Tracker */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Calories</span>
          <span className="text-muted">{consumed} / {calorieGoal}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-muted mt-2">
          {remaining > 0 ? `${remaining} remaining` : 'Goal reached!'}
        </p>
      </div>

      {/* Macro Breakdown */}
      <div className="card">
        <span className="card-title">Macros</span>
        <div className="macro-grid">
          <div className="macro-item">
            <div className="macro-value">{protein}g</div>
            <div className="macro-label">Protein</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{carbs}g</div>
            <div className="macro-label">Carbs</div>
          </div>
          <div className="macro-item">
            <div className="macro-value">{fat}g</div>
            <div className="macro-label">Fat</div>
          </div>
        </div>
      </div>

      {/* Today's Feed */}
      <div className="card">
        <span className="card-title">Today's Log</span>
        {todaysIntake?.entries?.length > 0 ? (
          todaysIntake.entries.map((entry, idx) => (
            <div key={idx} className="food-entry">
              <div className="food-info">
                <h4>{entry.name}</h4>
                <p>{entry.protein}g P · {entry.carbs}g C · {entry.fat}g F</p>
              </div>
              <span className="food-calories">{entry.calories} kcal</span>
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

function HistoryView({ history }) {
  const entries = history || []

  return (
    <div className="view">
      <h1 className="mb-4">History</h1>

      {entries.length > 0 ? (
        entries.map((day, idx) => (
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

function IntakeView({ onAddEntry }) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [imagePreview, setImagePreview] = useState(null)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // TODO: Integrate with backend OCR/nutrient analysis
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !calories) return

    onAddEntry({
      name,
      calories: parseInt(calories),
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
    })

    // Reset form
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setImagePreview(null)
  }

  return (
    <div className="view">
      <h1 className="mb-4">Log Intake</h1>

      <form onSubmit={handleSubmit}>
        {/* Image Upload - Web App Compatible */}
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
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '12px' }}
            />
          )}
        </div>

        <div className="card">
          <div className="input-group">
            <label className="input-label">Food Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Grilled Chicken Salad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Calories</label>
            <input
              type="number"
              className="input"
              placeholder="kcal"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              required
              min="0"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div className="input-group">
              <label className="input-label">Protein (g)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                min="0"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Carbs (g)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                min="0"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Fat (g)</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Add Entry
          </button>
        </div>
      </form>
    </div>
  )
}

function SettingsView({ settings, onUpdateSettings }) {
  const [calorieGoal, setCalorieGoal] = useState(settings?.calorie_goal || 2000)
  const [notifications, setNotifications] = useState(settings?.notifications ?? true)

  const handleSave = () => {
    onUpdateSettings({ calorie_goal: parseInt(calorieGoal), notifications })
  }

  return (
    <div className="view">
      <h1 className="mb-4">Settings</h1>

      <div className="card">
        <div className="settings-section">
          <span className="settings-title">Goals</span>
          <div className="settings-item">
            <span className="settings-label">Daily Calorie Goal</span>
            <input
              type="number"
              className="input"
              style={{ width: '100px', textAlign: 'right' }}
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
            />
          </div>
        </div>

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

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>
          Save Settings
        </button>
      </div>

      <div className="card">
        <span className="card-title">About</span>
        <p className="text-muted mt-2">Calorie Tracker v0.1.0</p>
        <p className="text-muted">Powered by Supabase + Telegram Mini App</p>
      </div>
    </div>
  )
}

// Main App
function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [dailyData, setDailyData] = useState({ calorie_goal: 2000 })
  const [todaysIntake, setTodaysIntake] = useState({ entries: [], total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 })
  const [history, setHistory] = useState([])
  const [settings, setSettings] = useState({ calorie_goal: 2000, notifications: true })

  // TODO: Load real data from Supabase
  // useEffect(() => {
  //   if (!supabase) return
  //   // Fetch user data, today's intake, history, settings
  // }, [supabase])

  const handleAddEntry = (entry) => {
    // TODO: Persist to Supabase
    console.log('Adding entry:', entry)
    setTodaysIntake(prev => ({
      ...prev,
      entries: [...prev.entries, entry],
      total_calories: prev.total_calories + entry.calories,
      total_protein: prev.total_protein + entry.protein,
      total_carbs: prev.total_carbs + entry.carbs,
      total_fat: prev.total_fat + entry.fat,
    }))
  }

  const handleUpdateSettings = (newSettings) => {
    // TODO: Persist to Supabase
    console.log('Updating settings:', newSettings)
    setSettings(prev => ({ ...prev, ...newSettings }))
    setDailyData(prev => ({ ...prev, calorie_goal: newSettings.calorie_goal }))
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView dailyData={dailyData} todaysIntake={todaysIntake} />
      case 'history':
        return <HistoryView history={history} />
      case 'intake':
        return <IntakeView onAddEntry={handleAddEntry} />
      case 'settings':
        return <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} />
      default:
        return <DashboardView dailyData={dailyData} todaysIntake={todaysIntake} />
    }
  }

  return (
    <div className="app-container">
      <main className="main-content">
        {renderView()}
      </main>

      <nav className="nav-bar">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${currentView === 'intake' ? 'active' : ''}`}
          onClick={() => setCurrentView('intake')}
        >
          <span>➕</span>
          <span>Log</span>
        </button>
        <button
          className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          <span>📅</span>
          <span>History</span>
        </button>
        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </nav>
    </div>
  )
}

export default App
