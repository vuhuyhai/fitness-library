import { useEffect, useCallback, useRef, useState } from 'react'
import { Upload, Play, Pause, Trash2, FileText, Film, FileType2, StickyNote, Terminal, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, isWails } from '../../lib/wailsApi'
import { uploadFiles } from '../../lib/httpApi'
import { useQueueStore } from '../../store/useQueueStore'
import { EventsOn } from '../../lib/events'
import type { QueueProgressPayload, Category } from '../../types'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf:     FileType2,
  video:   Film,
  article: FileText,
  note:    StickyNote,
  workout: FileText,
}

const STATUS_STYLES: Record<string, string> = {
  pending:    'text-fg-muted bg-surface-3 border border-border',
  processing: 'text-info bg-info/10 border border-info/25',
  done:       'text-success bg-success/10 border border-success/25',
  error:      'text-danger bg-danger/10 border border-danger/25',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ', processing: 'Đang xử lý', done: 'Hoàn thành', error: 'Lỗi',
}

export default function ImportPage() {
  const { items, running, paused, logs, setItems, addItems, updateItem, setRunning, setPaused, clearDone, addLog, clearLogs } = useQueueStore()
  const logRef     = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<Category[]>([])

  // Auto-scroll terminal log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  // Load initial queue status + categories
  useEffect(() => {
    api.getQueueStatus().then((s) => {
      setItems(s.items)
      setRunning(s.running)
      setPaused(s.paused)
    }).catch(console.error)
    api.getCategories().then(setCategories).catch(console.error)
  }, [])

  // Desktop: listen to Wails queue events
  useEffect(() => {
    if (!isWails) return
    const offProgress = EventsOn('queue:progress', (payload) => {
      updateItem(payload as QueueProgressPayload)
    })
    const offDone = EventsOn('queue:done', (payload) => {
      updateItem(payload as QueueProgressPayload)
    })
    const offComplete = EventsOn('queue:complete', () => {
      setRunning(false)
      setPaused(false)
      addLog('✓ Hoàn thành xử lý tất cả tài liệu')
      toast.success('Đã xử lý xong tất cả tài liệu')
    })
    return () => { offProgress(); offDone(); offComplete() }
  }, [])

  // Web: poll queue status while running
  useEffect(() => {
    if (isWails || !running) return
    const id = setInterval(async () => {
      try {
        const s = await api.getQueueStatus()
        setItems(s.items)
        if (!s.running) {
          setRunning(false)
          setPaused(false)
          addLog('✓ Hoàn thành xử lý tất cả tài liệu')
          toast.success('Đã xử lý xong tất cả tài liệu')
        }
      } catch { /* ignore */ }
    }, 1500)
    return () => clearInterval(id)
  }, [running])

  // Desktop: native file dialog
  const handleSelectFiles = useCallback(async () => {
    try {
      const paths = await api.selectFiles()
      if (!paths || paths.length === 0) return
      const newItems = await api.queueFiles(paths)
      addItems(newItems)
      addLog(`+ Đã thêm ${newItems.length} file vào queue`)
      toast.success(`Đã thêm ${newItems.length} file vào queue`)
    } catch (e) {
      toast.error('Lỗi khi thêm file: ' + String(e))
    }
  }, [])

  // Web: upload via <input type="file">
  const handleWebUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const newItems = await uploadFiles(Array.from(files))
      addItems(newItems)
      addLog(`+ Đã upload ${newItems.length} file vào queue`)
      toast.success(`Đã upload ${newItems.length} file`)
    } catch (e) {
      toast.error('Lỗi upload: ' + String(e))
    }
  }, [])

  // Web: drag-and-drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleWebUpload(e.dataTransfer.files)
  }, [handleWebUpload])

  async function handleStart() {
    await api.startQueue()
    setRunning(true)
    setPaused(false)
    addLog('▶ Bắt đầu xử lý queue...')
  }

  async function handlePause() {
    await api.pauseQueue()
    const newPaused = !paused
    setPaused(newPaused)
    addLog(newPaused ? '⏸ Tạm dừng' : '▶ Tiếp tục')
  }

  async function handleCategoryChange(itemId: string, catId: string) {
    try {
      await api.updateQueueItemCategory(itemId, catId)
      setItems(items.map((i) => i.id === itemId ? { ...i, cat_id: catId } : i))
    } catch (e) {
      toast.error('Lỗi cập nhật danh mục: ' + String(e))
    }
  }

  async function handleClearDone() {
    await api.clearDoneQueue()
    clearDone()
    addLog('🗑 Đã xóa các mục hoàn thành')
  }

  const pending    = items.filter((i) => i.status === 'pending' || i.status === 'processing').length
  const done       = items.filter((i) => i.status === 'done').length
  const errored    = items.filter((i) => i.status === 'error').length
  const allDone    = items.length > 0 && pending === 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border flex-shrink-0 bg-surface-2">
        <div>
          <h1 className="text-base font-semibold text-fg-primary">Nhập Hàng Loạt</h1>
          <p className="text-xs text-fg-secondary mt-0.5">
            <span className="text-fg-primary font-medium">{items.length} file</span>
            {' · '}
            <span className="text-fg-muted">{pending} chờ</span>
            {' · '}
            <span className="text-success font-medium">{done} xong</span>
            {errored > 0 && (
              <><span className="text-fg-muted"> · </span><span className="text-danger font-medium">{errored} lỗi</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-fg-secondary hover:text-fg-primary border border-border rounded-lg px-3 py-1.5 hover:bg-surface-3 transition-colors"
            >
              Xóa log
            </button>
          )}
          {items.some((i) => i.status === 'done' || i.status === 'error') && (
            <button
              onClick={handleClearDone}
              className="flex items-center gap-1.5 text-xs text-fg-secondary hover:text-fg-primary border border-border rounded-lg px-3 py-1.5 hover:bg-surface-3 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa đã xong
            </button>
          )}
          {running && (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 text-sm font-medium text-warning border border-warning/40 rounded-lg px-3 py-1.5 hover:bg-warning/10 transition-colors"
            >
              <Pause className="w-4 h-4" />
              {paused ? 'Tiếp tục' : 'Tạm dừng'}
            </button>
          )}
          {!running && pending > 0 && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-success hover:bg-success/80 rounded-lg px-4 py-1.5 transition-colors"
            >
              <Play className="w-4 h-4" />
              Bắt đầu ({pending})
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left: drop zone + queue list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r border-border">
          {/* Drop zone */}
          {isWails ? (
            <button
              onClick={handleSelectFiles}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary-light/20 transition-all duration-200 group"
            >
              <Upload className="w-9 h-9 text-fg-muted group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="text-fg-secondary font-medium text-sm group-hover:text-fg-primary">Nhấn để chọn file</p>
                <p className="text-xs text-fg-muted mt-0.5">PDF, DOCX, Markdown, Video (MP4)</p>
              </div>
            </button>
          ) : (
            <label
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary-light/20 transition-all duration-200 group cursor-pointer"
            >
              <Upload className="w-9 h-9 text-fg-muted group-hover:text-primary transition-colors" />
              <div className="text-center">
                <p className="text-fg-secondary font-medium text-sm group-hover:text-fg-primary">Kéo thả hoặc nhấn để upload</p>
                <p className="text-xs text-fg-muted mt-0.5">PDF, DOCX, Markdown, Video (MP4)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.md,.markdown,.html,.htm,.txt,.mp4,.mkv,.avi,.mov"
                className="hidden"
                onChange={e => handleWebUpload(e.target.files)}
              />
            </label>
          )}

          {/* All done banner */}
          {allDone && (
            <div className="flex items-center gap-3 p-3.5 bg-success/10 border border-success/25 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Hoàn thành!</p>
                <p className="text-xs text-success/70">{done} tài liệu đã được xử lý{errored > 0 ? `, ${errored} lỗi` : ''}</p>
              </div>
            </div>
          )}

          {/* Queue list */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-semibold text-fg-muted uppercase tracking-wider px-0.5">
                Queue ({items.length})
              </h2>
              {items.map((item) => {
                const Icon = TYPE_ICONS[item.file_type] ?? FileText
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border hover:border-border-focus/40 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-fg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-fg-primary truncate">{item.file_name}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${STATUS_STYLES[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      {item.status === 'pending' && categories.length > 0 && (
                        <select
                          value={item.cat_id || ''}
                          onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                          className="mt-1.5 w-full text-xs bg-surface-3 border border-border rounded px-2 py-1 text-fg-secondary focus:outline-none focus:border-border-focus cursor-pointer"
                        >
                          <option value="">— Chọn danh mục —</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      )}
                      {item.status === 'processing' && (
                        <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'error' && item.error_msg && (
                        <p className="text-xs text-danger mt-0.5 truncate">{item.error_msg}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: terminal log */}
        <div className="w-80 flex flex-col bg-surface flex-shrink-0 border-l border-border">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-mono text-fg-secondary font-medium uppercase tracking-wide">LOG</span>
            <span className="ml-auto text-[10px] text-fg-muted font-mono">{logs.length} lines</span>
          </div>
          <div
            ref={logRef}
            className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px]"
          >
            {logs.length === 0 ? (
              <p className="text-fg-muted italic">Chờ hoạt động...</p>
            ) : (
              logs.map((line, i) => (
                <p
                  key={i}
                  className={`leading-5 break-all ${
                    line.includes('ERROR') || line.includes('error')
                      ? 'text-danger'
                      : line.includes('✓') || line.includes('done')
                      ? 'text-success'
                      : line.includes('▶')
                      ? 'text-info'
                      : line.includes('⏸')
                      ? 'text-warning'
                      : 'text-fg-secondary'
                  }`}
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
