import { Suspense, lazy, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useRiskUpdate } from '@/hooks'
import { AlertCircle, RefreshCw } from 'lucide-react'

// ─── Lazy Pages ───────────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const GirviListPage      = lazy(() => import('@/pages/GirviListPage'))
const NewGirviPage       = lazy(() => import('@/pages/NewGirviPage'))
const GirviDetailPage    = lazy(() => import('@/pages/GirviDetailPage'))
const CollectPaymentPage = lazy(() => import('@/pages/CollectPaymentPage'))
const CustomerListPage   = lazy(() => import('@/pages/CustomerListPage'))
const CustomerProfilePage= lazy(() => import('@/pages/CustomerProfilePage'))
const ReportsPage        = lazy(() => import('@/pages/ReportsPage'))
const SettingsPage       = lazy(() => import('@/pages/SettingsPage'))

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error): EBState { return { hasError: true, error } }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="card p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-bold text-lg text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6 break-words">{this.state.error?.message}</p>
          <button className="btn-primary w-full" onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}>
            <RefreshCw className="w-4 h-4" /> Reload App
          </button>
        </div>
      </div>
    )
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4 animate-pulse">
      <div className="h-14 bg-white rounded-2xl" />
      <div className="h-40 bg-white rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl" />)}
      </div>
      <div className="h-32 bg-white rounded-2xl" />
    </div>
  )
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { checkSession } = useAuthStore()
  return checkSession() ? <>{children}</> : <Navigate to="/login" replace />
}

// ─── App Init ─────────────────────────────────────────────────────────────────
function AppInit({ children }: { children: ReactNode }) {
  useRiskUpdate()
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', maxWidth: '340px' },
            success: { iconTheme: { primary: '#D4A017', secondary: '#fff' } },
          }}
        />
        <Suspense fallback={<PageSkeleton />}>
          <AppInit>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/girvi" element={<ProtectedRoute><GirviListPage /></ProtectedRoute>} />
              <Route path="/girvi/new" element={<ProtectedRoute><NewGirviPage /></ProtectedRoute>} />
              <Route path="/girvi/:id" element={<ProtectedRoute><GirviDetailPage /></ProtectedRoute>} />
              <Route path="/girvi/:id/payment" element={<ProtectedRoute><CollectPaymentPage /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><CustomerListPage /></ProtectedRoute>} />
              <Route path="/customers/:id" element={<ProtectedRoute><CustomerProfilePage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppInit>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
