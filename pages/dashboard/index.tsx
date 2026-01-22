import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
  bio: string | null
  age?: number | null
  marriage_intent?: string | null
}

type Match = {
  id: string
  user_id: string
  matched_user_id: string
  score: number | null
  explanation: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [generatingMatches, setGeneratingMatches] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setUserEmail(user.email ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        // Si no existe perfil, redirigir a onboarding
        router.replace('/onboarding')
        return
      }

      // Verificar si el perfil está completo (tiene age y marriage_intent)
      if (!profileData.age || !profileData.marriage_intent) {
        router.replace('/onboarding')
        return
      }

      if (profileData) {
        setProfile(profileData as Profile)
      }

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false })

      setMatches((matchesData as Match[]) || [])
      setLoading(false)
    }

    loadData()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleGenerateMatches() {
    if (!profile || !profile.bio) {
      setMatchError('Please fill your bio first')
      return
    }

    setGeneratingMatches(true)
    setMatchError(null)

    try {
      // Obtener token de sesión de Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          user_id: profile.id,
          user_bio: profile.bio,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // Reload matches from DB
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', profile.id)
        .order('score', { ascending: false })

      setMatches((matchesData as Match[]) || [])
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error generating matches'
      setMatchError(msg)
    } finally {
      setGeneratingMatches(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container text-center">
        <div className="loader mt-4"></div>
        <p className="mt-3">Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Minddate</h1>
        <div className="dashboard-nav">
          <Link href="/dashboard/profile">Editar perfil</Link>
          <Link href="/dashboard/coach">Dating Coach</Link>
          <button
            onClick={handleLogout}
            className="dashboard-logout-btn"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="dashboard-container">
        
        {/* PERFIL CARD */}
        <div className="dashboard-card">
          <h2>Mi Perfil</h2>
          <p className="profile-email">{userEmail}</p>
          {profile ? (
            <div>
              <div className="profile-row">
                <label>Nombre:</label>
                <span>{profile.full_name || 'Sin nombre'}</span>
              </div>
              <div className="profile-row">
                <label>Bio:</label>
                <span>{profile.bio || 'Sin bio'}</span>
              </div>
              <div className="mt-4">
                <Link href="/dashboard/profile" className="btn btn-primary">
                  ✎ Editar perfil
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Cargando perfil...</p>
          )}
        </div>

        {/* MATCHES CARD */}
        <div className="dashboard-card">
          <h2>Mis Matches ({matches.length})</h2>

          {/* ERROR ALERT */}
          {matchError && (
            <div className="alert alert-error mb-4">
              {matchError}
            </div>
          )}

          {/* GENERATE BUTTON */}
          <div className="mb-4">
            <button
              onClick={handleGenerateMatches}
              disabled={generatingMatches || !profile?.bio}
              className="btn btn-primary"
            >
              {generatingMatches ? '⏳ Buscando matches...' : '🔍 Generar matches'}
            </button>
            {!profile?.bio && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                ⚠️ Completa tu bio primero
              </p>
            )}
          </div>

          {/* MATCHES LIST */}
          {matches.length === 0 ? (
            <div className="empty-state">
              <p>Aún no tienes matches.</p>
              <p className="text-sm mt-2">Haz clic en "Generar matches" para encontrar perfiles compatibles.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold">
                        Usuario {match.matched_user_id.slice(0, 6)}…
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {match.explanation || 'Sin explicación'}
                      </p>
                    </div>
                    {match.score !== null && (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                        {Math.round(match.score)}% match
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
