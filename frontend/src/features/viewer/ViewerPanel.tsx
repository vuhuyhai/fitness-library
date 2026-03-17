import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Maximize2, Minimize2, Bookmark, BookmarkCheck,
  RefreshCw, ChevronDown, ChevronUp, Sparkles,
  Clock, Eye, User, Calendar, Lock, Unlock,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useUIStore } from '../../store/useUIStore'
import { useLibraryStore } from '../../store/useLibraryStore'
import { api, localFileURL } from '../../lib/wailsApi'
import { EventsOn } from '../../lib/events'
import { toastSuccess, toastLoading } from '../../lib/toast'
import { TYPE_LABELS, CAT_NAMES, formatDate } from '../../lib/utils'
import type { Document } from '../../types'
import VideoViewer from './VideoViewer'
import WorkoutViewer from './WorkoutViewer'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

let previousFocus: HTMLElement | null = null

export default function ViewerPanel() {
  const { viewerOpen, selectedDocId, closeViewer } = useUIStore()
  const { updateDocument } = useLibraryStore()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [runningAI, setRunningAI] = useState(false)
  const [newTag, setNewTag] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  // Save/restore focus and trap Tab inside dialog
  useEffect(() => {
    if (viewerOpen) {
      previousFocus = document.activeElement as HTMLElement
      // Focus the panel itself on open
      requestAnimationFrame(() => panelRef.current?.focus())
    } else {
      previousFocus?.focus()
      previousFocus = null
    }
  }, [viewerOpen])

  useEffect(() => {
    if (!viewerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [viewerOpen])

  useEffect(() => {
    if (!selectedDocId) { setDoc(null); return }
    setLoading(true)
    api.getDocument(selectedDocId).then((d) => {
      setDoc(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [selectedDocId])

  // Listen for AI done
  useEffect(() => {
    if (!selectedDocId) return
    const off = EventsOn(`ai:done:${selectedDocId}`, () => {
      api.getDocument(selectedDocId).then((d) => {
        setDoc(d)
        updateDocument(d)
        setRunningAI(false)
        toastSuccess('AI đã hoàn thành phân loại')
      })
    })
    return off
  }, [selectedDocId])

  async function removeTag(tag: string) {
    if (!doc) return
    const tags = doc.tags.filter((t) => t !== tag)
    await api.updateDocument(doc.id, { tags })
    const updated = { ...doc, tags }
    setDoc(updated); updateDocument(updated)
  }

  async function addTag(e: React.FormEvent) {
    e.preventDefault()
    if (!doc || !newTag.trim()) return
    const tag = newTag.trim()
    if (doc.tags.includes(tag)) { setNewTag(''); return }
    const tags = [...doc.tags, tag]
    await api.updateDocument(doc.id, { tags })
    const updated = { ...doc, tags }
    setDoc(updated); updateDocument(updated)
    setNewTag('')
    toastSuccess(`Đã thêm tag "${tag}"`)
  }

  async function toggleSave() {
    if (!doc) return
    const is_saved = !doc.is_saved
    await api.updateDocument(doc.id, { is_saved })
    const updated = { ...doc, is_saved }
    setDoc(updated); updateDocument(updated)
    toastSuccess(is_saved ? 'Đã lưu tài liệu' : 'Đã bỏ lưu')
  }

  async function toggleLock() {
    if (!doc) return
    const newLocked = !doc.is_locked
    await api.setDocumentLock(doc.id, newLocked, doc.preview_lines || 5)
    const updated = { ...doc, is_locked: newLocked }
    setDoc(updated); updateDocument(updated)
    toastSuccess(newLocked ? '🔒 Đã bật yêu cầu share' : '🔓 Đã cho đọc tự do')
  }

  async function runAI() {
    if (!doc) return
    setRunningAI(true)
    await api.runAIPipeline(doc.id)
    toastLoading('AI đang phân tích...')
  }

  const panelWidth = fullscreen ? '100%' : '62%'

  return (
    <AnimatePresence>
      {viewerOpen && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeViewer}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={doc?.title ?? 'Xem tài liệu'}
            tabIndex={-1}
            className="absolute right-0 top-0 h-full bg-surface-2 border-l border-border/60 shadow-2xl z-50 flex flex-col focus:outline-none"
            style={{ width: panelWidth }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250, mass: 0.8 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-fg-muted">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !doc ? (
              <div className="flex items-center justify-center h-full text-fg-muted">Không tìm thấy</div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 px-5 py-4 border-b border-border/50 flex-shrink-0 bg-surface/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] text-fg-muted bg-surface-3 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[doc.type]}
                      </span>
                      {doc.cat_id && (
                        <span className="text-[10px] text-fg-muted">
                          {CAT_NAMES[doc.cat_id] ?? 'Khác'}
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-lg font-bold text-fg-primary leading-snug line-clamp-2">
                      {doc.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={toggleSave}
                      aria-label={doc.is_saved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'}
                      aria-pressed={doc.is_saved}
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-primary transition-colors"
                    >
                      {doc.is_saved
                        ? <BookmarkCheck className="w-4 h-4 text-primary" />
                        : <Bookmark className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setFullscreen((p) => !p)}
                      aria-label={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                      aria-pressed={fullscreen}
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors"
                    >
                      {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={closeViewer}
                      aria-label="Đóng (Esc)"
                      className="p-2 rounded-lg hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden">
                  <ViewerBody doc={doc} />
                </div>

                {/* Footer */}
                <div className="border-t border-border/50 bg-surface/10 flex-shrink-0">
                  {/* AI Summary */}
                  <div className="border-b border-border/40">
                    <button
                      onClick={() => setSummaryOpen((p) => !p)}
                      className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-fg-secondary hover:bg-surface-2/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Tóm tắt AI
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); runAI() }}
                          disabled={runningAI}
                          className="flex items-center gap-1 text-success hover:text-success/80 disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${runningAI ? 'animate-spin' : ''}`} />
                          {runningAI ? 'Đang chạy...' : 'Chạy lại'}
                        </button>
                        {summaryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {summaryOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-3 text-xs text-fg-secondary leading-relaxed">
                            {doc.summary || (
                              <span className="italic text-fg-muted">
                                Chưa có tóm tắt. Nhấn "Chạy lại" để tạo AI summary.
                              </span>
                            )}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Tags */}
                  <div className="px-5 py-3 border-b border-border/40">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 text-xs bg-surface-3 text-fg-primary px-2.5 py-1 rounded-full"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            aria-label={`Xóa tag ${tag}`}
                            className="text-fg-muted hover:text-danger transition-colors leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <form onSubmit={addTag}>
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="+ Thêm tag"
                          aria-label="Thêm tag mới"
                          className="text-xs bg-surface-2/60 border border-border/40 rounded-full px-3 py-1 text-fg-secondary placeholder-fg-muted focus:outline-none focus:border-primary/40 w-24 transition-colors"
                        />
                      </form>
                    </div>
                  </div>

                  {/* Metadata + Lock toggle */}
                  <div className="px-5 py-3 flex items-center gap-4 flex-wrap text-[11px] text-fg-muted">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(doc.created_at)}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.views} lượt xem</span>
                    {doc.read_time > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doc.read_time} phút đọc</span>
                    )}
                    {/* Lock toggle */}
                    <button onClick={toggleLock}
                      className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-medium transition-colors ${
                        doc.is_locked
                          ? 'border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                          : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
                      }`}
                      title={doc.is_locked ? 'Đang yêu cầu share — nhấn để cho đọc tự do' : 'Đang cho đọc tự do — nhấn để yêu cầu share'}
                    >
                      {doc.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {doc.is_locked ? 'Có khóa' : 'Tự do'}
                    </button>
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

function ViewerBody({ doc }: { doc: Document }) {
  switch (doc.type) {
    case 'pdf':
      return (
        <iframe
          src={localFileURL(doc.file_path)}
          className="w-full h-full border-0"
          title={doc.title}
        />
      )
    case 'video':
      return <VideoViewer src={localFileURL(doc.file_path)} title={doc.title} />
    case 'workout':
      return <div className="p-5 overflow-y-auto h-full"><WorkoutViewer doc={doc} /></div>
    default:
      return (
        <div className="h-full overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-primary prose-headings:font-bold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {doc.content || '*Không có nội dung*'}
            </ReactMarkdown>
          </div>
        </div>
      )
  }
}
