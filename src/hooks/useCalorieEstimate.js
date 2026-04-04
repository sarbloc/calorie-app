import { useState } from 'react'
import { supabase } from '../lib/supabase'

function extractJson(text) {
  // Strip markdown code fences
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  // Find outermost JSON object via brace-depth matching
  let depth = 0
  let start = -1
  let end = -1
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (clean[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        end = i + 1
        break
      }
    }
  }

  if (start === -1 || end === -1) return null
  return clean.substring(start, end)
}

export function useCalorieEstimate() {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const estimateCalories = async (base64Image, description, mealType) => {
    if (!supabase) {
      setError('Supabase not configured')
      return
    }

    if (!base64Image && !description?.trim()) {
      setError('Provide a photo or describe what you ate')
      return
    }

    setLoading(true)
    setError(null)
    setEstimate(null)

    try {
      const hasImage = !!base64Image
      const mealLabel = mealType ? mealType.toLowerCase() : null

      const prompt = [
        hasImage
          ? 'Analyze this food photo and estimate the nutritional content.'
          : 'Estimate the nutritional content of the following food.',
        description ? `The user describes this as: "${description}".` : '',
        mealLabel ? `This is a ${mealLabel} meal.` : '',
        '',
        hasImage
          ? 'Identify each food item visible, estimate its portion size, and provide per-item macros.'
          : 'For each food item mentioned, estimate a typical portion size and provide per-item macros.',
        'Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:',
        '{"items":[{"name":"food name","portion":"amount","calories":0,"protein":0,"carbs":0,"fat":0}],"total":{"name":"summary name","calories":0,"protein":0,"carbs":0,"fat":0}}',
        'Values: calories in kcal, protein/carbs/fat in grams. Use integers.',
      ].filter(Boolean).join('\n')

      const body = { message: prompt }
      if (base64Image) {
        body.image = base64Image
      }

      const { data, error: fnError } = await supabase.functions.invoke('estimate-calories', {
        body,
      })

      if (fnError) {
        throw new Error(fnError.message || 'Estimation request failed')
      }

      const responseText = typeof data === 'string' ? data
        : data.reply || data.message || data.text || data.content || JSON.stringify(data)

      // Extract JSON using brace-depth matching
      const jsonStr = extractJson(responseText)
      if (!jsonStr) {
        throw new Error('Could not find JSON in AI response. Raw: ' + responseText.substring(0, 200))
      }

      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseErr) {
        throw new Error('Invalid JSON from AI. Raw: ' + jsonStr.substring(0, 200))
      }

      // Support both multi-item format and legacy single-item format
      if (parsed.total && parsed.items) {
        const total = parsed.total
        setEstimate({
          name: total.name || description || 'AI Estimate',
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
        setEstimate({
          name: parsed.name || description || 'AI Estimate',
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
