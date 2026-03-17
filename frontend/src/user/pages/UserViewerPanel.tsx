/**
 * UserViewerPanel — read-only viewer with:
 *  • Feature 1: Share-to-unlock gate
 *  • Feature 2: Anti-download (no native PDF / video controls)
 *  • Feature 3: Resume-reading dialog + progress tracking
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Maximize2, Minimize2, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Sparkles, Clock, Eye, User, Calendar,
  Lock, CheckCircle, RotateCcw, BookOpen, MessageCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useUIStore } from '../../store/useUIStore'
import { useUserLibraryStore } from '../stores/useUserLibraryStore'
import { api, localFileURL } from '../../lib/wailsApi'
import { toastSuccess, toastError } from '../../lib/toast'
import { TYPE_LABELS, CAT_NAMES, formatDate } from '../../lib/utils'
import { useUserProgressStore } from '../stores/useUserProgressStore'
import type { Document } from '../../types'
import UserVideoViewer from './UserVideoViewer'
import UserPDFViewer from './UserPDFViewer'
import WorkoutViewer from '../../features/viewer/WorkoutViewer'
import FacebookCaptionModal from '../components/FacebookCaptionModal'
import DocChatPanel from '../components/DocChatPanel'
import TermTooltip from '../components/TermTooltip'
import { fetchCaptions } from '../stores/useCaptionStore'
import { useTextSelection } from '../hooks/useTextSelection'
import type { SelectionInfo } from '../hooks/useTextSelection'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
let previousFocus: HTMLElement | null = null

/** Relative time helper */
function relativeTime(isoDate: string): string {
  if (!isoDate) return ''
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'vừa xong'
  if (mins  < 60)  return `${mins} phút trước`
  if (hours < 24)  return `${hours} giờ trước`
  if (days  < 30)  return `${days} ngày trước`
  return formatDate(isoDate)
}

export default function UserViewerPanel() {
  const { viewerOpen, selectedDocId, closeViewer } = useUIStore()
  const { updateDocument } = useUserLibraryStore()
  const progressStore = useUserProgressStore()
  const [doc, setDoc]             = useState<Document | null>(null)
  const [loading, setLoading]     = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [chatOpen, setChatOpen]   = useState(false)
  const [enableChat, setEnableChat] = useState(true)
  const [enableTermExplain, setEnableTermExplain] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useEffect(() => {
    if (viewerOpen) {
      previousFocus = document.activeElement as HTMLElement
      requestAnimationFrame(() => panelRef.current?.focus())
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  }, [viewerOpen])

  useEffect(() => {
    if (!viewerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      // 'C' toggles chat panel (when not typing in an input)
      const tag = (e.target as HTMLElement).tagName
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        if (enableChat) setChatOpen((p) => !p)
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!focusable.length) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus() } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus() } }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [viewerOpen, enableChat])

  // Load chat / term settings once
  useEffect(() => {
    api.getSettings().then((s) => {
      setEnableChat(s['enableDocChat'] !== 'false')
      setEnableTermExplain(s['enableTermExplain'] !== 'false')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDocId) { setDoc(null); setChatOpen(false); return }
    setLoading(true)
    api.getDocument(selectedDocId).then((d) => {
      setDoc(d)
      setLoading(false)
      // Touch recentlyRead
      progressStore.updateScrollProgress(selectedDocId, progressStore.readingProgress[selectedDocId]?.scrollPercent ?? 0)
    }).catch(() => setLoading(false))
    api.incrementViews(selectedDocId).catch(() => {})
  }, [selectedDocId])

  async function toggleSave() {
    if (!doc) return
    const is_saved = !doc.is_saved
    await api.updateDocument(doc.id, { is_saved })
    const updated = { ...doc, is_saved }
    setDoc(updated)
    updateDocument(updated)
    if (is_saved) progressStore.markAsRead(doc.id)
  }

  const panelWidth = fullscreen ? '100%' : '62%'

  return (
    <AnimatePresence>
      {viewerOpen && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeViewer}
          />
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true"
            aria-label={doc?.title ?? 'Xem tài liệu'}
            tabIndex={-1}
            className="absolute right-0 top-0 h-full bg-surface-2 border-l border-border/60 shadow-2xl z-50 flex flex-col focus:outline-none"
            style={{ width: panelWidth }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250, mass: 0.8 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !doc ? (
              <div className="flex items-center justify-center h-full text-fg-muted">Không tìm thấy</div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 px-5 py-4 border-b border-border/50 flex-shrink-0 bg-surface/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] text-fg-muted bg-surface-3 px-2 py-0.5 rounded-full">{TYPE_LABELS[doc.type]}</span>
                      {doc.cat_id && <span className="text-[10px] text-fg-muted">{CAT_NAMES[doc.cat_id] ?? 'Khác'}</span>}
                      {doc.is_locked && !progressStore.isUnlocked(doc.id) && (
                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />Cần share
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-lg text-fg-primary leading-snug line-clamp-2">{doc.title}</h2>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {enableChat && doc.type !== 'video' && (
                      <button
                        onClick={() => setChatOpen((p) => !p)}
                        aria-label={chatOpen ? 'Đóng chat' : 'Chat với tài liệu (C)'}
                        title={chatOpen ? 'Đóng chat' : 'Chat với tài liệu (C)'}
                        className={`p-2 rounded-lg transition-colors ${
                          chatOpen
                            ? 'bg-success/15 text-success'
                            : 'hover:bg-surface-3 text-fg-muted hover:text-success'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={toggleSave} aria-label={doc.is_saved ? 'Bỏ lưu' : 'Lưu'}
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-[#16a34a] transition-colors">
                      {doc.is_saved ? <BookmarkCheck className="w-4 h-4 text-[#16a34a]" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setFullscreen((p) => !p)}
                      aria-label={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors">
                      {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={closeViewer} aria-label="Đóng (Esc)"
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body — flex row when chat is open */}
                <div className="flex-1 overflow-hidden flex flex-row">
                  <div className="flex-1 overflow-hidden min-w-0">
                    <UserViewerBody
                      doc={doc}
                      onDocUpdate={setDoc}
                      enableTermExplain={enableTermExplain}
                    />
                  </div>
                  <AnimatePresence>
                    {chatOpen && (
                      <DocChatPanel
                        doc={doc}
                        onClose={() => setChatOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="border-t border-border/50 bg-surface/10 flex-shrink-0">
                  {doc.summary && (
                    <div className="border-b border-border/40">
                      <button onClick={() => setSummaryOpen((p) => !p)}
                        className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-fg-secondary hover:bg-surface-2/50 transition-colors">
                        <span className="flex items-center gap-2 font-semibold">
                          <Sparkles className="w-3.5 h-3.5 text-[#16a34a]" />Tóm tắt AI
                        </span>
                        {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <AnimatePresence>
                        {summaryOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <p className="px-5 pb-3 text-xs text-fg-secondary leading-relaxed">{doc.summary}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  {doc.tags.length > 0 && (
                    <div className="px-5 py-3 border-b border-border/40">
                      <div className="flex flex-wrap gap-1.5">
                        {doc.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-surface-3 text-fg-primary px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="px-5 py-3 flex items-center gap-4 flex-wrap text-[11px] text-fg-muted">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(doc.created_at)}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.views} lượt xem</span>
                    {doc.read_time > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.read_time} phút</span>}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Viewer Body ──────────────────────────────────────────────────────────────

interface BodyProps {
  doc: Document
  onDocUpdate: (doc: Document) => void
  enableTermExplain?: boolean
}

function UserViewerBody({ doc, onDocUpdate, enableTermExplain }: BodyProps) {
  const progressStore = useUserProgressStore()
  const isLocked = doc.is_locked && !progressStore.isUnlocked(doc.id)
  const existingProgress = progressStore.readingProgress[doc.id]

  // Resume dialog state
  const [showResume, setShowResume] = useState(false)
  const [resumeCountdown, setResumeCountdown] = useState(8)
  const [hasResumed, setHasResumed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Term tooltip state
  const [tooltipInfo, setTooltipInfo] = useState<SelectionInfo | null>(null)

  useTextSelection(
    (info) => {
      if (enableTermExplain && !isLocked) setTooltipInfo(info)
    },
    () => setTooltipInfo(null),
    { containerRef: bodyRef, minWords: 1, maxWords: 5, enabled: !!enableTermExplain && !isLocked },
  )

  // Show resume dialog when opening doc with > 5% progress
  useEffect(() => {
    if (!isLocked && existingProgress && existingProgress.scrollPercent > 5 && !hasResumed) {
      // Small delay so panel animates in first
      const t = setTimeout(() => setShowResume(true), 600)
      return () => clearTimeout(t)
    }
  }, [doc.id])

  // Countdown for resume dialog
  useEffect(() => {
    if (!showResume) return
    if (resumeCountdown <= 0) {
      handleResume()
      return
    }
    const t = setTimeout(() => setResumeCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showResume, resumeCountdown])

  function handleResume() {
    setShowResume(false)
    setHasResumed(true)
    if (!existingProgress) return
    // Scroll to saved position
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const targetTop = (existingProgress.scrollPercent / 100) * (el.scrollHeight - el.clientHeight)
      el.scrollTo({ top: targetTop, behavior: 'smooth' })
    })
  }

  function handleReadFromStart() {
    setShowResume(false)
    setHasResumed(true)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLocked) {
    return <LockGate doc={doc} onUnlock={() => onDocUpdate({ ...doc })} />
  }

  return (
    <div ref={bodyRef} className="relative h-full flex flex-col">
      {/* Term tooltip (portal) */}
      {tooltipInfo && (
        <TermTooltip
          term={tooltipInfo.text}
          context=""
          catId={doc.cat_id}
          anchorRect={tooltipInfo.rect}
          onClose={() => setTooltipInfo(null)}
        />
      )}

      {/* Resume dialog */}
      <AnimatePresence>
        {showResume && existingProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-4 right-4 z-20 bg-surface border border-border/60 rounded-xl shadow-xl p-4 w-72"
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-[#16a34a]" />
              <span className="text-sm font-semibold text-fg-primary">
                Bạn đã đọc đến {existingProgress.scrollPercent}%
              </span>
            </div>
            <p className="text-xs text-fg-muted mb-3">
              Lần cuối: {relativeTime(existingProgress.lastReadAt)}
            </p>
            <div className="flex gap-2">
              <button onClick={handleReadFromStart}
                className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-border/60 text-fg-secondary hover:bg-surface-3 transition-colors flex items-center justify-center gap-1">
                <RotateCcw className="w-3 h-3" />Đọc từ đầu
              </button>
              <button onClick={handleResume}
                className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] transition-colors flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" />Tiếp tục →
              </button>
            </div>
            <p className="text-[10px] text-fg-muted text-center mt-2">
              Tự động tiếp tục sau {resumeCountdown}s
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual content */}
      <ContentRenderer doc={doc} scrollRef={scrollRef} />
    </div>
  )
}

// ─── Lock Gate ───────────────────────────────────────────────────────────────

interface LockGateProps {
  doc: Document
  onUnlock: () => void
}

function LockGate({ doc, onUnlock }: LockGateProps) {
  const progressStore = useUserProgressStore()
  const [showModal, setShowModal] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [shareBaseUrl, setShareBaseUrl] = useState('https://fitnesslibrary.vuhai.app')
  const previewLines = doc.preview_lines ?? 5

  // Build preview text (first N lines of content)
  const previewText = doc.content
    ? doc.content.split('\n').slice(0, previewLines).join('\n')
    : ''

  // Prefetch captions + load share URL on mount
  useEffect(() => {
    fetchCaptions(doc.id, api.generateFacebookCaption)
    api.getSettings().then((s) => {
      if (s['share.base_url']) setShareBaseUrl(s['share.base_url'])
    }).catch(() => {})
  }, [doc.id])

  async function handleConfirmShare() {
    setUnlocking(true)
    try {
      await api.unlockDocument(doc.id)
      progressStore.addUnlocked(doc.id)
      toastSuccess('🔓 Đã mở khóa! Chúc bạn đọc vui.')
      setShowModal(false)
      onUnlock()
    } catch {
      toastError('Có lỗi khi mở khóa. Thử lại nhé.')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="h-full overflow-hidden relative flex flex-col">
      {/* Preview with blur */}
      <div className="relative flex-1 overflow-hidden">
        {/* Preview text — first N lines */}
        <div className="p-6 prose prose-sm max-w-none dark:prose-invert prose-a:text-success prose-headings:font-bold">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {previewText || '*Xem trước nội dung...*'}
          </ReactMarkdown>
        </div>

        {/* Blur overlay gradient */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '60%', background: 'linear-gradient(to bottom, transparent 0%, rgb(var(--color-surface-2)/0.85) 40%, rgb(var(--color-surface-2)/0.97) 100%)' }}
        />

        {/* Blurred content preview */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none px-6 py-4 overflow-hidden"
          style={{ height: '40%', filter: 'blur(4px)', opacity: 0.4 }}
        >
          <div className="text-xs text-fg-secondary line-clamp-6 leading-relaxed">
            {doc.content?.split('\n').slice(previewLines, previewLines + 20).join(' ') || ''}
          </div>
        </div>
      </div>

      {/* Lock gate card */}
      <div className="flex-shrink-0 flex items-center justify-center px-6 py-6 bg-surface-2/90 border-t border-border/40">
        <div className="bg-surface border border-border rounded-2xl shadow-lg p-6 w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="font-bold text-fg-primary mb-1.5">Nội dung bị khóa</h3>
          <p className="text-sm text-fg-secondary mb-4">
            Chia sẻ bài viết này lên Facebook để mở khóa và đọc toàn bộ nội dung
          </p>

          <button
            onClick={() => setShowModal(true)}
            disabled={unlocking}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#1877F2' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Chia sẻ lên Facebook
          </button>

          <p className="text-[11px] text-fg-muted mt-3">
            Chỉ cần share 1 lần — mở khóa vĩnh viễn trên thiết bị này
          </p>
        </div>
      </div>

      {/* Facebook Caption Modal (portal-style) */}
      {showModal && (
        <FacebookCaptionModal
          docId={doc.id}
          docTitle={doc.title}
          shareBaseUrl={shareBaseUrl}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmShare}
        />
      )}
    </div>
  )
}

// ─── Content Renderer ─────────────────────────────────────────────────────────

interface ContentRendererProps {
  doc: Document
  scrollRef: React.RefObject<HTMLDivElement>
}

function ContentRenderer({ doc, scrollRef }: ContentRendererProps) {
  const progressStore = useUserProgressStore()
  // Reading time tracker
  const activeRef = useRef(true)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    // Accumulate reading time every 30s while tab is visible
    timerRef.current = setInterval(() => {
      if (activeRef.current) progressStore.addReadingTime(doc.id, 30)
    }, 30_000)

    function onVisibilityChange() { activeRef.current = !document.hidden }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [doc.id])

  switch (doc.type) {
    case 'pdf':
      return (
        <UserPDFViewer
          src={localFileURL(doc.file_path)}
          docId={doc.id}
        />
      )
    case 'video':
      return (
        <UserVideoViewer
          src={localFileURL(doc.file_path)}
          title={doc.title}
          docId={doc.id}
        />
      )
    case 'workout':
      return <div className="p-5 overflow-y-auto h-full"><WorkoutViewer doc={doc} /></div>
    default:
      return <ScrollArticleViewer doc={doc} scrollRef={scrollRef} />
  }
}

// ─── Scroll Article Viewer ───────────────────────────────────────────────────

function ScrollArticleViewer({
  doc, scrollRef,
}: {
  doc: Document
  scrollRef: React.RefObject<HTMLDivElement>
}) {
  const progressStore = useUserProgressStore()
  const throttleRef = useRef<ReturnType<typeof setTimeout>>()

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    clearTimeout(throttleRef.current)
    throttleRef.current = setTimeout(() => {
      const el = e.currentTarget
      const pct = (el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100
      if (isFinite(pct)) progressStore.updateScrollProgress(doc.id, pct)
    }, 2000)
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-6"
      onScroll={handleScroll}
    >
      <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-[#16a34a] prose-headings:font-bold">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ node: _n, ...props }) => (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                {...props}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-w-full rounded"
              />
            ),
          }}
        >
          {doc.content || '*Không có nội dung*'}
        </ReactMarkdown>
      </div>
    </div>
  )
}
