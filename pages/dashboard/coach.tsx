// pages/dashboard/coach.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function CoachPage() {
  const router = useRouter()
  const [bio, setBio] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBio() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('bio')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        const b = data?.bio || ''
        setBio(b)
        if (b) {
          setMessages([
            {
              role: 'assistant',
              content:
                "Hey Seb 👋 I've got your bio. What would you like to work on today?",
            },
          ])
        } else {
          setMessages([
            {
              role: 'assistant',
              content:
                "Hey Seb 👋 First, let's fill in your dating profile. Go to /dashboard/profile and come back with your bio ready.",
            },
          ])
        }
      }

      setLoading(false)
    }

    loadBio()
  }, [router])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    if (!bio) {
      setError('Please fill your bio at /dashboard/profile first')
      return
    }

    setError(null)
    setSending(true)

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    }

    const newMessages = [...messages, newUserMessage]
    setMessages(newMessages)
    setInput('')

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          messages: newMessages,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Coach error')
      }

      const reply: ChatMessage = data.reply
      setMessages((prev) => [...prev, reply])
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error from coach')
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 flex flex-col h-[80vh]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Dating Coach (Groq + Sonnet)</h1>
          <p className="text-sm text-gray-600">
            Bio: <span className="font-medium">{bio || 'No bio yet'}</span>
          </p>
        </div>

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <div className="flex-1 overflow-y-auto space-y-3 mb-4 border rounded p-3 bg-gray-50">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={
                  m.role === 'user'
                    ? 'inline-block bg-blue-600 text-white px-3 py-2 rounded-lg max-w-xs'
                    : 'inline-block bg-gray-200 text-gray-900 px-3 py-2 rounded-lg max-w-xs'
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <p className="text-sm text-gray-500">Start the conversation.</p>
          )}

          {sending && (
            <div className="text-left">
              <div className="inline-block bg-gray-200 text-gray-900 px-3 py-2 rounded-lg">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2"
            placeholder="Ask your coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
