import { Link } from 'react-router-dom'
import {
  BookOpen,
  Library,
  Users,
  ShieldCheck,
  CalendarClock,
  KeyRound,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useBrandStore } from '../../store/brand'

const features = [
  {
    icon: BookOpen,
    title: 'Book Catalogue',
    desc: 'Browse, search, and discover titles across your entire library network. ISBN lookup, cover art, and rich metadata for every volume.',
    accent: 'from-blue-500 to-cyan-400',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: Library,
    title: 'Library Management',
    desc: 'Multi-branch support with shelving systems, genre organisation, and per-library configuration. Everything in one place.',
    accent: 'from-violet-500 to-purple-400',
    glow: 'group-hover:shadow-violet-500/20',
  },
  {
    icon: Users,
    title: 'Membership System',
    desc: 'Flexible membership types, group assignments, and member lifecycle management with approval workflows.',
    accent: 'from-emerald-500 to-teal-400',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Staff Access Control',
    desc: 'Role-based permissions with granular overrides. Assign staff to specific branches with scoped access.',
    accent: 'from-amber-500 to-orange-400',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: CalendarClock,
    title: 'Reservations & Loans',
    desc: 'Real-time availability tracking, reservation queues, loan management, renewals, and overdue handling.',
    accent: 'from-rose-500 to-pink-400',
    glow: 'group-hover:shadow-rose-500/20',
  },
  {
    icon: KeyRound,
    title: '2FA Security',
    desc: 'TOTP-based two-factor authentication, email verification, and secure password reset flows built in.',
    accent: 'from-sky-500 to-indigo-400',
    glow: 'group-hover:shadow-sky-500/20',
  },
]

export default function LandingPage() {
  const { user } = useAuth()
  const { appName, logoUrl } = useBrandStore()

  const portalLink = '/home'

  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
      {/* ---- Top bar ---- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-7 w-7 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <BookOpen className="h-4.5 w-4.5 text-white" />
              </div>
            )}
            <span className="text-lg font-semibold tracking-tight">{appName}</span>
          </div>
          <Link
            to={portalLink}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-medium text-gray-200 ring-1 ring-white/[0.1] transition-all hover:bg-white/[0.14] hover:text-white hover:ring-white/[0.2]"
          >
            Access Portal
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
        {/* Atmospheric background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/[0.07] blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 h-[400px] w-[600px] -translate-x-1/2 translate-y-1/4 rounded-full bg-violet-600/[0.05] blur-[100px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-sm text-gray-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Open-source library management
          </div>

          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-7xl">
            Your library,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              modernised
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            A complete platform for managing books, members, loans, and branches.
            Built for libraries that take their catalogue seriously.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to={portalLink}
              className="group inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30"
            >
              Access Portal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-full px-7 py-3.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Sign in
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="h-10 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">Everything you need</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Purpose-built for library operations
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-400">
              Six core systems, one unified interface. From cataloguing a single shelf to managing a multi-branch network.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc, accent, glow }) => (
              <div
                key={title}
                className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04] hover:shadow-2xl ${glow}`}
              >
                <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${accent} p-3 shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="relative px-6 pb-32">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-blue-600/10 via-gray-900 to-violet-600/10 px-8 py-20 text-center sm:px-16">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.08] blur-[80px]" />

            <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-gray-400">
              {user
                ? 'Head to the portal to manage your books, libraries, and members.'
                : 'Sign in or create an account to explore your library catalogue.'}
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to={portalLink}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:shadow-xl"
              >
                Access Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] px-7 py-3.5 text-sm font-medium text-gray-300 transition-all hover:border-white/[0.2] hover:text-white"
                >
                  Create account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-4 w-4 rounded object-contain opacity-50" />
            ) : (
              <BookOpen className="h-4 w-4 opacity-50" />
            )}
            {appName}
          </div>
          <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
