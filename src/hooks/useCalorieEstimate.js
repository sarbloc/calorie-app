import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCalorieEstimate() {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const estimateCalories = async (base64Image, description, mealType) => {
    if (!supabase) {
      setError('Supabase not configured')
      return
    }

    setLoading(true)
    setError(null)
    setEstimate(null)

    try {
      const mealLabel = mealType ? mealType.toLowerCase() : null
      const prompt = [
        'Analyze this food photo and estimate the nutritional content.',
        description ? `The user describes this as: "${description}".` : '',
        mealLabel ? `This is a ${mealLabel} meal.` : '',
        '',
        'Identify each food item, estimate its portion size, and provide per-item macros.',
        'Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:',
        '{',
        '  "items": [',
        '    { "name": "food name", "portion": "amount", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }',
        '  ],',
        '  "total": { "name": "summary name", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }',
        '}',
        'Values: calories in kcal, protein/carbs/fat in grams. Use integers.',
      ].filter(Boolean).join('\n')

      const { data, error: fnError } = await supabase.functions.invoke('estimate-calories', {
        body: { message: prompt, image: base64Image },
      })

      if (fnError) {
        throw new Error(fnError.message || 'Estimation request failed')
      }

      const responseText = typeof data === 'string' ? data
        : data.reply || data.message || data.text || data.content || JSON.stringify(data)

      // Extract JSON from the response (may be wrapped in markdown code fences)
      const jsonMatch = responseText.match(/\{[\s\S]*?\}(?=[^}]*$)/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }

      // Try to find the outermost JSON object
      const fullJson = responseText.replace(/^[^{]*/, '').replace(/[^}]*$/, '')
      const parsed = JSON.parse(fullJson)

      // Support both new multi-item format and legacy single-item format
      if (parsed.total && parsed.items) {
        const total = parsed.total
        setEstimate({
          name: total.name || 'Unknown food',
          calories: parseInt(total.calories) || 0,
          protein: parseInt(total.protein) || 0,
          carbs: parseInt(total.carbs) || 0,
          fat: parseInt(total.fat) || 0,
          items: parsed.items.map((item) => ({
            name: item.name || 'Unknown item',
            portion: item.portion || '',
            calories: parseInt(item.calories) || 0,
            protein: parseInt(item.protein) || 0,
            carbs: parseInt(item.carbs) || 0,
            fat: parseInt(item.fat) || 0,
          })),
        })
      } else {
        // Backward compat: legacy single-item response
        setEstimate({
          name: parsed.name || 'Unknown food',
          calories: parseInt(parsed.calories) || 0,
          protein: parseInt(parsed.protein) || 0,
          carbs: parseInt(parsed.carbs) || 0,
          fat: parseInt(parsed.fat) || 0,
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to estimate calories')
    } finally {
      setLoading(false)
    }
  }

  const clearEstimate = () => {
    setEstimate(null)
    setError(null)
  }

  return { estimate, loading, error, estimateCalories, clearEstimate }
}
