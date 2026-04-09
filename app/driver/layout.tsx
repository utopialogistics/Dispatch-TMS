'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserData } from '@/services/auth.service'
import { DriverContext } from './DriverContext'
import NavIcon from './components/NavIcon'
import { NAV_LINKS } from './constants'

function isActive(pathname: string, href: string) {
  return href === '/driver' ? pathname === '/driver' : pathname.startsWith(href)
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [authReady, setAuthReady]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed]     = useState(false)
  const [driverUid, setDriverUid]     = useState('')
  const [driverName, setDriverName]   = useState('Driver')
  const [driverEmail, setDriverEmail] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return }

      // Verify Firestore role
      try {
        const userData = await getUserData(user.uid)
        if (!userData || userData.role !== 'driver') {
          await signOut(auth)
          router.push('/')
          return
        }
        setDriverUid(user.uid)
        setDriverEmail(user.email ?? '')
        setDriverName((userData.name as string) ?? user.displayName ?? user.email?.split('@')[0] ?? 'Driver')
        setAuthReady(true)
      } catch {
        await signOut(auth)
        router.push('/')
      }
    })
    return unsub
  }, [router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleSignOut() {
    await signOut(auth)
    router.push('/')
  }

  const pageTitle = NAV_LINKS.find((n) => isActive(pathname, n.href))?.label ?? 'Home'

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-700" />
      </div>
    )
  }

  return (
    <DriverContext.Provider value={{ uid: driverUid, email: driverEmail, name: driverName }}>
      <div className="flex h-screen overflow-hidden bg-zinc-100">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-30 flex flex-col bg-zinc-900',
            'transition-all duration-200 ease-in-out',
            'lg:static lg:translate-x-0',
            'w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            collapsed ? 'lg:w-16' : 'lg:w-64',
          ].join(' ')}
        >
          {/* Brand */}
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 px-4">
            <span className={`shrink-0 text-2xl ${collapsed ? 'lg:hidden' : ''}`}>🚛</span>
            <span className={`overflow-hidden text-lg font-bold tracking-tight text-white transition-all duration-200 ${collapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100'}`}>
              Driver Portal
            </span>
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`hidden shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white lg:flex ${collapsed ? 'lg:mx-auto' : 'ml-auto'}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'lg:justify-center lg:px-0 lg:gap-0' : '',
                  isActive(pathname, item.href)
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                ].join(' ')}
              >
                <NavIcon id={item.id} />
                <span className={`overflow-hidden transition-all duration-200 ${collapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Driver info + Sign Out */}
          <div className="border-t border-zinc-800 p-4 space-y-3">
            <div className={`min-w-0 overflow-hidden transition-all duration-200 ${collapsed ? 'lg:h-0 lg:opacity-0' : 'opacity-100'}`}>
              <p className="truncate text-sm font-medium text-white">{driverName}</p>
              <p className="truncate text-xs text-zinc-500">{driverEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              title={collapsed ? 'Sign Out' : undefined}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-red-600 hover:text-white"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className={`overflow-hidden transition-all duration-200 ${collapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100'}`}>
                Sign Out
              </span>
            </button>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-6">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle sidebar"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-zinc-900">{pageTitle}</h2>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>

      </div>
    </DriverContext.Provider>
  )
}
