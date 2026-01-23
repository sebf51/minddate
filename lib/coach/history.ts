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

export function buildHistoryForCoaching(
  req: CoachingRequest,
  systemPrompt: string,
  conversationMemory?: string
): GroqMessage[] {
  // Consolidar prompt base + memoria en UN SOLO mensaje system
  let fullSystemPrompt = systemPrompt

  if (conversationMemory && conversationMemory.trim().length > 0) {
    fullSystemPrompt += `\n\nPrevious conversation context:\n${conversationMemory}`
  }

  return [
    { role: 'system', content: fullSystemPrompt }, // ← UN SOLO system
    { role: 'user', content: `My bio: "${req.bio}"` },
    ...req.messages,
  ]
}
