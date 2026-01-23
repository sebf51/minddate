// lib/coach/memory.ts
import { createClient } from '@supabase/supabase-js'
import type { ChatMessage } from '../../types/coach'

const MAX_MEMORY_LENGTH = 3000

export async function saveConversationMemory(
  userId: string,
  messages: ChatMessage[],
  botReply: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase config missing')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || ''
  const timestamp = new Date().toISOString().split('T')[0]
  const memoryEntry = `[${timestamp}] USER: ${lastUserMessage}\nBOT: ${botReply}\n---\n`

  const { data: profile } = await supabase
    .from('profiles')
    .select('conversation_memory')
    .eq('id', userId)
    .single()

  const currentMemory = profile?.conversation_memory || ''
  const updatedMemory = (currentMemory + memoryEntry).slice(-MAX_MEMORY_LENGTH)

  await supabase
    .from('profiles')
    .update({ conversation_memory: updatedMemory })
    .eq('id', userId)
}
