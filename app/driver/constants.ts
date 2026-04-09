import type { AssignedLoad, ChatMessage, UploadedDocument, DriverProfileData } from './types'
import type { DriverNavSection } from './types'

export const NAV_LINKS: { id: DriverNavSection; label: string; href: string }[] = [
  { id: 'home',      label: 'Home',      href: '/driver' },
  { id: 'loads',     label: 'My Loads',  href: '/driver/loads' },
  { id: 'history',   label: 'History',   href: '/driver/history' },
  { id: 'messages',  label: 'Messages',  href: '/driver/messages' },
  { id: 'documents', label: 'Documents', href: '/driver/documents' },
  { id: 'profile',   label: 'Profile',   href: '/driver/profile' },
]

export const SAMPLE_LOADS: AssignedLoad[] = [
  {
    id: 'LD-001',
    origin: 'Dallas, TX',
    destination: 'Houston, TX',
    distance: '239 mi',
    weight: '18,000 lbs',
    pickupDate: '2026-04-03',
    deliveryDate: '2026-04-03',
    pickupTime: '08:00 AM',
    status: 'in-transit',
    specialInstructions: 'Fragile — handle with care. Call receiver 30 min before arrival.',
    driverUid: '',
  },
  {
    id: 'LD-002',
    origin: 'Chicago, IL',
    destination: 'Detroit, MI',
    distance: '281 mi',
    weight: '22,500 lbs',
    pickupDate: '2026-04-04',
    deliveryDate: '2026-04-04',
    pickupTime: '07:30 AM',
    status: 'accepted',
    specialInstructions: 'Temperature-sensitive cargo. Keep above 50°F.',
    driverUid: '',
  },
  {
    id: 'LD-003',
    origin: 'Los Angeles, CA',
    destination: 'Phoenix, AZ',
    distance: '372 mi',
    weight: '15,000 lbs',
    pickupDate: '2026-04-05',
    deliveryDate: '2026-04-05',
    pickupTime: '06:00 AM',
    status: 'pending',
    specialInstructions: '',
    driverUid: '',
  },
]

export const SAMPLE_HISTORY: AssignedLoad[] = [
  {
    id: 'LD-H01',
    origin: 'Atlanta, GA',
    destination: 'Miami, FL',
    distance: '662 mi',
    weight: '20,000 lbs',
    pickupDate: '2026-03-28',
    deliveryDate: '2026-03-29',
    pickupTime: '07:00 AM',
    status: 'delivered',
    specialInstructions: '',
    driverUid: '',
  },
  {
    id: 'LD-H02',
    origin: 'Seattle, WA',
    destination: 'Portland, OR',
    distance: '174 mi',
    weight: '12,000 lbs',
    pickupDate: '2026-03-25',
    deliveryDate: '2026-03-25',
    pickupTime: '09:00 AM',
    status: 'delivered',
    specialInstructions: '',
    driverUid: '',
  },
  {
    id: 'LD-H03',
    origin: 'Denver, CO',
    destination: 'Salt Lake City, UT',
    distance: '525 mi',
    weight: '17,500 lbs',
    pickupDate: '2026-03-20',
    deliveryDate: '2026-03-21',
    pickupTime: '05:30 AM',
    status: 'delivered',
    specialInstructions: '',
    driverUid: '',
  },
]

export const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    fromName: 'Dispatch',
    fromRole: 'admin',
    content: 'Please confirm pickup for LD-001 by 8 AM.',
    timestamp: '2026-04-03T07:15:00Z',
  },
  {
    id: 'msg-2',
    fromName: 'You',
    fromRole: 'driver',
    content: 'Confirmed. Arriving at 7:45 AM.',
    timestamp: '2026-04-03T07:22:00Z',
  },
  {
    id: 'msg-3',
    fromName: 'Dispatch',
    fromRole: 'admin',
    content: 'Great. The receiver at Houston expects you between 1–3 PM.',
    timestamp: '2026-04-03T07:25:00Z',
  },
]

export const SAMPLE_DOCUMENTS: UploadedDocument[] = [
  { id: 'doc-1', name: 'CDL License',        type: 'License',    uploadDate: '2026-01-10', status: 'verified', size: '1.2 MB' },
  { id: 'doc-2', name: 'Medical Certificate', type: 'Medical',    uploadDate: '2026-01-10', status: 'verified', size: '854 KB' },
  { id: 'doc-3', name: 'Insurance Card',      type: 'Insurance',  uploadDate: '2026-02-14', status: 'verified', size: '620 KB' },
  { id: 'doc-4', name: 'Vehicle Inspection',  type: 'Inspection', uploadDate: '2026-03-01', status: 'pending',  size: '2.1 MB' },
]

export const LOAD_STATUS_STYLE: Record<string, string> = {
  'in-transit': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  accepted:     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  pending:      'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  delivered:    'bg-green-50 text-green-700 ring-1 ring-green-200',
}

export const LOAD_STATUS_LABEL: Record<string, string> = {
  'in-transit': 'In Transit',
  accepted:     'Accepted',
  pending:      'Pending',
  delivered:    'Delivered',
}

export const EMPTY_DRIVER_PROFILE: DriverProfileData = {
  name: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  country: '',
  licenseNumber: '',
  licenseClass: '',
  licenseExpiry: '',
  yearsExperience: '',
  vehiclePreference: '',
}
