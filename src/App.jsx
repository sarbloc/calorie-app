import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useMeals } from './hooks/useMeals'
import { useGoals } from './hooks/useGoals'
import LoginView from './views/LoginView'
import {
  LayoutDashboard, Plus, Calendar, Settings,
  PartyPopper, Target, Flame, Egg, Wheat, Droplets,
  Camera, Edit3, Trash2, Check, X, Loader2
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// ─── Donut Chart Colors (Neon Theme) ───────────────────────────────────────
const MACRO_COLORS = {
  protein: '#22C55E', // green
  carbs:   '#3B82F6', // blue
  fat:     '#F59E0B', // amber
}

function MacroDonutChart({ totals, goals }) {
  const protein = totals.total_protein || 0
  const carbs   = totals.total_carbs   || 0
  const fat     = totals.total_fat      || 0
  const total   = protein + carbs + fat

  if (total === 0) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted" style={{ fontSize: 13 }}>No macros logged yet</p>
      </div>
    )
  }

  const data = [
    { name: 'Protein', value: protein, color: MACRO_COLORS.protein },
    { name: 'Carbs',   value: carbs,   color: MACRO_COLORS.carbs   },
    { name: 'Fat',     value: fat,     color: MACRO_COLORS.fat     },
  ]

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1A1A1A',
              border: '1px solid #333',
              borderRadius: 8,
              fontSize: 13,
              color: '#fff',
            }}
            formatter={(value, name) => [`${value}g`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>{total}g</div>
        <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Total</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        {data.map(({ name, value, color }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 12, color: '#A3A3A3' }}>{name} {value}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
      <h1 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <LayoutDashboard size={24} color="#22C55E" />
        Today
      </h1>

      <div className="card glow-accent">
        <div className="card-header">
          <span className="card-title">
            <Flame size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Calories
          </span>
          <span className="text-muted">{consumed} / {calorieGoal} kcal</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-muted mt-2">
          {remaining > 0 ? (
            <>
              <Droplets size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {remaining} remaining
            </>
          ) : (
            <>
              <PartyPopper size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Goal reached!
            </>
          )}
        </p>
      </div>

      <div className="card">
        <span className="card-title">
          <Target size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Macros
        </span>
        <MacroDonutChart totals={totals} goals={g} />
        <div className="macro-grid" style={{ marginTop: 16 }}>
          {[
            { label: 'Protein', value: totals.total_protein || 0, goal: g.protein_goal || 150, icon: Egg, color: MACRO_COLORS.protein },
            { label: 'Carbs',   value: totals.total_carbs   || 0, goal: g.carbs_goal   || 250, icon: Wheat, color: MACRO_COLORS.carbs   },
            { label: 'Fat',     value: totals.total_fat      || 0, goal: g.fat_goal      ||  65, icon: Droplets, color: MACRO_COLORS.fat     },
          ].map(({ label, value, goal, icon: Icon, color }) => (
            <div key={label} className="macro-item">
              <Icon size={16} color={color} style={{ marginBottom: 4 }} />
              <div className="macro-value" style={{ color }}>{value}g</div>
              <div className="macro-label">{label}</div>
              <div className="macro-label" style={{ opacity: 0.5 }}>/ {goal}g</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="card-title">
          <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Today&apos;s Log
        </span>
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
  const [history, setHistory] = useState([])

  return (
    <div className="view">
      <h1 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={24} color="#22C55E" />
        History
      </h1>
      {history.length > 0 ? (
        history.map((day, idx) => (
          <div key={idx} className="card">
            <div className="card-header">
              <span className="card-title">
                <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {day.date}
              </span>
              <span className="text-accent">{day.total_calories} kcal</span>
            </div>
            <p className="text-muted">{day.entries?.length || 0} entries</p>
          </div>
        ))
      ) : (
        <div className="card">
          <div className="empty-state">
            <Calendar size={48} color="#666" style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No history yet. Start logging meals!</p>
          </div>
        </div>
      )}
    </div>
  )
}

function IntakeView({ userId, onAddEntry }) {
  const [mode, setMode] = useState('scan') // 'scan' | 'manual'
  const [name, setName]     = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein]   = useState('')
  const [carbs, setCarbs]       = useState('')
  const [fat, setFat]           = useState('')
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [submitted, setSubmitted]       = useState(false)

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

  const handleManualSubmit = async (e) => {
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
    setSubmitted(true)
    setSubmitting(false)
    setTimeout(() => setSubmitted(false), 2000)
  }

  return (
    <div className="view">
      <h1 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Plus size={24} color="#22C55E" />
        Log Intake
      </h1>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${mode === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, gap: 6 }}
          onClick={() => setMode('scan')}
        >
          <Camera size={16} />
          AI Photo Scan
        </button>
        <button
          className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, gap: 6 }}
          onClick={() => setMode('manual')}
        >
          <Edit3 size={16} />
          Manual Entry
        </button>
      </div>

      {mode === 'scan' ? (
        /* ── AI Photo Scan Mode ── */
        <div className="card">
          <div className="input-group">
            <label className="input-label">
              <Camera size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Upload Food Photo
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="input"
            />
          </div>
          {uploading && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              <Loader2 size={14} style={{ verticalAlign: 'middle', marginRight: 4, animation: 'spin 1s linear infinite' }} />
              Loading preview…
            </p>
          )}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              style={{ maxWidth: '100%', borderRadius: 8, marginTop: 12 }}
            />
          )}

          <div className="input-group" style={{ marginTop: 16 }}>
            <label className="input-label">Description / Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe what you're eating..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Photo + description will be sent for AI analysis.
          </p>
        </div>
      ) : (
        /* ── Manual Entry Mode ── */
        <form onSubmit={handleManualSubmit}>
          <div className="card">
            <div className="input-group">
              <label className="input-label">
                <Edit3 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Food Name
              </label>
              <input
                type="text" className="input"
                placeholder="e.g., Grilled Chicken Salad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                <Flame size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Calories (kcal)
              </label>
              <input
                type="number" className="input"
                placeholder="kcal"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                required min="0"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Protein (g)', value: protein, setter: setProtein, icon: Egg, color: MACRO_COLORS.protein },
                { label: 'Carbs (g)',   value: carbs,   setter: setCarbs,   icon: Wheat, color: MACRO_COLORS.carbs   },
                { label: 'Fat (g)',     value: fat,     setter: setFat,     icon: Droplets, color: MACRO_COLORS.fat     },
              ].map(({ label, value, setter, icon: Icon, color }) => (
                <div key={label} className="input-group">
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon size={12} color={color} />
                    {label.split(' ')[0]}
                  </label>
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
              style={{ width: '100%', marginTop: 8, gap: 6 }}
              disabled={submitting || !name || !calories}
            >
              {submitted ? (
                <>
                  <Check size={16} />
                  Added!
                </>
              ) : submitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving…
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Entry
                </>
              )}
            </button>
          </div>
        </form>
      )}
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

  // ── Dynamic macro enforcement ─────────────────────────────────────────────
  // 4 cal/g for protein & carbs, 9 cal/g for fat
  // User can type in Calories + Protein (primary), the rest auto-fills
  const [macroMode, setMacroMode] = useState('auto') // 'auto' | 'manual'

  // Calculate remaining calories after protein
  const proteinCals = (parseInt(proteinGoal) || 0) * 4
  const remainingCals = Math.max(0, (parseInt(calorieGoal) || 0) - proteinCals)

  // Suggest carbs/fat split (default 60/40)
  const suggestedCarbsCals = remainingCals * 0.6
  const suggestedFatCals = remainingCals * 0.4
  const suggestedCarbsG = Math.round(suggestedCarbsCals / 4)
  const suggestedFatG = Math.round(suggestedFatCals / 9)

  // Auto-fill when in auto mode and carbs/fat are 0 (initial)
  useEffect(() => {
    if (macroMode === 'auto') {
      const c = parseInt(calorieGoal) || 0
      const p = parseInt(proteinGoal) || 0
      if (c > 0 && p >= 0) {
        const remCals = Math.max(0, c - p * 4)
        const cCarbs = Math.round(remCals * 0.6 / 4)
        const cFat   = Math.round(remCals * 0.4 / 9)
        setCarbsGoal(cCarbs)
        setFatGoal(cFat)
      }
    }
  }, [calorieGoal, proteinGoal, macroMode])

  const handleProteinChange = (val) => {
    setProteinGoal(val)
    setMacroMode('auto')
  }

  const handleCalorieChange = (val) => {
    setCalorieGoal(val)
    setMacroMode('auto')
  }

  const handleCarbsChange = (val) => {
    setCarbsGoal(val)
    setMacroMode('manual')
  }

  const handleFatChange = (val) => {
    setFatGoal(val)
    setMacroMode('manual')
  }

  // Enforce calorie sum display
  const totalMacroCals =
    (parseInt(proteinGoal) || 0) * 4 +
    (parseInt(carbsGoal)   || 0) * 4 +
    (parseInt(fatGoal)     || 0) * 9

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

  // Percentage of calorie goal used by macros
  const caloriePct = calorieGoal > 0 ? Math.round((totalMacroCals / calorieGoal) * 100) : 0

  return (
    <div className="view">
      <h1 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Settings size={24} color="#22C55E" />
        Settings
      </h1>

      <div className="card glow-accent">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="card-title">Daily Goals</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: caloriePct <= 100 ? '#22C55E' : '#EF4444',
            }} />
            <span style={{ fontSize: 12, color: caloriePct <= 100 ? '#22C55E' : '#EF4444' }}>
              {caloriePct}% of budget
            </span>
          </div>
        </div>

        {/* Calorie Budget */}
        <div className="input-group">
          <label className="input-label">
            <Flame size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Calories (kcal)
          </label>
          <input
            type="number"
            className="input"
            style={{ width: 120, textAlign: 'right' }}
            value={calorieGoal}
            onChange={(e) => handleCalorieChange(e.target.value)}
            min="0"
          />
        </div>

        {/* Macro Percentage Wheel */}
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', gap: 4, background: '#262626',
            borderRadius: 20, padding: '4px 8px', marginBottom: 12,
          }}>
            {[
              { label: 'Auto', value: 'auto' },
              { label: 'Manual', value: 'manual' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setMacroMode(value)}
                style={{
                  padding: '4px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  background: macroMode === value ? '#22C55E' : 'transparent',
                  color: macroMode === value ? '#000' : '#A3A3A3',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Visual macro bars */}
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            {calorieGoal > 0 && (() => {
              const pCals = (parseInt(proteinGoal) || 0) * 4
              const cCals = (parseInt(carbsGoal)   || 0) * 4
              const fCals = (parseInt(fatGoal)     || 0) * 9
              const total = pCals + cCals + fCals || 1
              const scale = Math.min(calorieGoal / total, 1)
              return (
                <>
                  <div style={{ flex: pCals, background: MACRO_COLORS.protein, borderRadius: 4, transition: 'flex 0.3s' }} />
                  <div style={{ flex: cCals, background: MACRO_COLORS.carbs,   borderRadius: 4, transition: 'flex 0.3s' }} />
                  <div style={{ flex: fCals, background: MACRO_COLORS.fat,     borderRadius: 4, transition: 'flex 0.3s' }} />
                </>
              )
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: MACRO_COLORS.protein }}>
              P: {Math.round((parseInt(proteinGoal) || 0) * 4 / Math.max(calorieGoal, 1) * 100)}%
            </span>
            <span style={{ fontSize: 11, color: MACRO_COLORS.carbs }}>
              C: {Math.round((parseInt(carbsGoal) || 0) * 4 / Math.max(calorieGoal, 1) * 100)}%
            </span>
            <span style={{ fontSize: 11, color: MACRO_COLORS.fat }}>
              F: {Math.round((parseInt(fatGoal) || 0) * 9 / Math.max(calorieGoal, 1) * 100)}%
            </span>
          </div>
        </div>

        {/* Macro Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Protein (g)', value: proteinGoal, setter: handleProteinChange, icon: Egg, color: MACRO_COLORS.protein, cals: ((parseInt(proteinGoal) || 0) * 4) },
            { label: 'Carbs (g)',   value: carbsGoal,   setter: handleCarbsChange,  icon: Wheat, color: MACRO_COLORS.carbs,   cals: ((parseInt(carbsGoal) || 0) * 4)   },
            { label: 'Fat (g)',     value: fatGoal,     setter: handleFatChange,   icon: Droplets, color: MACRO_COLORS.fat,     cals: ((parseInt(fatGoal) || 0) * 9)     },
          ].map(({ label, value, setter, icon: Icon, color, cals }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <Icon size={14} color={color} style={{ marginBottom: 4 }} />
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label.split(' ')[0]}</div>
              <input
                type="number"
                className="input"
                style={{ width: '100%', textAlign: 'center', padding: '8px 4px' }}
                value={value}
                onChange={(e) => setter(e.target.value)}
                min="0"
              />
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{cals} kcal</div>
            </div>
          ))}
        </div>

        {totalMacroCals > calorieGoal && (
          <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>
            ⚠️ Macro calories ({totalMacroCals}) exceed budget ({calorieGoal})
          </p>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', gap: 6 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saved ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : saving ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Saving…
            </>
          ) : (
            <>
              <Check size={16} />
              Save Goals
            </>
          )}
        </button>
      </div>

      <div className="card">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={14} />
          Notifications
        </span>
        <div className="settings-item" style={{ marginTop: 12 }}>
          <span className="settings-label">Meal Reminders</span>
          <button
            className={`toggle ${notifications ? 'active' : ''}`}
            onClick={() => setNotifications(!notifications)}
          />
        </div>
      </div>

      <div className="card">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={14} />
          Account
        </span>
        <p className="text-muted mt-2" style={{ fontSize: 13, marginBottom: 12 }}>
          {user?.email}
        </p>
        <button className="btn btn-secondary" style={{ width: '100%', gap: 6 }} onClick={signOut}>
          <X size={16} />
          Sign Out
        </button>
      </div>

      <div className="card">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={14} />
          About
        </span>
        <p className="text-muted mt-2" style={{ fontSize: 13 }}>Calorie Tracker v0.2.0</p>
        <p className="text-muted" style={{ fontSize: 13 }}>Supabase + Telegram Mini App</p>
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
            <Loader2 size={32} color="#666" style={{ animation: 'spin 1s linear infinite' }} />
            <p className="text-muted" style={{ marginTop: 12 }}>Loading…</p>
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

  const navItems = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'intake',    icon: Plus,            label: 'Log'       },
    { key: 'history',   icon: Calendar,        label: 'History'   },
    { key: 'settings',  icon: Settings,        label: 'Settings'  },
  ]

  return (
    <div className="app-container">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <main className="main-content">{renderView()}</main>

      <nav className="nav-bar">
        {navItems.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`nav-item ${currentView === key ? 'active' : ''}`}
            onClick={() => setCurrentView(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
