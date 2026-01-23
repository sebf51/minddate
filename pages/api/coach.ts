// pages/api/coach.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { groq } from '../../lib/groq'
import { buildOnboardingPrompt, buildCoachingPrompt } from '../../lib/coach/prompts'
import { buildHistoryForOnboarding, buildHistoryForCoaching } from '../../lib/coach/history'
import { saveConversationMemory } from '../../lib/coach/memory'
import type { CoachRequest, CoachResponse } from '../../types/coach'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoachResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as CoachRequest

    // Validación básica
    if (!body.messages || !Array.isArray(body.messages)) {
      return res.status(400).json({ error: 'Messages array required' })
    }
    if (!body.userId) {
      return res.status(400).json({ error: 'userId required' })
    }

    // Construir prompt e historial según modo
    let systemPrompt: string
    let history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

    if (body.mode === 'onboarding') {
      systemPrompt = buildOnboardingPrompt(body.missingFields)
      history = buildHistoryForOnboarding(body, systemPrompt)
    } else {
      systemPrompt = buildCoachingPrompt()
      history = buildHistoryForCoaching(body, systemPrompt)
    }

    // Llamar a Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: history,
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content ?? ''

    // Guardar memoria solo en modo coaching (sin bloquear respuesta)
    if (body.mode === 'coaching') {
      saveConversationMemory(body.userId, body.messages, content).catch((err) => {
        console.error('[Coach] Memory save failed:', err)
      })
    }

    return res.status(200).json({
      reply: {
        role: 'assistant',
        content,
      },
    })
  } catch (error: unknown) {
    console.error('[Coach] Request failed:', error)
    const message = error instanceof Error ? error.message : 'Coach request failed'
    return res.status(500).json({ error: message })
  }
}
