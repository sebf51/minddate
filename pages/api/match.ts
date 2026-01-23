// pages/api/match.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { groq } from '../../lib/groq'

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

    // Validar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const groqApiKey = process.env.GROQ_API_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Match API] Missing Supabase environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    if (!groqApiKey) {
      console.error('[Match API] Missing GROQ_API_KEY environment variable')
      return res.status(500).json({ error: 'AI service not configured' })
    }

    // Obtener token de autenticación del header
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '') || ''

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Crear cliente Supabase autenticado
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    // Verificar que el usuario del token coincide con user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== user_id) {
      console.error('[Match API] Authentication mismatch:', {
        authError: authError?.message,
        tokenUserId: user?.id,
        requestUserId: user_id,
      })
      return res.status(403).json({ error: 'Invalid authentication' })
    }

    console.log('[Match API] Starting match generation for user:', user_id)

    // Fetch all profiles except current user
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, bio')
      .neq('id', user_id)
      .not('bio', 'is', null)
      .neq('bio', '')

    if (profileError) {
      console.error('[Match API] Error fetching profiles:', profileError)
      return res.status(500).json({ error: `Database error: ${profileError.message}` })
    }

    if (!profiles || profiles.length === 0) {
      console.log('[Match API] No profiles found for matching')
      return res.status(200).json({
        matches: [],
        message: 'No hay perfiles compatibles todavía. Vuelve a intentarlo más tarde.',
      })
    }

    console.log(`[Match API] Found ${profiles.length} profiles to compare`)

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
        
        // Parsing robusto de JSON con fallback
        let parsed
        try {
          // Intentar extraer JSON del contenido (puede venir con markdown o texto adicional)
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('No JSON found in response')
          }
        } catch (parseError) {
          console.error(
            '[Match API] JSON parse error for profile',
            profile.id,
            'Content:',
            content.substring(0, 200),
            'Error:',
            parseError
          )
          parsed = { score: 0, explanation: 'Error parsing AI response' }
        }

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

    console.log(`[Match API] Generated ${matches.length} matches, saving to database...`)

    // Validar que hay matches antes de intentar upsert
    if (matches.length === 0) {
      console.warn('[Match API] No matches generated from profiles')
      return res.status(200).json({
        matches: [],
        message: 'No matches could be generated. Please try again later.',
      })
    }

    // Save to matches table con verificación de errores
    let successCount = 0
    let errorCount = 0
    
    for (const match of matches) {
      const { error: upsertError } = await supabase
        .from('matches')
        .upsert(
          {
            user_id,
            matched_user_id: match.matched_user_id,
            score: match.score,
            explanation: match.explanation,
          },
          { onConflict: 'user_id,matched_user_id' }
        )

      if (upsertError) {
        // Verificar si es error de constraint (duplicado esperado)
        if (upsertError.code === '23505' || upsertError.message.includes('unique') || upsertError.message.includes('duplicate')) {
          console.warn('[Match API] Constraint violation (expected for duplicates):', upsertError.message)
          // Esto es normal para duplicados, contar como éxito
          successCount++
        } else {
          console.error('[Match API] Upsert error for match:', {
            user_id,
            matched_user_id: match.matched_user_id,
            error: upsertError.message,
            code: upsertError.code,
          })
          errorCount++
        }
      } else {
        successCount++
      }
    }

    console.log(`[Match API] Upsert complete: ${successCount} successful, ${errorCount} errors`)

    if (errorCount > 0 && successCount === 0) {
      return res.status(500).json({
        error: `Failed to save matches: ${errorCount} errors`,
        matches: [],
      })
    }

    return res.status(200).json({
      matches,
      message: `Found ${matches.length} potential matches! (${successCount} saved successfully)`,
    })
  } catch (error: unknown) {
    console.error('[Match API] Unexpected error:', error)
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : { message: 'Unknown error' }
    
    console.error('[Match API] Error details:', JSON.stringify(errorDetails, null, 2))
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    })
  }
}
