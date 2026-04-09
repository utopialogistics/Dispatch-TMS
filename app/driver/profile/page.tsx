'use client'

import { useDriver } from '../DriverContext'
import DriverProfileView from '../components/ProfileView'

export default function ProfilePage() {
  const { uid, email, name } = useDriver()
  return <DriverProfileView uid={uid} email={email} name={name} />
}
