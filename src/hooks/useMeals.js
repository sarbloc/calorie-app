import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Returns today's date string in YYYY-MM-DD (local time).
 */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useMeals(userId) {
  const [entries, setEntries] = useState([])
  const [totals, setTotals] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMeals = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return

    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr())
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const rows = data || []
    setEntries(rows)
    setTotals({
      total_calories: rows.reduce((s, r) => s + (r.calories || 0), 0),
      total_protein: rows.reduce((s, r) => s + (r.protein || 0), 0),
      total_carbs: rows.reduce((s, r) => s + (r.carbs || 0), 0),
      total_fat: rows.reduce((s, r) => s + (r.fat || 0), 0),
    })
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  const addMeal = async ({ name, calories, protein, carbs, fat }) => {
    if (!isSupabaseConfigured || !userId) return { error: 'Not configured' }

    const { data, error } = await supabase
      .from('meals')
      .insert([{ user_id: userId, name, calories, protein, carbs, fat, date: todayStr() }])
      .select()
      .single()

    if (!error) {
      setEntries(prev => [data, ...prev])
      setTotals(prev => ({
        total_calories: prev.total_calories + (calories || 0),
        total_protein: prev.total_protein + (protein || 0),
        total_carbs: prev.total_carbs + (carbs || 0),
        total_fat: prev.total_fat + (fat || 0),
      }))
    }

    return { data, error }
  }

  const deleteMeal = async (id) => {
    if (!isSupabaseConfigured || !userId) return { error: 'Not configured' }

    const entry = entries.find(e => e.id === id)
    const { error } = await supabase.from('meals').delete().eq('id', id).eq('user_id', userId)

    if (!error && entry) {
      setEntries(prev => prev.filter(e => e.id !== id))
      setTotals(prev => ({
        total_calories: Math.max(0, prev.total_calories - (entry.calories || 0)),
        total_protein: Math.max(0, prev.total_protein - (entry.protein || 0)),
        total_carbs: Math.max(0, prev.total_carbs - (entry.carbs || 0)),
        total_fat: Math.max(0, prev.total_fat - (entry.fat || 0)),
      }))
    }

    return { error }
  }

  return { entries, totals, loading, error, addMeal, deleteMeal, refetch: fetchMeals }
}
