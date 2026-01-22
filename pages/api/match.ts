// pages/api/match.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { groq } from '../../lib/groq'
import { supabase } from '../../lib/supabase'

type MatchResult = {
  matched_user_id: string
  score: number
  explanation: string
}

const SYSTEM_PROMPT = `
You are a dating compatibility analyzer. 
Compare two dating bios and rate their compatibility from 0-100%.
Respond ONLY with JSON: {"score": 75, "explanation": "You both love travel and outdoor activities"}
Be realistic, not overly positive.
`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, user_bio } = req.body as { user_id: string; user_bio: string }

    if (!user_id || !user_bio) {
      return res.status(400).json({ error: 'user_id and user_bio required' })
    }

    // Fetch all fake profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, bio')
      .in('id', ['fake-1', 'fake-2', 'fake-3'])

    if (profileError || !profiles || profiles.length === 0) {
      return res.status(500).json({ error: 'No profiles found' })
    }

    const matches: MatchResult[] = []

    // Compare with each profile
    for (const profile of profiles) {
      try {
        const response = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `Profile 1: "${user_bio}"\n\nProfile 2: "${profile.bio}"`,
            },
          ],
          temperature: 0.5,
          max_tokens: 100,
        })

        const content = response.choices[0]?.message?.content ?? '{}'
        const parsed = JSON.parse(content)

        matches.push({
          matched_user_id: profile.id,
          score: parsed.score || 0,
          explanation: parsed.explanation || 'Compatible profiles',
        })
      } catch (e) {
        console.error('Groq error for profile', profile.id, e)
        // Continue with next profile
      }
    }

    // Sort by score desc
    matches.sort((a, b) => b.score - a.score)

    // Save to matches table
    for (const match of matches) {
      await supabase.from('matches').upsert(
        {
          user_id,
          matched_user_id: match.matched_user_id,
          score: match.score,
          explanation: match.explanation,
        },
        { onConflict: 'user_id,matched_user_id' }
      )
    }

    return res.status(200).json({
      matches,
      message: `Found ${matches.length} potential matches!`,
    })
  } catch (error: unknown) {
    console.error('Match error:', error)
    const message =
      error instanceof Error ? error.message : 'Matching failed'
    return res.status(500).json({ error: message })
  }
}
