import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, LayoutDashboard, LogOut, Settings, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, useLogout, useMe, useRole } from '../../hooks/useAuth'
import { librariesApi } from '../../api/libraries'
import { useBrandStore } from '../../store/brand'
import { Button } from '../ui/Button'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const { user, accessToken } = useAuth()
  const { isLibrarian, isAdmin } = useRole()
  const logout = useLogout()
  const navigate = useNavigate()
  const { appName, logoUrl } = useBrandStore()
  const { data: me } = useMe()
  const locked2FA = !!accessToken && !!me?.requires2FASetup

  const { data: libraryCount } = useQuery({
    queryKey: ['libraries', 'count'],
    queryFn: () => librariesApi.list({ limit: 1 }),
    staleTime: 60_000,
    enabled: !locked2FA,
  })
  const singleLibrary = !isLibrarian && libraryCount?.meta.total === 1

  const handleLogout = async () => {
    await logout.mutateAsync()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'nav-active'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
    }`

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to={locked2FA ? '/profile' : '/home'} className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-6 w-6 rounded object-contain" />
            ) : (
              <BookOpen className="h-5 w-5 text-primary" />
            )}
            {appName}
          </Link>
          {!locked2FA && <NavLink to="/books" className={linkClass}>Books</NavLink>}
          {!locked2FA && <NavLink to="/libraries" className={linkClass}>{singleLibrary ? 'Library' : 'Libraries'}</NavLink>}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {user ? (
            <>
              {!locked2FA && (
                <>
                  <NavLink to="/dashboard" className={linkClass}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </NavLink>
                  {isLibrarian && (
                    <NavLink to="/manage" className={linkClass}>
                      <Settings className="h-4 w-4" />
                      Manage
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/admin" className={linkClass}>
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </NavLink>
                  )}
                </>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
              <Link to="/profile" title="Profile & Security">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.firstName} className="h-7 w-7 rounded-full object-cover hover:ring-2 hover:ring-blue-500" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 hover:ring-2 hover:ring-blue-500 dark:bg-blue-900 dark:text-blue-300">
                    {user.firstName[0]}{user.lastName?.[0] ?? ''}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
