import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Eye, EyeOff, Lock, User, Gem } from 'lucide-react'
import { cn } from '@/utils'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      const ok = await login(username.trim(), password)
      if (ok) {
        toast.success('Welcome back!')
        navigate('/', { replace: true })
      } else {
        setShake(true)
        toast.error('Invalid username or password')
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gold-50 via-white to-gold-100 px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-gold-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-gold">
          <Gem className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Padmavati Jewellers</h1>
        <p className="text-sm text-gray-500 mt-1">Girvi Management System</p>
      </div>

      {/* Card */}
      <div
        ref={formRef}
        className={cn('card w-full max-w-sm p-6', shake && 'animate-shake')}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-6">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="label">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-9"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                className="input pl-9 pr-10"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                onClick={() => setShowPass(p => !p)}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full h-11 mt-2"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Default: admin / padmavati123
        </p>
      </div>

      <p className="mt-8 text-xs text-gray-400">© 2026 Padmavati Jewellers. All rights reserved.</p>
    </div>
  )
}
