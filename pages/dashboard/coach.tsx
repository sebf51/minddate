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
        setMessages([
          {
            role: 'assistant',
            content:
              "Hey 👋 I'm having trouble loading your profile. Please try refreshing the page or check your connection.",
          },
        ])
      } else {
        const b = data?.bio || ''
        setBio(b)
        if (b) {
          setMessages([
            {
              role: 'assistant',
              content:
                "Hey Seb 👋 I've got your bio. What would you like to work on today? Ask me anything about your dating profile, messages, or dating advice!",
            },
          ])
        } else {
          setMessages([
            {
              role: 'assistant',
              content:
                "Hey Seb 👋 First, let's fill in your dating profile. Go to the Profile page and add your bio, then come back here.",
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
      const errorMsg = 'Please fill your bio at /dashboard/profile first'
      setError(errorMsg)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
        },
      ])
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
      setError(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error from coach'
      setError(errorMessage)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        },
      ])
    } finally {
      setSending(false)
    }
  }


  if (loading) {
    return (
      <div className="dashboard-container text-center mt-8">
        <div className="loader"></div>
        <p className="mt-3">Loading coach...</p>
      </div>
    )
  }


  return (
    <div>
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Minddate</h1>
        <div className="dashboard-nav">
          <a href="/dashboard">← Dashboard</a>
          <a href="/dashboard/profile">Profile</a>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="dashboard-container">
        
        {/* COACH CARD */}
        <div className="dashboard-card">
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h2>Dating Coach 🎯</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
              Powered by AI | Your bio: <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {bio ? bio.substring(0, 50) + (bio.length > 50 ? '...' : '') : 'Not set'}
              </span>
            </p>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          {/* CHAT CONTAINER */}
          <div className="chat-container">
            
            {/* MESSAGES */}
            <div className="chat-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-message ${m.role}`}>
                  <div className="chat-message-content">
                    {m.content}
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="empty-state">
                  <p style={{ fontSize: '14px' }}>No messages yet. Start the conversation!</p>
                </div>
              )}

              {sending && (
                <div className="chat-message assistant">
                  <div className="chat-message-content">
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div className="loader" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSend} className="chat-input-group">
              <input
                type="text"
                placeholder="Ask your coach anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending}
              >
                {sending ? '⏳' : '✉️ Send'}
              </button>
            </form>

          </div>

          {/* FOOTER INFO */}
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--spacing-md)',
            textAlign: 'center'
          }}>
            💡 Tip: Be specific about what you want help with. The coach learns from your bio.
          </p>

        </div>

      </div>
    </div>
  )
}
