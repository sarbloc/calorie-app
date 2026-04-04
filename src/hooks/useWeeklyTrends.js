import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Returns a YYYY-MM-DD string for a Date in local timezone.
 */
function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Short weekday label for a Date.
 */
function shortDay(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Fetch meals for the past 7 days (inclusive of today), aggregate by local date.
 * Returns { data, loading, error, refetch } where data is always 7 items:
 *   [{ date: 'YYYY-MM-DD', label: 'Mon', calories, protein, carbs, fat }]
 */
export function useWeeklyTrends(userId) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchTrends = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return

    setLoading(true)
    setError(null)

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 6) // 6 days ago + today = 7 days

    const startStr = `${formatDateStr(startDate)}T00:00:00`
    const endStr = `${formatDateStr(today)}T23:59:59.999999`

    const { data: rows, error: fetchError } = await supabase
      .from('meals')
      .select('calories, protein, carbs, fats, created_at')
      .eq('user_id', userId)
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    // Build a map keyed by local date string
    const dayMap = {}
    for (const row of (rows || [])) {
      const localDate = formatDateStr(new Date(row.created_at))
      if (!dayMap[localDate]) {
        dayMap[localDate] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
      }
      dayMap[localDate].calories += row.calories || 0
      dayMap[localDate].protein += row.protein || 0
      dayMap[localDate].carbs += row.carbs || 0
      dayMap[localDate].fat += row.fats || 0  // DB column is "fats", output as "fat"
    }

    // Build exactly 7 data points, filling zeros for missing days
    const result = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const dateStr = formatDateStr(d)
      const agg = dayMap[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 }
      result.push({
        date: dateStr,
        label: shortDay(d),
        calories: agg.calories,
        protein: agg.protein,
        carbs: agg.carbs,
        fat: agg.fat,
      })
    }

    setData(result)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  return { data, loading, error, refetch: fetchTrends }
}
