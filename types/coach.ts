// types/coach.ts
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type OnboardingRequest = {
  mode: 'onboarding'
  messages: ChatMessage[]
  missingFields: string[]
  userId: string
}

export type CoachingRequest = {
  mode: 'coaching'
  messages: ChatMessage[]
  bio: string
  userId: string
}

export type CoachRequest = OnboardingRequest | CoachingRequest

export type CoachResponse = {
  reply?: {
    role: 'assistant'
    content: string
  }
  error?: string
}
