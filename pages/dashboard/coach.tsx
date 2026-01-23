// pages/dashboard/coach.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'


type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ProfileData = {
  bio: string | null
  age: number | null
  city: string | null
  country: string | null
  languages: string[] | null
  marriage_intent: string | null
  looking_for: string | null
  non_negotiables: string | null
}

type PendingField =
  | 'age'
  | 'city'
  | 'country'
  | 'languages'
  | 'marriage_intent'
  | 'looking_for'
  | 'non_negotiables'

const PENDING_FIELD_QUESTIONS: Record<PendingField, string> = {
  age: '¿Cuál es tu edad?',
  city: '¿En qué ciudad vives?',
  country: '¿En qué país vives?',
  languages: '¿Qué idiomas hablas? (separados por coma)',
  marriage_intent: '¿Buscas matrimonio? (clear/open/unsure o una frase)',
  looking_for: '¿Qué buscas en una pareja?',
  non_negotiables: '¿Cuáles son tus no negociables?',
}


export default function CoachPage() {
  const router = useRouter()
  const [bio, setBio] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [pendingField, setPendingField] = useState<PendingField | null>(null)

  function getMissingFields(profile: ProfileData): PendingField[] {
    const missing: PendingField[] = []
    if (!profile.age) missing.push('age')
    if (!profile.city?.trim()) missing.push('city')
    if (!profile.country?.trim()) missing.push('country')
    if (!profile.languages || profile.languages.length === 0) missing.push('languages')
    if (!profile.marriage_intent?.trim()) missing.push('marriage_intent')
    if (!profile.looking_for?.trim()) missing.push('looking_for')
    if (!profile.non_negotiables?.trim()) missing.push('non_negotiables')
    return missing
  }


  useEffect(() => {
    async function loadBio() {
      const {
        data: { user },
      } = await supabase.auth.getUser()


      if (!user) {
        router.replace('/login')
        return
      }
      setUserId(user.id)


      const { data, error } = await supabase
        .from('profiles')
        .select('bio, age, city, country, languages, marriage_intent, looking_for, non_negotiables')
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
        const profile: ProfileData = {
          bio: data?.bio ?? null,
          age: data?.age ?? null,
          city: data?.city ?? null,
          country: data?.country ?? null,
          languages: data?.languages ?? null,
          marriage_intent: data?.marriage_intent ?? null,
          looking_for: data?.looking_for ?? null,
          non_negotiables: data?.non_negotiables ?? null,
        }
        setProfileData(profile)

        const b = profile.bio || ''
        setBio(b)

        const missingFields = getMissingFields(profile)
        const nextField = missingFields[0] || null
        setPendingField(nextField)

        if (nextField) {
          setMessages([
            {
              role: 'assistant',
              content: PENDING_FIELD_QUESTIONS[nextField],
            },
          ])
        } else if (b) {
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
    const trimmedInput = input.trim()
    if (!trimmedInput) return


    if (!bio && !pendingField) {
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


    setSaveMessage(null)
    setSaveError(null)

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: trimmedInput,
    }


    const newMessages = [...messages, newUserMessage]
    setMessages(newMessages)
    setInput('')

    if (pendingField) {
      if (!userId) {
        setSaveError('No se pudo identificar el usuario para guardar datos.')
        setSending(false)
        return
      }

      const updates: Record<string, unknown> = {}
      if (pendingField === 'age') {
        const age = Number(trimmedInput)
        if (!Number.isNaN(age)) {
          updates.age = age
        } else {
          setSaveError('Edad inválida. Escribe un número.')
          setSending(false)
          return
        }
      } else if (pendingField === 'languages') {
        updates.languages = trimmedInput
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean)
      } else {
        updates[pendingField] = trimmedInput
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        setSaveError(updateError.message)
        setSending(false)
        return
      }

      setSaveMessage('Dato guardado en tu perfil.')

      const updatedProfile: ProfileData = {
        ...(profileData || {
          bio: bio || null,
          age: null,
          city: null,
          country: null,
          languages: null,
          marriage_intent: null,
          looking_for: null,
          non_negotiables: null,
        }),
        ...updates,
      }
      setProfileData(updatedProfile)

      const missingFields = getMissingFields(updatedProfile)
      const nextField = missingFields[0] || null
      setPendingField(nextField)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: nextField
            ? PENDING_FIELD_QUESTIONS[nextField]
            : 'Gracias. Ya tengo tus datos básicos. ¿En qué te ayudo ahora?',
        },
      ])
      setSending(false)
      return
    }

    // Guardar extras si el usuario pegó un JSON manual
    const isJsonCandidate =
      trimmedInput.startsWith('{') && trimmedInput.endsWith('}')
    if (isJsonCandidate) {
      try {
        const parsed = JSON.parse(trimmedInput)
        const updates: Record<string, unknown> = {}

        if (parsed.age !== undefined) {
          const age = Number(parsed.age)
          if (!Number.isNaN(age)) updates.age = age
        }
        if (typeof parsed.city === 'string') updates.city = parsed.city
        if (typeof parsed.country === 'string') updates.country = parsed.country
        if (parsed.languages !== undefined) {
          if (Array.isArray(parsed.languages)) {
            updates.languages = parsed.languages
          } else if (typeof parsed.languages === 'string') {
            updates.languages = parsed.languages
              .split(',')
              .map((l: string) => l.trim())
              .filter(Boolean)
          }
        }
        if (typeof parsed.marriage_intent === 'string') {
          updates.marriage_intent = parsed.marriage_intent
        }
        if (typeof parsed.looking_for === 'string') {
          updates.looking_for = parsed.looking_for
        }
        if (typeof parsed.non_negotiables === 'string') {
          updates.non_negotiables = parsed.non_negotiables
        }

        if (!userId) {
          setSaveError('No se pudo identificar el usuario para guardar datos.')
        } else if (Object.keys(updates).length === 0) {
          setSaveError('JSON válido, pero sin campos reconocidos para guardar.')
        } else {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

          if (updateError) {
            setSaveError(updateError.message)
          } else {
            setSaveMessage('Datos guardados en tu perfil.')
          }
        }
      } catch (e) {
        setSaveError('JSON no válido. Usa un objeto con llaves: { ... }')
      }
    }


    try {
      // Validar que userId esté disponible
      if (!userId) {
        setError('No se pudo identificar el usuario')
        setSending(false)
        return
      }

      // Obtener token de sesión para autenticación
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      if (!token) {
        setError('No estás autenticado. Por favor, inicia sesión de nuevo.')
        setSending(false)
        return
      }

      // Frontend simplificado: solo envía messages y userId
      // Backend decide el modo automáticamente
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          userId: userId,
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
          {saveError && (
            <div className="alert alert-error mb-4">
              {saveError}
            </div>
          )}
          {saveMessage && (
            <div className="alert alert-success mb-4">
              {saveMessage}
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
