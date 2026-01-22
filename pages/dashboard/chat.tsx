// pages/dashboard/chat.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

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
        setBio(data?.bio || '')
      }

      setLoading(false)
    }

    loadBio()
  }, [router])

  async function handleAsk() {
    if (!bio) {
      setError('Primero rellena tu bio en /profile')
      return
    }

    setSending(true)
    setError(null)
    setAnswer(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error llamando a Groq')
      }

      setAnswer(data.answer)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error llamando a Groq')
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="p-4">Cargando...</p>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">
          Chat Groq: resumen de tu bio
        </h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <p className="mb-2 text-sm text-gray-600">Bio actual:</p>
        <p className="mb-4 p-3 bg-gray-100 rounded">{bio || 'Sin bio'}</p>

        <button
          onClick={handleAsk}
          disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {sending ? 'Preguntando a Groq...' : 'Generar resumen con Groq'}
        </button>

        {answer && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-2">Respuesta de Groq</h2>
            <p className="p-3 bg-gray-100 rounded whitespace-pre-line">
              {answer}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
