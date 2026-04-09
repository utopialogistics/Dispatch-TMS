'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDriver } from './DriverContext'
import HomeView from './components/HomeView'
import type { AssignedLoad } from './types'
import { SAMPLE_LOADS } from './constants'

export default function DriverHomePage() {
  const { uid, name } = useDriver()
  const [loads, setLoads] = useState<AssignedLoad[]>([])

  useEffect(() => {
    async function fetchLoads() {
      if (!uid) return
      try {
        const q    = query(collection(db, 'loads'), where('driverUid', '==', uid))
        const snap = await getDocs(q)
        if (snap.empty) {
          setLoads(SAMPLE_LOADS)
        } else {
          setLoads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedLoad)))
        }
      } catch {
        setLoads(SAMPLE_LOADS)
      }
    }
    fetchLoads()
  }, [uid])

  return <HomeView name={name} loads={loads} />
}
