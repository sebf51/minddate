// lib/coach/memory.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatMessage } from '@/types/coach'

const MAX_MEMORY_LENGTH = 3000

export async function saveConversationMemory(
  supabase: SupabaseClient,
  userId: string,
  messages: ChatMessage[],
  botReply: string
): Promise<void> {
  
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
