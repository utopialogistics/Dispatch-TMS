'use client'

import { useState, useEffect } from 'react'
import type { Driver } from '../types'
import DriversView from '../components/DriversView'
import { getAllDrivers, disableDriver, enableDriver, deleteDriver } from '@/services/driver.service'

export default function DriversPage() {
  const [drivers, setDrivers]               = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(true)

  useEffect(() => { fetchDrivers() }, [])

  async function fetchDrivers() {
    setDriversLoading(true)
    try {
      setDrivers(await getAllDrivers())
    } finally {
      setDriversLoading(false)
    }
  }

  async function handleToggleDriver(uid: string, disable: boolean) {
    if (!confirm(`${disable ? 'Disable' : 'Enable'} this driver?`)) return
    try {
      if (disable) {
        await disableDriver(uid)
      } else {
        await enableDriver(uid)
      }
      setDrivers((prev) =>
        prev.map((d) =>
          d.uid === uid ? { ...d, status: disable ? 'disabled' : 'active' } : d
        )
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update driver')
    }
  }

  async function handleBulkToggle(uids: string[], disable: boolean) {
    const label = disable ? 'Disable' : 'Enable'
    if (!confirm(`${label} ${uids.length} driver${uids.length !== 1 ? 's' : ''}?`)) return

    let failed = 0
    for (const uid of uids) {
      try {
        if (disable) {
          await disableDriver(uid)
        } else {
          await enableDriver(uid)
        }
      } catch {
        failed++
      }
    }

    if (failed > 0) alert(`${failed} update${failed !== 1 ? 's' : ''} failed.`)

    setDrivers((prev) =>
      prev.map((d) =>
        uids.includes(d.uid) ? { ...d, status: disable ? 'disabled' : 'active' } : d
      )
    )
  }

  async function handleDeleteDriver(uid: string) {
    if (!confirm('Permanently delete this driver? This cannot be undone.')) return
    try {
      await deleteDriver(uid)
      setDrivers((prev) => prev.filter((d) => d.uid !== uid))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete driver')
    }
  }

  return (
    <DriversView
      drivers={drivers}
      loading={driversLoading}
      onDisable={(uid) => handleToggleDriver(uid, true)}
      onEnable={(uid)  => handleToggleDriver(uid, false)}
      onDelete={handleDeleteDriver}
      onBulkDisable={(uids) => handleBulkToggle(uids, true)}
      onBulkEnable={(uids)  => handleBulkToggle(uids, false)}
    />
  )
}
