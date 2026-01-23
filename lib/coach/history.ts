// lib/coach/history.ts
import type { ChatMessage, OnboardingRequest, CoachingRequest } from '../../types/coach'

type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function buildHistoryForOnboarding(req: OnboardingRequest, systemPrompt: string): GroqMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    ...req.messages,
  ]
}

export function buildHistoryForCoaching(req: CoachingRequest, systemPrompt: string): GroqMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `My bio: "${req.bio}"` },
    ...req.messages,
  ]
}
