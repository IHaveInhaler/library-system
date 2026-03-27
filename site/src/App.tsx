import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { Navbar } from './components/layout/Navbar'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

import HomePage from './pages/public/HomePage'
import BooksPage from './pages/public/BooksPage'
import BookDetailPage from './pages/public/BookDetailPage'
import LibrariesPage from './pages/public/LibrariesPage'
import LibraryDetailPage from './pages/public/LibraryDetailPage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'
import DashboardPage from './pages/member/DashboardPage'
import ManagePage from './pages/admin/ManagePage'
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage'
import ManageBooksPage from './pages/admin/ManageBooksPage'
import ManageLibrariesPage from './pages/admin/ManageLibrariesPage'
import LoansPage from './pages/admin/LoansPage'
import UsersPage from './pages/admin/UsersPage'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Auth pages — no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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

                  {/* Manage section — Librarian+ */}
                  <Route path="/manage" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManagePage /></ProtectedRoute>} />
                  <Route path="/manage/books" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManageBooksPage /></ProtectedRoute>} />
                  <Route path="/manage/libraries" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><ManageLibrariesPage /></ProtectedRoute>} />
                  <Route path="/manage/loans" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><LoansPage /></ProtectedRoute>} />
                  <Route path="/manage/users" element={<ProtectedRoute roles={['LIBRARIAN', 'ADMIN']}><UsersPage /></ProtectedRoute>} />

                  {/* Admin section — ADMIN only */}
                  <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPermissionsPage /></ProtectedRoute>} />

                  {/* Legacy redirects */}
                  <Route path="/admin/books" element={<Navigate to="/manage/books" replace />} />
                  <Route path="/admin/libraries" element={<Navigate to="/manage/libraries" replace />} />
                  <Route path="/admin/loans" element={<Navigate to="/manage/loans" replace />} />
                  <Route path="/admin/users" element={<Navigate to="/manage/users" replace />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
