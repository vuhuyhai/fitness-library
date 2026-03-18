import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, X } from 'lucide-react'
import { login } from '../../lib/httpApi'
import { setToken } from '../../lib/auth'
import { isWails } from '../../lib/wailsApi'

const LOCK_KEY  = 'fl_admin_lock'
const FAIL_KEY  = 'fl_admin_fails'
const LOCK_SECS = 30
const MAX_FAILS = 5

function getFailCount() { return parseInt(localStorage.getItem(FAIL_KEY) ?? '0', 10) }
function setFailCount(n: number) { localStorage.setItem(FAIL_KEY, String(n)) }
function getLockUntil() { return parseInt(localStorage.getItem(LOCK_KEY) ?? '0', 10) }
function setLockUntil(ts: number) { localStorage.setItem(LOCK_KEY, String(ts)) }

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AdminLoginModal({ isOpen, onClose, onSuccess }: Props) {
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [hasError, setHasError]   = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Wails desktop: no password needed — switch directly
  useEffect(() => {
    if (isOpen && isWails) { onSuccess(); return }
    if (isOpen) {
      setPassword(''); setHasError(false); setShowPwd(false)
      // Check lock
      const remaining = Math.ceil((getLockUntil() - Date.now()) / 1000)
      if (remaining > 0) startCountdown(remaining)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [isOpen])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  function startCountdown(secs: number) {
    setCountdown(secs)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
  }

  function shake() {
    inputRef.current?.animate(
      [
        { transform: 'translateX(0)'   },
        { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)'   },
      ],
      { duration: 380, easing: 'ease-in-out' }
    )
  }

  async function handleLogin() {
    if (loading || countdown > 0) return
    const pwd = password.trim()
    if (!pwd) { inputRef.current?.focus(); return }

    setLoading(true)
    setHasError(false)

    try {
      // Web mode: POST /api/auth/login → JWT token
      const token = await login(pwd)
      setToken(token)
      setFailCount(0)
      setLockUntil(0)
      onSuccess()
    } catch {
      // Wrong password
      const fails = getFailCount() + 1
      setFailCount(fails)
      setHasError(true)
      setPassword('')
      shake()

      if (fails >= MAX_FAILS) {
        const lockUntil = Date.now() + LOCK_SECS * 1000
        setLockUntil(lockUntil)
        startCountdown(LOCK_SECS)
      }

      setTimeout(() => inputRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const isLocked = countdown > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col items-center flex-1 text-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-fg-primary">Đăng nhập Quản trị</h2>
                    <p className="text-xs text-fg-muted mt-0.5">Chỉ dành cho Vũ Hải</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error banner */}
              {hasError && !isLocked && (
                <p className="text-xs text-center text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  Sai mật khẩu. Vui lòng thử lại.
                </p>
              )}

              {/* Lock countdown */}
              {isLocked && (
                <div className="text-xs text-center text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                  Quá nhiều lần thất bại. Thử lại sau{' '}
                  <span className="font-bold">{countdown}s</span>
                </div>
              )}

              {/* Password input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fg-secondary block">Mật khẩu</label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setHasError(false) }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Nhập mật khẩu..."
                    disabled={isLocked || loading}
                    className={`w-full bg-surface-3 border rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-1 transition-colors ${
                      hasError
                        ? 'border-danger focus:border-danger focus:ring-danger/30'
                        : 'border-border focus:border-border-focus focus:ring-primary/30'
                    } disabled:opacity-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={isLocked || loading || !password}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang xác nhận...</>
                  : 'Đăng nhập'
                }
              </button>

              {/* Cancel */}
              <p className="text-center">
                <button
                  onClick={onClose}
                  className="text-xs text-fg-muted hover:text-fg-primary transition-colors"
                >
                  Huỷ
                </button>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
