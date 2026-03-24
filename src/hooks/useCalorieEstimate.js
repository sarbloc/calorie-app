import { useState } from 'react'

const HOOKS_URL = import.meta.env.VITE_OPENCLAW_HOOKS_URL
const HOOKS_TOKEN = import.meta.env.VITE_OPENCLAW_HOOKS_TOKEN

export function useCalorieEstimate() {
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const estimateCalories = async (base64Image, description) => {
    if (!HOOKS_URL || !HOOKS_TOKEN) {
      setError('OpenClaw webhook not configured')
      return
    }

    setLoading(true)
    setError(null)
    setEstimate(null)

    try {
      const prompt = [
        'Analyze this food photo and estimate the nutritional content.',
        description ? `The user describes it as: "${description}"` : '',
        '',
        'Respond with ONLY a JSON object in this exact format, no other text:',
        '{ "name": "food name", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }',
        'Values: calories in kcal, protein/carbs/fat in grams. Use integers.',
      ].filter(Boolean).join('\n')

      const res = await fetch(`${HOOKS_URL}/estimate-calories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOOKS_TOKEN}`,
        },
        body: JSON.stringify({
          message: prompt,
          image: base64Image,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Webhook returned ${res.status}`)
      }

      const data = await res.json()
      const responseText = typeof data === 'string' ? data
        : data.reply || data.message || data.text || data.content || JSON.stringify(data)

      // Extract JSON from the response (may be wrapped in markdown code fences)
      const jsonMatch = responseText.match(/\{[\s\S]*?"name"[\s\S]*?"calories"[\s\S]*?\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      setEstimate({
        name: parsed.name || 'Unknown food',
        calories: parseInt(parsed.calories) || 0,
        protein: parseInt(parsed.protein) || 0,
        carbs: parseInt(parsed.carbs) || 0,
        fat: parseInt(parsed.fat) || 0,
      })
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
