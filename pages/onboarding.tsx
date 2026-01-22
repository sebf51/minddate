import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function Onboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    age: '',
    city: '',
    country: '',
    languages: '',
    marital_status: '',
    has_children: false,
    wants_children: false,
    marriage_intent: '',
    marriage_timeline: '',
    values_family: 3,
    values_career: 3,
    values_spirituality: 3,
    values_financial: 3,
    values_freedom: 3,
    non_negotiables: '',
    looking_for: '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target
    const { name, value, type } = target
    const isInput = target instanceof HTMLInputElement
    const checked = isInput && type === 'checkbox' ? target.checked : undefined
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      setError('No estás autenticado.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        age: parseInt(form.age),
        city: form.city,
        country: form.country,
        languages: form.languages.split(',').map((l) => l.trim()),
        marital_status: form.marital_status,
        has_children: form.has_children,
        wants_children: form.wants_children,
        marriage_intent: form.marriage_intent,
        marriage_timeline: form.marriage_timeline,
        values_family: form.values_family,
        values_career: form.values_career,
        values_spirituality: form.values_spirituality,
        values_financial: form.values_financial,
        values_freedom: form.values_freedom,
        non_negotiables: form.non_negotiables,
        looking_for: form.looking_for,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Onboarding matrimonial</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="age" type="number" placeholder="Edad" value={form.age} onChange={handleChange} required className="w-full border p-2 rounded" />
        <input name="city" placeholder="Ciudad" value={form.city} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="country" placeholder="País" value={form.country} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="languages" placeholder="Idiomas (separados por coma)" value={form.languages} onChange={handleChange} className="w-full border p-2 rounded" />

        <select name="marital_status" value={form.marital_status} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="">Estado civil</option>
          <option value="single">Soltero/a</option>
          <option value="divorced">Divorciado/a</option>
          <option value="widowed">Viudo/a</option>
        </select>

        <label className="block">
          <input type="checkbox" name="has_children" checked={form.has_children} onChange={handleChange} />
          {' '}Tengo hijos
        </label>
        <label className="block">
          <input type="checkbox" name="wants_children" checked={form.wants_children} onChange={handleChange} />
          {' '}Quiero tener hijos
        </label>

        <select name="marriage_intent" value={form.marriage_intent} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="">¿Buscas matrimonio?</option>
          <option value="clear">Sí, claramente</option>
          <option value="open">Abierto, pero no urgente</option>
          <option value="unsure">No lo sé</option>
        </select>

        <select name="marriage_timeline" value={form.marriage_timeline} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="">Plazo aproximado</option>
          <option value="1-2y">1–2 años</option>
          <option value="3-5y">3–5 años</option>
          <option value="no-rush">Sin prisa</option>
        </select>

        <div className="grid grid-cols-2 gap-4">
          <label>Familia: <input type="range" name="values_family" min="1" max="5" value={form.values_family} onChange={handleChange} /></label>
          <label>Carrera: <input type="range" name="values_career" min="1" max="5" value={form.values_career} onChange={handleChange} /></label>
          <label>Espiritualidad: <input type="range" name="values_spirituality" min="1" max="5" value={form.values_spirituality} onChange={handleChange} /></label>
          <label>Finanzas: <input type="range" name="values_financial" min="1" max="5" value={form.values_financial} onChange={handleChange} /></label>
          <label>Libertad: <input type="range" name="values_freedom" min="1" max="5" value={form.values_freedom} onChange={handleChange} /></label>
        </div>

        <textarea name="non_negotiables" placeholder="No negociables (máx 3)" value={form.non_negotiables} onChange={handleChange} className="w-full border p-2 rounded" />
        <textarea name="looking_for" placeholder="¿Qué buscas en una pareja?" value={form.looking_for} onChange={handleChange} className="w-full border p-2 rounded" />

        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Guardando...' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  )
}
