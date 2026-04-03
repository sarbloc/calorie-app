import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Returns today's date string in YYYY-MM-DD (local time).
 */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Convert a base64 data URL to a Blob suitable for upload.
 */
function base64ToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

/**
 * Get a signed URL for a meal photo stored in the meal_photos bucket.
 * Returns null if the path is falsy or the request fails.
 */
export async function getMealPhotoUrl(photoPath) {
  if (!photoPath || !isSupabaseConfigured) return null
  const { data, error } = await supabase.storage
    .from('meal_photos')
    .createSignedUrl(photoPath, 3600)
  if (error) {
    console.error('[getMealPhotoUrl] Failed to create signed URL:', error.message)
    return null
  }
  return data?.signedUrl ?? null
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

    const startOfDay = `${todayStr()}T00:00:00`
    const endOfDay   = `${todayStr()}T23:59:59.999999`
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
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
      total_fat: rows.reduce((s, r) => s + (r.fats || 0), 0),
    })
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  const addMeal = async ({ name, calories, protein, carbs, fat, mealType = 'SNACK', photoBase64 = null }) => {
    if (!isSupabaseConfigured || !userId) return { error: 'Not configured' }

    // Insert the meal first (without photo_path)
    const { data, error } = await supabase
      .from('meals')
      .insert([{ user_id: userId, description: name, meal_type: mealType, calories, protein, carbs, fats: fat }])
      .select()
      .single()

    if (error) return { data, error }

    // Optimistically add to local state immediately so UI feels fast
    setEntries(prev => [data, ...prev])
    setTotals(prev => ({
      total_calories: prev.total_calories + (calories || 0),
      total_protein: prev.total_protein + (protein || 0),
      total_carbs: prev.total_carbs + (carbs || 0),
      total_fat: prev.total_fat + (fat || 0),
    }))

    // Upload photo in background if provided
    if (photoBase64 && data?.id) {
      try {
        const blob = base64ToBlob(photoBase64)
        const photoPath = `${userId}/${data.id}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('meal_photos')
          .upload(photoPath, blob, { contentType: 'image/jpeg', upsert: false })

        if (uploadError) {
          console.error('[addMeal] Photo upload failed:', uploadError.message)
        } else {
          // Update the meal record with the photo path
          const { error: updateError } = await supabase
            .from('meals')
            .update({ photo_path: photoPath })
            .eq('id', data.id)

          if (updateError) {
            console.error('[addMeal] Failed to save photo_path:', updateError.message)
          } else {
            // Update local state with photo_path
            setEntries(prev => prev.map(e => e.id === data.id ? { ...e, photo_path: photoPath } : e))
          }
        }
      } catch (err) {
        console.error('[addMeal] Photo processing error:', err)
      }
    }

    return { data, error: null }
  }

  const deleteMeal = async (id) => {
    if (!isSupabaseConfigured || !userId) return { error: 'Not configured' }

    const entry = entries.find(e => e.id === id)

    const { error } = await supabase.from('meals').delete().eq('id', id).eq('user_id', userId)

    if (!error && entry) {
      // Delete photo from storage after DB delete succeeds
      if (entry.photo_path) {
        const { error: storageError } = await supabase.storage
          .from('meal_photos')
          .remove([entry.photo_path])
        if (storageError) {
          console.error('[deleteMeal] Failed to delete photo:', storageError.message)
        }
      }

      setEntries(prev => prev.filter(e => e.id !== id))
      setTotals(prev => ({
        total_calories: Math.max(0, prev.total_calories - (entry.calories || 0)),
        total_protein: Math.max(0, prev.total_protein - (entry.protein || 0)),
        total_carbs: Math.max(0, prev.total_carbs - (entry.carbs || 0)),
        total_fat: Math.max(0, prev.total_fat - (entry.fats || 0)),
      }))
    }

    return { error }
  }

  return { entries, totals, loading, error, addMeal, deleteMeal, refetch: fetchMeals }
}
