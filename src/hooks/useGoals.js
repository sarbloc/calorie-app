import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useGoals(userId) {
  const [goals, setGoals] = useState({ calorie_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchGoals = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return

    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('target_date', todayStr())
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setGoals({
        calorie_goal: data.target_calories ?? 2000,
        protein_goal: data.target_protein ?? 150,
        carbs_goal: data.target_carbs ?? 250,
        fat_goal: data.target_fats ?? 65,
      })
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const saveGoals = async (newGoals) => {
    if (!isSupabaseConfigured || !userId) return { error: 'Not configured' }

    const { data, error } = await supabase
      .from('goals')
      .upsert([{
        user_id: userId,
        target_date: todayStr(),
        target_calories: newGoals.calorie_goal,
        target_protein: newGoals.protein_goal,
        target_carbs: newGoals.carbs_goal,
        target_fats: newGoals.fat_goal,
      }], { onConflict: 'user_id,target_date' })
      .select()
      .single()

    if (!error && data) {
      setGoals({
        calorie_goal: data.target_calories ?? 2000,
        protein_goal: data.target_protein ?? 150,
        carbs_goal: data.target_carbs ?? 250,
        fat_goal: data.target_fats ?? 65,
      })
    }

    return { data, error }
  }

  return { goals, loading, error, saveGoals, refetch: fetchGoals }
}
