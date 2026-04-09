export type Section =
  | 'dashboard'
  | 'drivers'
  | 'dispatch'
  | 'loads'
  | 'messages'
  | 'settings'
  | 'profile'

export interface Driver {
  uid: string
  // flat name (older records) or decomposed first/last (newer records)
  name?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email: string
  phone?: string
  status?: 'active' | 'disabled'
  // extended fields from the comprehensive add form
  license?: { number?: string; class?: string; expiry?: string; provinceState?: string }
  yearsOfExperience?: number
  vehicleTypes?: string[]
  preferredRoutes?: string[]
  certifications?: { hazmat?: boolean; fastCard?: boolean; twicCard?: boolean }
  emergencyContact?: { name?: string; phone?: string; relationship?: string }
  address?: { street?: string; city?: string; provinceState?: string; postalZipCode?: string; country?: string }
  dateOfBirth?: string
  gender?: string
  medicalCertExpiry?: string | null
  internalNotes?: string | null
  sendWelcomeEmail?: boolean
  createdAt?: string | null   // ISO string (converted from Firestore Timestamp in page.tsx)
  disabledAt?: string | null
}

export interface Load {
  id: string
  driverName: string
  origin: string
  destination: string
  status: 'pending' | 'in-transit' | 'delivered'
  date: string
}

export type AddForm = { name: string; email: string; password: string; phone: string }

export interface ProfileData {
  name: string
  phone: string
  jobTitle: string
  companyName: string
  companyAddress: string
  city: string
  province: string
  postalCode: string
  country: string
  companyPhone: string
}
