import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function useMealHistory(userId) {
  const [uniqueMeals, setUniqueMeals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('meals')
      .select('name, description, calories, protein, carbs, fats, meal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    // Deduplicate by normalized name
    const map = new Map()
    for (const row of (data || [])) {
      const label = (row.name || row.description || '').trim()
      if (!label) continue
      const key = label.toLowerCase()
      if (map.has(key)) {
        map.get(key).logCount++
      } else {
        map.set(key, {
          name: label,
          calories: row.calories || 0,
          protein: row.protein || 0,
          carbs: row.carbs || 0,
          fats: row.fats || 0,
          mealType: row.meal_type,
          logCount: 1,
          lastLoggedAt: row.created_at,
        })
      }
    }

    const sorted = [...map.values()].sort((a, b) => b.logCount - a.logCount || new Date(b.lastLoggedAt) - new Date(a.lastLoggedAt))
    setUniqueMeals(sorted)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  return { uniqueMeals, loading, error, refetch: fetchHistory }
}
