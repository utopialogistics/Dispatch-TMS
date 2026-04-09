import LeftPanel from '@/app/components/LeftPanel'
import LoginForm from '@/app/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex h-screen flex-col md:flex-row !overflow-hidden">
      <LeftPanel />
      <LoginForm />
    </div>
  )
}