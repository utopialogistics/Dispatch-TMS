'use client'

import type { AssignedLoad } from '../types'
import { LOAD_STATUS_STYLE, LOAD_STATUS_LABEL } from '../constants'

interface Props {
  name: string
  loads: AssignedLoad[]
}

export default function HomeView({ name, loads }: Props) {
  const active    = loads.filter((l) => l.status === 'in-transit').length
  const accepted  = loads.filter((l) => l.status === 'accepted').length
  const pending   = loads.filter((l) => l.status === 'pending').length
  const todayLoads = loads.filter((l) => l.status !== 'delivered')

  const stats = [
    { label: 'In Transit',  value: active,   color: 'bg-blue-500' },
    { label: 'Accepted',    value: accepted,  color: 'bg-indigo-500' },
    { label: 'Pending',     value: pending,   color: 'bg-amber-500' },
    { label: 'Total Active', value: loads.length, color: 'bg-zinc-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-xl bg-zinc-900 px-6 py-5 text-white">
        <p className="text-sm text-zinc-400">Welcome back,</p>
        <h1 className="mt-0.5 text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-zinc-400">Here&apos;s your load overview for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-5 shadow-sm">
            <div className={`mb-3 h-1.5 w-8 rounded-full ${s.color}`} />
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's loads table */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Active Loads</h2>
        </div>
        {todayLoads.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No active loads.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-6 py-3">Load ID</th>
                  <th className="px-6 py-3">Origin</th>
                  <th className="px-6 py-3">Destination</th>
                  <th className="px-6 py-3">Pickup</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {todayLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3 font-medium text-zinc-900">{load.id}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.origin}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.destination}</td>
                    <td className="px-6 py-3 text-zinc-600">{load.pickupDate} · {load.pickupTime}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LOAD_STATUS_STYLE[load.status]}`}>
                        {LOAD_STATUS_LABEL[load.status]}
                      </span>
                    </td>
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
