import type { Load } from '../types'
import { STATUS_STYLE, STATUS_LABEL } from '../constants'

export default function DashboardView({
  stats,
  loads,
}: {
  stats: Record<string, number>
  loads: Load[]
}) {
  const cards = [
    { label: 'Total Drivers',      value: stats.totalDrivers,      color: 'text-indigo-600' },
    { label: 'Active Loads',        value: stats.activeLoads,        color: 'text-blue-600'   },
    { label: 'Delivered Today',     value: stats.deliveredToday,     color: 'text-green-600'  },
    { label: 'Pending Dispatches',  value: stats.pendingDispatches,  color: 'text-amber-600'  },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{card.label}</p>
            <p className={`mt-2 text-4xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent loads */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h3 className="font-semibold text-zinc-900">Recent Loads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">
                {['Load ID', 'Driver', 'Origin', 'Destination', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loads.map((load) => (
                <tr key={load.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-zinc-600">{load.id}</td>
                  <td className="px-6 py-4 font-medium text-zinc-800">{load.driverName}</td>
                  <td className="px-6 py-4 text-zinc-600">{load.origin}</td>
                  <td className="px-6 py-4 text-zinc-600">{load.destination}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[load.status]}`}>
                      {STATUS_LABEL[load.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{load.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
