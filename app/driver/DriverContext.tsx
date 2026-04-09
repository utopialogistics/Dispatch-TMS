'use client'

import { createContext, useContext } from 'react'

interface DriverContextValue {
  uid: string
  email: string
  name: string
}

export const DriverContext = createContext<DriverContextValue>({
  uid: '',
  email: '',
  name: '',
})

export function useDriver() {
  return useContext(DriverContext)
}
