// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { groq } from '../../lib/groq'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { bio } = req.body as { bio: string }

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      // o: model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content:
            'Tu es un dating coach. Fais un résumé court, concret et actionnable de ce profil.',
        },
        { role: 'user', content: bio },
      ],
    })

    const content = response.choices[0]?.message?.content ?? ''
    return res.status(200).json({ answer: content })
  } catch (error: unknown) {
    console.error('Groq error:', error)
    const message =
      error instanceof Error ? error.message : 'Groq request failed'
    return res.status(500).json({ error: message })
  }
}
