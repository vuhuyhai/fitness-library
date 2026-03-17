import { useState, FormEvent } from 'react'
import { Dumbbell, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { login } from '../../lib/httpApi'
import { setToken } from '../../lib/auth'

interface Props {
  onSuccess: () => void
}

export default function LoginPage({ onSuccess }: Props) {
  const [password, setPassword]   = useState('')
  const [showPwd,  setShowPwd]    = useState(false)
  const [error,    setError]      = useState('')
  const [loading,  setLoading]    = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const token = await login(password)
      setToken(token)
      onSuccess()
    } catch (err) {
      setError(String(err).replace('Error: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-fg-primary">Fitness Library</h1>
            <p className="text-sm text-fg-muted mt-0.5">Đăng nhập quản trị</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-2 border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fg-secondary mb-1.5">
                Mật khẩu Admin
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoFocus
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-fg-muted mt-6">
          Mật khẩu mặc định: <code className="text-fg-secondary">fitnesslibrary@123</code>
        </p>
      </div>
    </div>
  )
}
