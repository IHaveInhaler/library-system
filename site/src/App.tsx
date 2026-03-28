import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { Navbar } from './components/layout/Navbar'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PageSpinner } from './components/ui/Spinner'
import { setupApi } from './api/setup'
import { useBrandStore } from './store/brand'

import SetupWizard from './pages/setup/SetupWizard'
import HomePage from './pages/public/HomePage'
import BooksPage from './pages/public/BooksPage'
import BookDetailPage from './pages/public/BookDetailPage'
import LibrariesPage from './pages/public/LibrariesPage'
import LibraryDetailPage from './pages/public/LibraryDetailPage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'
import ForgotPasswordPage from './pages/public/ForgotPasswordPage'
import ResetPasswordPage from './pages/public/ResetPasswordPage'
import VerifyEmailPage from './pages/public/VerifyEmailPage'
import DashboardPage from './pages/member/DashboardPage'
import ProfilePage from './pages/member/ProfilePage'
import ManagePage from './pages/admin/ManagePage'
import AdminPage from './pages/admin/AdminPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import GroupsPage from './pages/admin/GroupsPage'
import MembershipTypesPage from './pages/admin/MembershipTypesPage'
import ManageBooksPage from './pages/admin/ManageBooksPage'
import ManageLibrariesPage from './pages/admin/ManageLibrariesPage'
import LoansPage from './pages/admin/LoansPage'
import ReservationsPage from './pages/admin/ReservationsPage'
import UsersPage from './pages/admin/UsersPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function AppRoutes() {
  const [setupState, setSetupState] = useState<'loading' | 'setup' | 'ready'>('loading')
  const [setupStatus, setSetupStatus] = useState<import('./api/setup').SetupStatus | undefined>()
  const loadBrand = useBrandStore((s) => s.load)

  useEffect(() => {
    loadBrand() // Load white label settings on startup
    setupApi
      .status()
      .then((s) => {
        setSetupStatus(s)
        setSetupState(s.needsSetup ? 'setup' : 'ready')
      })
      .catch(() => setSetupState('ready'))
  }, [loadBrand])

  if (setupState === 'loading') return <PageSpinner />

  if (setupState === 'setup') {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <SetupWizard
              onComplete={() => setSetupState('ready')}
              status={setupStatus}
            />
          }
        />
      </Routes>
    )
  }

  return (
    <Routes>
      {/* Auth pages — no navbar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* All other pages — with navbar */}
      <Route
        path="*"
        element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/libraries" element={<LibrariesPage />} />
              <Route path="/libraries/:id" element={<LibraryDetailPage />} />

              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Manage section — Librarian+ */}
              <Route path="/manage" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManagePage /></ProtectedRoute>} />
              <Route path="/manage/books" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManageBooksPage /></ProtectedRoute>} />
              <Route path="/manage/libraries" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManageLibrariesPage /></ProtectedRoute>} />
              <Route path="/manage/loans" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><LoansPage /></ProtectedRoute>} />
              <Route path="/manage/reservations" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ReservationsPage /></ProtectedRoute>} />
              <Route path="/manage/users" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><UsersPage /></ProtectedRoute>} />

              {/* Admin section — ADMIN only */}
              <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
              <Route path="/admin/groups" element={<ProtectedRoute roles={['ADMIN']}><GroupsPage /></ProtectedRoute>} />
              <Route path="/admin/membership-types" element={<ProtectedRoute roles={['ADMIN']}><MembershipTypesPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute roles={['ADMIN']}><AuditLogPage /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute roles={['ADMIN']}><AdminSettingsPage /></ProtectedRoute>} />

              {/* Legacy redirects */}
              <Route path="/admin/books" element={<Navigate to="/manage/books" replace />} />
              <Route path="/admin/libraries" element={<Navigate to="/manage/libraries" replace />} />
              <Route path="/admin/loans" element={<Navigate to="/manage/loans" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="bottom-right" richColors />
        <AppRoutes />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
