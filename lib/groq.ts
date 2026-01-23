// lib/groq.ts
import Groq from 'groq-sdk'

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) {
  throw new Error('GROQ_API_KEY environment variable is not set')
}

export const groq = new Groq({ apiKey })
