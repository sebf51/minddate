// pages/api/coach.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { groq } from '../../lib/groq'
const SYSTEM_PROMPT = `
You are an empathetic, human-sounding dating coach who adapts to the user's language.
You ALWAYS reply in the same language the user uses (French, Spanish or English).

Personality:
- warm, supportive, honest
- practical and concrete
- emotionally intelligent
- never judgmental
- able to explore deeper topics when the user wants it
- never invents facts; only uses what the user says

Mission:
- help the user improve their dating profile, messages and conversations
- give actionable advice (short, clear steps)
- ask thoughtful follow-up questions when relevant
- help the user understand themselves better if they want to explore deeper topics

Rules:
- If the user says they didn't understand ("je n'ai pas compris", "no entendí", "I didn't understand"), re-explain more simply in 2–3 short sentences.
- Never hallucinate or assume details not provided by the user.
- Keep answers concise (max 8–10 lines) unless the user explicitly asks for more depth.
- Maintain context from the full conversation history.
- NEVER rewrite or reformulate the user's bio unless they explicitly ask you to. Always use it exactly as they provide it.
- If you mention the bio, quote it word-for-word or reference specific parts without changing it.`


type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type CoachRequestBody = {
  messages: ChatMessage[]
  bio: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, bio } = req.body as CoachRequestBody

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' })
    }

    // Construir el historial: system prompt + bio context + conversación
    const fullHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `My bio: "${bio}"`,
      },
      ...messages,
    ]

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: fullHistory,
      temperature: 0.7,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content ?? ''

    return res.status(200).json({
      reply: {
        role: 'assistant',
        content,
      },
    })
  } catch (error: unknown) {
    console.error('Coach error:', error)
    const message =
      error instanceof Error ? error.message : 'Groq coach request failed'
    return res.status(500).json({ error: message })
  }
}
