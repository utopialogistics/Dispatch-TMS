'use client'

import type { AssignedLoad } from '../types'

interface Props {
  loads: AssignedLoad[]
}

export default function HistoryView({ loads }: Props) {
  const delivered = loads.filter((l) => l.status === 'delivered')

  const totalMiles = delivered.reduce((sum, l) => {
    const n = parseFloat(l.distance.replace(/[^0-9.]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const stats = [
    { label: 'Total Deliveries', value: delivered.length },
    { label: 'Total Miles',      value: `${totalMiles.toLocaleString()} mi` },
    { label: 'This Month',       value: delivered.filter((l) => l.deliveryDate.startsWith('2026-04')).length },
  ]

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* History table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Completed Loads</h2>
        </div>
        {delivered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No completed loads yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-6 py-3">Load ID</th>
                  <th className="px-6 py-3">Origin</th>
                  <th className="px-6 py-3">Destination</th>
                  <th className="px-6 py-3">Distance</th>
                  <th className="px-6 py-3">Weight</th>
                  <th className="px-6 py-3">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {delivered.map((load) => (
                  <tr key={load.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3 font-medium text-zinc-900">{load.id}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.origin}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.destination}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.distance}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.weight}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.deliveryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
