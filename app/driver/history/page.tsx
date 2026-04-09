'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDriver } from '../DriverContext'
import HistoryView from '../components/HistoryView'
import type { AssignedLoad } from '../types'
import { SAMPLE_HISTORY } from '../constants'

export default function HistoryPage() {
  const { uid } = useDriver()
  const [loads, setLoads] = useState<AssignedLoad[]>([])

  useEffect(() => {
    async function fetchHistory() {
      if (!uid) return
      try {
        const q    = query(
          collection(db, 'loads'),
          where('driverUid', '==', uid),
          where('status', '==', 'delivered'),
        )
        const snap = await getDocs(q)
        if (snap.empty) {
          setLoads(SAMPLE_HISTORY)
        } else {
          setLoads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedLoad)))
        }
      } catch {
        setLoads(SAMPLE_HISTORY)
      }
    }
    fetchHistory()
  }, [uid])

  return <HistoryView loads={loads} />
}
