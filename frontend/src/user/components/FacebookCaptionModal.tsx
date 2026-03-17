/**
 * FacebookCaptionModal v2
 * ModalPhase state machine:
 *   composing  → editing caption (rows: [Copy] [Share FB])
 *   sharing    → FB opened, confirm row visible ([Đã mở FB ✓] + confirm row)
 *   confirming → confirm public post dialog
 *   unlocking  → progress-bar animation overlay
 *   done       → success overlay + confetti → auto calls onConfirm()
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, RefreshCw, Copy, Check, Loader2, AlertCircle, Globe, Lock,
} from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { toastInfo, toastError } from '../../lib/toast'
import { useCaptionStore, fetchCaptions } from '../stores/useCaptionStore'
import { copyToClipboard, buildCaptionWithHashtags } from '../../shared/lib/clipboard'
import type { CaptionVariant } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TONES: { tone: string; label: string; emoji: string }[] = [
  { tone: 'motivational', label: 'Truyền Cảm Hứng', emoji: '🔥' },
  { tone: 'educational',  label: 'Chia Sẻ Kiến Thức', emoji: '📚' },
  { tone: 'personal',     label: 'Cá Nhân Hóa',      emoji: '💪' },
  { tone: 'humorous',     label: 'Hài Hước',          emoji: '😄' },
  { tone: 'challenge',    label: 'Thách Thức',        emoji: '🏆' },
]

// Confetti particles: {tx, ty} = final offset from icon center, r = rotation
const CONFETTI = [
  { tx: -35, ty: -65, r: -45, color: '#c73937', delay: 0 },
  { tx:  35, ty: -72, r:  30, color: '#C8842A', delay: 50 },
  { tx: -20, ty: -82, r:  60, color: '#16a34a', delay: 100 },
  { tx:  46, ty: -55, r: -60, color: '#c73937', delay: 30 },
  { tx: -50, ty: -44, r:  90, color: '#C8842A', delay: 80 },
  { tx:  26, ty: -86, r: -30, color: '#16a34a', delay: 20 },
  { tx: -42, ty: -58, r: 120, color: '#c73937', delay: 60 },
  { tx:  52, ty: -38, r: -90, color: '#C8842A', delay: 40 },
]

type ModalPhase = 'composing' | 'sharing' | 'confirming' | 'unlocking' | 'done'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  docId: string
  docTitle: string
  shareBaseUrl: string
  onClose: () => void
  /** Called after unlock animation completes — parent handles api.unlockDocument */
  onConfirm: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacebookCaptionModal({
  docId, docTitle, shareBaseUrl, onClose, onConfirm,
}: Props) {
  const store = useCaptionStore()
  const cached    = store.getCaption(docId)
  const isLoading = store.isLoading(docId)
  const error     = store.getError(docId)

  // Caption composition state
  const [activeTone, setActiveTone]       = useState(TONES[0].tone)
  const [editedContent, setEditedContent] = useState('')
  const [activeHashtags, setActiveHashtags] = useState<Set<string>>(new Set())
  const [hasCopied, setHasCopied]         = useState(false)

  // Flow state machine
  const [phase, setPhase]               = useState<ModalPhase>('composing')
  const [unlockProgress, setProgress]   = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showGuide, setShowGuide]       = useState(false)

  // ── Fetch captions on mount if not cached ──────────────────────────────────
  useEffect(() => {
    fetchCaptions(docId, api.generateFacebookCaption)
  }, [docId])

  // ── Sync textarea when captions arrive or tone changes ─────────────────────
  useEffect(() => {
    if (!cached) return
    const variant = cached.captions.find((c) => c.tone === activeTone)
    if (variant) setEditedContent(variant.content)
    setActiveHashtags(new Set(cached.hashtags))
  }, [cached, activeTone])

  // ── Progress bar animation when unlocking ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'unlocking') return
    setProgress(0)
    setShowConfetti(false)
    const DURATION = 1200
    const start = performance.now()
    let raf: number
    const step = (now: number) => {
      const pct = Math.min(100, ((now - start) / DURATION) * 100)
      setProgress(Math.round(pct))
      if (pct < 100) {
        raf = requestAnimationFrame(step)
      } else {
        setTimeout(() => { setShowConfetti(true); setPhase('done') }, 200)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // ── After done: log event + call onConfirm ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'done') return
    const t = setTimeout(() => {
      api.logShareEvent(docId, activeTone, 'public').catch(() => {})
      onConfirm()
    }, 1000)
    return () => clearTimeout(t)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    store.clearCache(docId)
    fetchCaptions(docId, api.generateFacebookCaption)
  }, [docId, store])

  function selectTone(tone: string) {
    setActiveTone(tone)
    setHasCopied(false)
    if (cached) {
      const variant = cached.captions.find((c) => c.tone === tone)
      if (variant) setEditedContent(variant.content)
    }
  }

  function toggleHashtag(tag: string) {
    setActiveHashtags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const hashtagArr  = cached ? Array.from(activeHashtags) : []
  const fullCaption = buildCaptionWithHashtags(editedContent, hashtagArr)
  const charCount   = fullCaption.length

  const currentVariant: CaptionVariant | undefined =
    cached?.captions.find((c) => c.tone === activeTone)

  function buildShareUrl(): string {
    const pageUrl = encodeURIComponent(`${shareBaseUrl}/doc/${docId}`)
    const quote   = encodeURIComponent(editedContent.substring(0, 255))
    return `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${quote}`
  }

  async function handleCopy() {
    const ok = await copyToClipboard(fullCaption)
    if (ok) {
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2500)
    } else {
      toastError('Không thể sao chép. Hãy copy thủ công.')
    }
  }

  async function handleShareToFacebook() {
    // 1. Silent auto-copy
    await copyToClipboard(fullCaption)
    toastInfo('Caption đã được sao chép tự động 📋')

    // 2. Open browser with &quote pre-fill
    api.openBrowserURL(buildShareUrl()).catch(() => {})

    // 3. Transition to sharing phase (shows confirm row)
    setPhase('sharing')
  }

  async function handleReopenFacebook() {
    await copyToClipboard(fullCaption)
    toastInfo('Caption đã sao chép lại 📋')
    api.openBrowserURL(buildShareUrl()).catch(() => {})
    setPhase('sharing')
  }

  const isOverlay = phase === 'unlocking' || phase === 'done'
  const canClose  = phase === 'composing' || phase === 'sharing'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="caption-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
      >
        <motion.div
          key="caption-panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                <FacebookIcon />
              </div>
              <div>
                <h2 className="text-sm font-bold text-fg-primary">Tạo Caption Facebook</h2>
                <p className="text-[11px] text-fg-muted truncate max-w-[320px]">{docTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading || isOverlay}
                aria-label="Tạo lại caption"
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {canClose && (
                <button
                  onClick={onClose}
                  aria-label="Đóng"
                  className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto transition-opacity duration-300"
            style={{ opacity: isOverlay ? 0.3 : 1 }}
          >
            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-[#1877F2] animate-spin" />
                <p className="text-sm text-fg-secondary">AI đang tạo caption cho bạn…</p>
              </div>
            )}

            {/* Error */}
            {!isLoading && error && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
                <AlertCircle className="w-8 h-8 text-danger" />
                <p className="text-sm text-danger text-center">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 border border-border hover:bg-surface-2 text-fg-secondary transition-colors"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Content */}
            {!isLoading && !error && cached && (
              <div className="p-5 space-y-4">
                {/* Tone tabs */}
                <div>
                  <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-2">Chọn phong cách</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {TONES.map((t) => (
                      <button
                        key={t.tone}
                        onClick={() => selectTone(t.tone)}
                        disabled={isOverlay}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all disabled:pointer-events-none ${
                          activeTone === t.tone
                            ? 'bg-[#1877F2] border-[#1877F2] text-white font-semibold'
                            : 'bg-surface-2 border-border text-fg-secondary hover:border-[#1877F2]/50 hover:text-fg-primary'
                        }`}
                      >
                        <span>{t.emoji}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                      {currentVariant ? `${currentVariant.emoji} ${currentVariant.label}` : 'Caption'}
                    </p>
                    <span className={`text-[10px] ${charCount > 500 ? 'text-warning' : 'text-fg-muted'}`}>
                      {charCount} ký tự
                    </span>
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    disabled={isOverlay}
                    rows={5}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-[#1877F2]/60 resize-none transition-colors disabled:opacity-60"
                    placeholder="Caption đang được tạo…"
                  />
                </div>

                {/* Hashtag chips */}
                {cached.hashtags.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-fg-muted uppercase tracking-wider mb-2">Hashtags (click để bật/tắt)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cached.hashtags.map((tag) => {
                        const isActive = activeHashtags.has(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleHashtag(tag)}
                            disabled={isOverlay}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-all disabled:pointer-events-none ${
                              isActive
                                ? 'bg-[#1877F2]/10 border-[#1877F2]/40 text-[#1877F2]'
                                : 'bg-surface-3 border-border text-fg-muted opacity-50'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* FB post preview */}
                <div className="bg-surface-2 border border-border rounded-xl p-3.5">
                  <p className="text-[10px] font-medium text-fg-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FacebookIcon className="w-3 h-3 text-[#1877F2]" /> Xem trước bài đăng
                  </p>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 flex-shrink-0 flex items-center justify-center text-[#1877F2] text-xs font-bold">
                      F
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-fg-primary">Bạn</p>
                      <p className="text-xs text-fg-secondary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                        {fullCaption || <span className="text-fg-muted italic">Caption sẽ hiện ở đây…</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer (phase-dependent, animated) ──────────────────────────── */}
          {!isOverlay && (
            <div className="flex-shrink-0 border-t border-border overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {/* COMPOSING / SHARING phase footer */}
                {(phase === 'composing' || phase === 'sharing') && (
                  <motion.div
                    key="footer-main"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="px-5 pt-3.5 pb-3 space-y-2"
                  >
                    {/* Row 1 */}
                    <div className="flex gap-2">
                      {/* Copy button */}
                      <button
                        onClick={handleCopy}
                        disabled={!editedContent || isLoading}
                        className={`flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border transition-colors duration-150 flex-1 font-medium disabled:opacity-40 ${
                          hasCopied
                            ? 'bg-success/10 border-success/40 text-success'
                            : 'bg-surface-2 border-border text-fg-primary hover:bg-surface-3'
                        }`}
                      >
                        {hasCopied
                          ? <><Check className="w-4 h-4" />Đã sao chép! ✓</>
                          : <><Copy className="w-4 h-4" />Sao chép caption</>
                        }
                      </button>

                      {/* Share Facebook button */}
                      <button
                        onClick={handleShareToFacebook}
                        disabled={!editedContent || isLoading}
                        className="flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium transition-colors duration-150 flex-1 disabled:opacity-40"
                        style={{
                          background: phase === 'sharing' ? 'rgba(24,119,242,0.55)' : '#1877F2',
                          color: 'white',
                        }}
                      >
                        <FacebookIcon className="w-4 h-4" style={{ fill: 'white' }} />
                        {phase === 'sharing' ? 'Đã mở Facebook ✓' : 'Chia sẻ Facebook'}
                      </button>
                    </div>

                    {/* Row 2 — confirm row, only in sharing phase */}
                    <AnimatePresence>
                      {phase === 'sharing' && (
                        <motion.div
                          key="confirm-row"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            onClick={() => setPhase('confirming')}
                            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-success/10 border border-success/30 text-success font-semibold hover:bg-success/20 transition-colors duration-150"
                          >
                            <Check className="w-4 h-4" />
                            Tôi đã đăng công khai rồi!
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* CONFIRMING phase footer */}
                {phase === 'confirming' && (
                  <motion.div
                    key="footer-confirm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="px-5 pt-4 pb-4 space-y-3"
                  >
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-fg-primary">
                        Bài đăng của bạn có ở chế độ Công khai không?
                      </p>
                      <p className="text-xs text-fg-muted leading-relaxed">
                        Chỉ bài đăng <span className="text-fg-secondary font-medium">Công khai</span> mới mở khóa tài liệu.
                        Bài riêng tư hoặc bạn bè sẽ không hợp lệ.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {/* Không công khai → reopen */}
                      <button
                        onClick={handleReopenFacebook}
                        className="flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border border-border bg-surface-2 text-fg-secondary hover:bg-surface-3 transition-colors duration-150 flex-1"
                      >
                        <Lock className="w-4 h-4" />
                        Chưa, đổi lại
                      </button>

                      {/* Đã công khai → unlock */}
                      <button
                        onClick={() => setPhase('unlocking')}
                        className="flex items-center justify-center gap-1.5 text-sm px-5 py-2.5 rounded-lg bg-success hover:bg-green-700 text-white font-semibold transition-colors duration-150 flex-1"
                      >
                        <Globe className="w-4 h-4" />
                        Có, bài Công khai
                      </button>
                    </div>

                    {/* Collapsible guide */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowGuide((v) => !v)}
                        className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg-secondary transition-colors mx-auto block"
                      >
                        {showGuide ? 'Ẩn hướng dẫn ▲' : 'Cách đổi sang Công khai? ▼'}
                      </button>

                      <AnimatePresence>
                        {showGuide && (
                          <motion.div
                            key="guide"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-surface-2 border border-border rounded-lg p-3 text-xs text-fg-secondary space-y-1 leading-7">
                              <p className="font-medium text-fg-primary mb-0.5">Trên Facebook:</p>
                              <p>1. Mở bài vừa đăng</p>
                              <p>2. Click nút <span className="font-medium">"Bạn bè"</span> hoặc <span className="font-medium">"Chỉ mình tôi"</span></p>
                              <p>3. Chọn <span className="font-medium">"Công khai"</span> (icon 🌍)</p>
                              <p>4. Quay lại và xác nhận</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Back link */}
                    <button
                      onClick={() => { setPhase('composing'); setShowGuide(false) }}
                      className="text-xs text-fg-muted hover:text-fg-secondary transition-colors underline underline-offset-2 block mx-auto"
                    >
                      ← Quay lại
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Unlock overlay (unlocking / done) ───────────────────────────── */}
          <AnimatePresence>
            {isOverlay && (
              <motion.div
                key="unlock-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center bg-surface/80 z-20 backdrop-blur-[2px]"
              >
                <div className="text-center px-6 py-8">
                  {/* Icon + confetti container */}
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <motion.span
                      key={phase === 'done' ? 'done-icon' : 'loading-icon'}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="text-4xl select-none"
                    >
                      {phase === 'done' ? '✅' : '🔓'}
                    </motion.span>

                    {/* Confetti particles */}
                    {showConfetti && CONFETTI.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                        animate={{ x: p.tx, y: p.ty, opacity: 0, rotate: p.r, scale: 0.4 }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: p.delay / 1000 }}
                        style={{ background: p.color, position: 'absolute', width: 6, height: 6, borderRadius: 2, pointerEvents: 'none' }}
                      />
                    ))}
                  </div>

                  <motion.p
                    key={phase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-base font-bold text-fg-primary mb-4"
                  >
                    {phase === 'done'
                      ? 'Đã mở khóa! Chúc bạn đọc vui 🎉'
                      : 'Đang mở khóa...'}
                  </motion.p>

                  {/* Progress bar */}
                  {phase === 'unlocking' && (
                    <div className="w-48 h-1.5 bg-surface-3 rounded-full overflow-hidden mx-auto">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${unlockProgress}%`,
                          background: 'rgb(var(--color-primary))',
                          transition: 'width 16ms linear',
                        }}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Facebook SVG Icon ────────────────────────────────────────────────────────

function FacebookIcon({
  className = 'w-4 h-4',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
