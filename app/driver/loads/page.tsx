'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDriver } from '../DriverContext'
import LoadsView from '../components/LoadsView'
import type { AssignedLoad } from '../types'
import { SAMPLE_LOADS } from '../constants'

export default function LoadsPage() {
  const { uid } = useDriver()
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

  async function handleStatusChange(id: string, status: AssignedLoad['status']) {
    setLoads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
    try {
      await updateDoc(doc(db, 'loads', id), { status })
    } catch {
      // optimistic update stays; Firestore update failed silently
    }
  }

  return <LoadsView loads={loads} onStatusChange={handleStatusChange} />
}
