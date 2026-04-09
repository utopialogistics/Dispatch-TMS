export type DriverNavSection =
  | 'home'
  | 'loads'
  | 'history'
  | 'messages'
  | 'documents'
  | 'profile'

export interface AssignedLoad {
  id: string
  origin: string
  destination: string
  distance: string
  weight: string
  pickupDate: string
  deliveryDate: string
  pickupTime: string
  status: 'pending' | 'accepted' | 'in-transit' | 'delivered'
  specialInstructions: string
  driverUid: string
}

export interface ChatMessage {
  id: string
  fromName: string
  fromRole: 'admin' | 'driver'
  content: string
  timestamp: string
}

export interface UploadedDocument {
  id: string
  name: string
  type: string
  uploadDate: string
  status: 'verified' | 'pending'
  size: string
}

export interface DriverProfileData {
  name: string
  phone: string
  dateOfBirth: string
  address: string
  city: string
  province: string
  postalCode: string
  country: string
  licenseNumber: string
  licenseClass: string
  licenseExpiry: string
  yearsExperience: string
  vehiclePreference: string
}
