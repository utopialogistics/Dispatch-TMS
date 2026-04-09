'use client'

import { useState } from 'react'
import type { AssignedLoad } from '../types'
import { LOAD_STATUS_STYLE, LOAD_STATUS_LABEL } from '../constants'

type Tab = 'all' | 'pending' | 'accepted' | 'in-transit'

interface Props {
  loads: AssignedLoad[]
  onStatusChange: (id: string, status: AssignedLoad['status']) => void
}

export default function LoadsView({ loads, onStatusChange }: Props) {
  const [tab, setTab] = useState<Tab>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'pending',    label: 'Pending' },
    { id: 'accepted',   label: 'Accepted' },
    { id: 'in-transit', label: 'In Transit' },
  ]

  const filtered = tab === 'all' ? loads : loads.filter((l) => l.status === tab)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center text-sm text-zinc-500 shadow-sm">
          No loads found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((load) => (
            <div key={load.id} className="rounded-xl bg-white shadow-sm">
              {/* Row header */}
              <button
                onClick={() => setExpanded(expanded === load.id ? null : load.id)}
                className="flex w-full items-center gap-4 px-6 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-zinc-900">{load.id}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LOAD_STATUS_STYLE[load.status]}`}>
                      {LOAD_STATUS_LABEL[load.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {load.origin} → {load.destination}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded === load.id ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded details */}
              {expanded === load.id && (
                <div className="border-t border-zinc-100 px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Detail label="Distance"   value={load.distance} />
                    <Detail label="Weight"     value={load.weight} />
                    <Detail label="Pickup Date" value={load.pickupDate} />
                    <Detail label="Pickup Time" value={load.pickupTime} />
                    <Detail label="Delivery Date" value={load.deliveryDate} />
                  </div>
                  {load.specialInstructions && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Special Instructions</p>
                      <p className="mt-1 text-sm text-zinc-700">{load.specialInstructions}</p>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {load.status === 'pending' && (
                      <button
                        onClick={() => onStatusChange(load.id, 'accepted')}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                      >
                        Accept Load
                      </button>
                    )}
                    {load.status === 'accepted' && (
                      <button
                        onClick={() => onStatusChange(load.id, 'in-transit')}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Start Trip
                      </button>
                    )}
                    {load.status === 'in-transit' && (
                      <button
                        onClick={() => onStatusChange(load.id, 'delivered')}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-900">{value}</p>
    </div>
  )
}
