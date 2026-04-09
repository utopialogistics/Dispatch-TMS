'use client'

import { useState, useEffect } from 'react'
import { SAMPLE_LOADS } from './constants'
import DashboardView from './components/DashboardView'
import { getAllDrivers } from '@/services/driver.service'
import { getActiveLoads, getDeliveredToday, getPendingLoads } from '@/services/load.service'

export default function AdminDashboardPage() {
  const [driverCount, setDriverCount]         = useState(0)
  const [activeLoads, setActiveLoads]         = useState(0)
  const [deliveredToday, setDeliveredToday]   = useState(0)
  const [pendingLoads, setPendingLoads]       = useState(0)

  useEffect(() => {
    async function fetchStats() {
      const [drivers, active, delivered, pending] = await Promise.all([
        getAllDrivers(),
        getActiveLoads(),
        getDeliveredToday(),
        getPendingLoads(),
      ])
      setDriverCount(drivers.length)
      setActiveLoads(active.length)
      setDeliveredToday(delivered.length)
      setPendingLoads(pending.length)
    }
    fetchStats()
  }, [])

  const stats = {
    totalDrivers:      driverCount,
    activeLoads,
    deliveredToday,
    pendingDispatches: pendingLoads,
  }

  return <DashboardView stats={stats} loads={SAMPLE_LOADS} />
}
