'use client'

export default function PField({ label, value, editing, onChange }: {
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
}) {
  if (editing) return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
    </div>
  )
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-900">{value || '—'}</p>
    </div>
  )
}
