/**
 * TermTooltip — React-portal popup for fitness term explanations.
 * Phases: 'mini' (compact badge) → 'card' (full explanation card).
 */
import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ChevronRight, Wifi, WifiOff, X } from 'lucide-react'
import { useTermStore } from '../stores/useTermStore'
import type { TermExplanation } from '../../types'

interface Props {
  term: string
  context: string
  catId: string
  /** Bounding rect of the selected text (viewport coords) */
  anchorRect: DOMRect
  onClose: () => void
}

export default function TermTooltip({ term, context, catId, anchorRect, onClose }: Props) {
  const [phase, setPhase] = useState<'mini' | 'card'>('mini')
  const [result, setResult] = useState<TermExplanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [relatedTerm, setRelatedTerm] = useState<string | null>(null)

  const explainTerm = useTermStore((s) => s.explainTerm)
  const getCached = useTermStore((s) => s.getCached)
  const cardRef = useRef<HTMLDivElement>(null)

  // Position: above the selection, centered
  const tooltipLeft = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2,
    window.innerWidth - 8,
  ))
  const tooltipTop = anchorRect.top + window.scrollY - 8

  // Load explanation when expanding to card
  async function expand() {
    setPhase('card')
    const key = relatedTerm ?? term

    const cached = getCached(key)
    if (cached) {
      setResult(cached)
      return
    }
    setLoading(true)
    const res = await explainTerm(key, context, catId)
    setLoading(false)
    if (res) setResult(res)
  }

  // Related term chain
  async function handleRelated(t: string) {
    setRelatedTerm(t)
    setResult(null)
    setLoading(true)
    const res = await explainTerm(t, '', catId)
    setLoading(false)
    if (res) setResult(res)
  }

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const displayTerm = relatedTerm ?? term

  const tooltip = (
    <AnimatePresence mode="wait">
      {phase === 'mini' ? (
        <motion.button
          key="mini"
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 6 }}
          transition={{ duration: 0.15 }}
          onClick={expand}
          className="fixed z-[9999] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-success/40 shadow-lg text-xs font-medium text-success hover:bg-success/10 transition-colors cursor-pointer"
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="text-[10px]">💡</span>
          Giải thích: <span className="font-semibold">{term}</span>
          <ChevronRight className="w-3 h-3" />
        </motion.button>
      ) : (
        <motion.div
          key="card"
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-[9999] w-80 bg-surface border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            left: Math.min(tooltipLeft, window.innerWidth - 328),
            top: Math.max(8, tooltipTop - 280),
            transform: 'translate(-50%, 0)',
          }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-surface-2/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-fg-primary">{displayTerm}</span>
              {result && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                  result.isOffline
                    ? 'bg-info/10 text-info border border-info/20'
                    : 'bg-success/10 text-success border border-success/20'
                }`}>
                  {result.isOffline
                    ? <><WifiOff className="w-2.5 h-2.5" />Từ điển</>
                    : <><Wifi className="w-2.5 h-2.5" />AI</>
                  }
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card body */}
          <div className="px-4 py-3 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-fg-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Đang tra cứu...</span>
              </div>
            ) : !result ? (
              <p className="text-xs text-fg-muted text-center py-4">Không tìm thấy thông tin.</p>
            ) : !result.isKnown ? (
              <p className="text-xs text-fg-muted text-center py-4">
                Thuật ngữ này chưa có trong cơ sở dữ liệu.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Simple explanation */}
                <div className="bg-success/8 border border-success/20 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-fg-primary leading-relaxed">{result.simple}</p>
                </div>

                {/* Detail */}
                {result.detail && (
                  <div>
                    <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wide mb-1">Chi tiết</p>
                    <p className="text-xs text-fg-secondary leading-relaxed">{result.detail}</p>
                  </div>
                )}

                {/* Example */}
                {result.example && (
                  <div>
                    <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wide mb-1">Ví dụ</p>
                    <p className="text-xs text-fg-secondary leading-relaxed italic">&ldquo;{result.example}&rdquo;</p>
                  </div>
                )}

                {/* Related terms */}
                {result.relatedTerms && result.relatedTerms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wide mb-1.5">Xem thêm</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.relatedTerms.map((t) => (
                        <button
                          key={t}
                          onClick={() => handleRelated(t)}
                          className="text-[10px] px-2 py-1 rounded-full bg-surface-3 border border-border/50 text-fg-secondary hover:border-success/40 hover:text-success hover:bg-success/8 transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return ReactDOM.createPortal(tooltip, document.body)
}
