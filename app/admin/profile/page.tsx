'use client'

import { useAdmin } from '../AdminContext'
import ProfileView from '../components/ProfileView'

export default function ProfilePage() {
  const { uid, email, name } = useAdmin()
  return <ProfileView uid={uid} email={email} name={name} />
}
