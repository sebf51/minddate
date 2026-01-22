import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
  bio: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data) {
        setProfile(data as Profile)
        setFullName(data.full_name || '')
        setBio(data.bio || '')
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
      })
      .eq('id', profile.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSuccess('Perfil actualizado')
    setSaving(false)
  }

  if (loading) {
    return <p className="p-4">Cargando perfil...</p>
  }

  if (!profile) {
    return <p className="p-4">No se ha encontrado perfil.</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSave}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6">Mi perfil</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-600 mb-4">{success}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <p className="text-gray-700">{profile.email}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full p-3 border rounded"
            placeholder="Tu nombre"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="w-full p-3 border rounded"
            rows={4}
            placeholder="Cuéntale a los demás algo sobre ti"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
