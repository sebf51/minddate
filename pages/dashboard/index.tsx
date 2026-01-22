import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  email: string
  full_name: string | null
  bio: string | null
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

  if (loading) {
    return <p className="p-4">Cargando dashboard...</p>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Minddate Dashboard</h1>
        <div className="space-x-4">
        <Link href="/profile" className="text-blue-600 underline">
  Editar perfil
</Link>
<Link href="/dashboard/chat" className="text-blue-600 underline">
  Chat Groq
</Link>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Mi Perfil</h2>
        <p className="text-gray-600">{userEmail}</p>
        {profile && (
          <>
            <p className="mt-2">
              <strong>Nombre:</strong> {profile.full_name || 'Sin nombre'}
            </p>
            <p>
              <strong>Bio:</strong> {profile.bio || 'Sin bio'}
            </p>
          </>
        )}
      </div>

      {/* Matches */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          Mis Matches ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="text-gray-500">
            Aún no tienes matches. Pronto añadiremos un botón para generarlos con Groq.
          </p>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">
                      Usuario {match.matched_user_id.slice(0, 6)}…
                    </h3>
                    <p className="text-sm text-gray-600">
                      {match.explanation || 'Sin explicación'}
                    </p>
                  </div>
                  {match.score !== null && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
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
  )
}
