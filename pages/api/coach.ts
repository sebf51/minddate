// pages/api/coach.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { groq } from '../../lib/groq'
import { buildOnboardingPrompt, buildCoachingPrompt } from '../../lib/coach/prompts'
import { buildHistoryForOnboarding, buildHistoryForCoaching } from '../../lib/coach/history'
import { saveConversationMemory } from '../../lib/coach/memory'
import type { CoachResponse, ChatMessage } from '../../types/coach'

// Función para detectar campos faltantes del perfil
function getMissingProfileFields(profile: Record<string, unknown> | null | undefined): string[] {
  if (!profile) {
    return ['age', 'city', 'country', 'marriage_intent', 'looking_for', 'non_negotiables']
  }

  // Solo campos que realmente existen en la BD
  const required = ['age', 'city', 'country', 'marriage_intent', 'looking_for', 'non_negotiables']

  return required.filter((field) => {
    const value = profile[field]
    // Considera faltante si es null, undefined, string vacío, o array vacío
    return !value || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoachResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const groqApiKey = process.env.GROQ_API_KEY

    if (!supabaseUrl || !supabaseAnonKey || !groqApiKey) {
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(403).json({ error: 'Invalid authentication' })
    }

    // Body simplificado: solo messages y userId (opcional, usa user.id si no viene)
    const body = req.body as { messages?: ChatMessage[]; userId?: string }
    const userId = body.userId || user.id

    if (!body.messages || !Array.isArray(body.messages)) {
      return res.status(400).json({ error: 'Messages array required' })
    }

    // Cargar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Validar error de perfil (PGRST116 = no rows, es OK para usuario nuevo)
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[Coach] Profile error:', profileError)
      return res.status(500).json({ error: 'Failed to load profile' })
    }

    // Detectar campos faltantes (backend es autoridad)
    const missingFields = getMissingProfileFields(profile)
    const isOnboarding = missingFields.length > 0

    // Cargar memoria solo en coaching
    let conversationMemory: string | undefined
    if (!isOnboarding && profile) {
      conversationMemory = profile.conversation_memory || undefined
    }

    // Construir prompt e historial
    let systemPrompt: string
    let history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    if (isOnboarding) {
      systemPrompt = buildOnboardingPrompt(missingFields)
      history = buildHistoryForOnboarding(
        { mode: 'onboarding', messages: body.messages, missingFields, userId },
        systemPrompt
      )
    } else {
      const bio = profile?.bio || ''
      systemPrompt = buildCoachingPrompt()
      history = buildHistoryForCoaching(
        { mode: 'coaching', messages: body.messages, bio, userId },
        systemPrompt,
        conversationMemory
      )
    }

    // Llamar a Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: history,
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content ?? ''

    // Responder inmediatamente
    res.status(200).json({
      reply: {
        role: 'assistant',
        content,
      },
      mode: isOnboarding ? 'onboarding' : 'coaching',
      missingFields: isOnboarding ? missingFields : [],
    })

    // Guardar memoria en background (solo coaching)
    if (!isOnboarding && profile) {
      saveConversationMemory(supabase, userId, body.messages, content).catch((err) => {
        console.error('[Coach] Memory save failed:', err)
      })
    }
  } catch (error: unknown) {
    console.error('[Coach] Request failed:', error)
    const message = error instanceof Error ? error.message : 'Coach request failed'
    return res.status(500).json({ error: message })
  }
}
