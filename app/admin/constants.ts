import type { Load, Section, ProfileData } from './types'

export const SAMPLE_LOADS: Load[] = [
  { id: 'LD-001', driverName: 'John Martinez',  origin: 'Dallas, TX',      destination: 'Houston, TX',  status: 'in-transit', date: '2026-04-03' },
  { id: 'LD-002', driverName: 'Sarah Johnson',   origin: 'Chicago, IL',     destination: 'Detroit, MI',  status: 'delivered',  date: '2026-04-03' },
  { id: 'LD-003', driverName: 'Mike Torres',     origin: 'Los Angeles, CA', destination: 'Phoenix, AZ',  status: 'pending',    date: '2026-04-03' },
  { id: 'LD-004', driverName: 'Lisa Chen',       origin: 'Atlanta, GA',     destination: 'Miami, FL',    status: 'in-transit', date: '2026-04-02' },
  { id: 'LD-005', driverName: 'James Wilson',    origin: 'Seattle, WA',     destination: 'Portland, OR', status: 'delivered',  date: '2026-04-02' },
]

export const STATUS_STYLE: Record<string, string> = {
  'in-transit': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  delivered:    'bg-green-50 text-green-700 ring-1 ring-green-200',
  pending:      'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

export const STATUS_LABEL: Record<string, string> = {
  'in-transit': 'In Transit',
  delivered:    'Delivered',
  pending:      'Pending',
}

export const NAV: { id: Section; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'drivers',   label: 'Manage Drivers' },
  { id: 'dispatch',  label: 'Dispatch' },
  { id: 'loads',     label: 'Active Loads' },
  { id: 'messages',  label: 'Messages' },
  { id: 'settings',  label: 'Settings' },
  { id: 'profile',   label: 'Profile' },
]

export const EMPTY_PROFILE: ProfileData = {
  name: '', phone: '', jobTitle: '', companyName: '',
  companyAddress: '', city: '', province: '', postalCode: '', country: '', companyPhone: '',
}
