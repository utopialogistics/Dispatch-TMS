'use client'

import { createContext, useContext } from 'react'

interface AdminContextValue {
  uid: string
  email: string
  name: string
}

export const AdminContext = createContext<AdminContextValue>({
  uid: '',
  email: '',
  name: '',
})

export function useAdmin() {
  return useContext(AdminContext)
}
