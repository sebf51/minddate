import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'


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


    setSuccess('Perfil actualizado correctamente')
    setSaving(false)
    
    // Redirect back to dashboard después de 2 segundos
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }


  if (loading) {
    return (
      <div className="dashboard-container text-center mt-8">
        <div className="loader"></div>
        <p className="mt-3">Cargando perfil...</p>
      </div>
    )
  }


  if (!profile) {
    return (
      <div className="dashboard-container mt-8">
        <div className="alert alert-error">
          No se ha encontrado perfil.
        </div>
      </div>
    )
  }


  return (
    <div>
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Minddate</h1>
        <div className="dashboard-nav">
          <a href="/dashboard">← Volver al dashboard</a>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="dashboard-container">
        
        {/* PROFILE FORM CARD */}
        <div className="dashboard-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Editar Mi Perfil</h2>

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success mb-4">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSave}>
            
            {/* EMAIL (read-only) */}
            <div className="form-group">
              <label>Email</label>
              <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-bg-main)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: '14px'
              }}>
                {profile.email}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                No se puede cambiar el email
              </p>
            </div>

            {/* FULL NAME */}
            <div className="form-group">
              <label htmlFor="fullName">Nombre</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            {/* BIO */}
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Cuéntale a los demás algo sobre ti (max 500 caracteres)"
                maxLength={500}
              />
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {bio.length} / 500 caracteres
              </p>
            </div>

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
              >
                {saving ? '💾 Guardando...' : '✓ Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn btn-outline btn-lg"
                style={{ flex: 1 }}
              >
                ✕ Cancelar
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  )
}
