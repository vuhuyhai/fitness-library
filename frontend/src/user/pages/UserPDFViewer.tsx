/**
 * UserPDFViewer — renders PDF via pdf.js canvas (no native browser PDF viewer / download button).
 * • Pages rendered as <canvas> — no URL in UI, no browser download button
 * • Watermark on every page
 * • Tracks page progress + restores saved page
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { useUserProgressStore } from '../stores/useUserProgressStore'

// Dynamic import of pdfjs-dist to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib
  // @ts-ignore
  const pdfjs = await import('pdfjs-dist')
  // Set worker source (use local copy from node_modules)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()
  pdfjsLib = pdfjs
  return pdfjs
}

interface Props {
  src: string
  docId: string
}

export default function UserPDFViewer({ src, docId }: Props) {
  const progressStore = useUserProgressStore()
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef     = useRef<any>(null)
  const [page, setPage]     = useState(1)
  const [total, setTotal]   = useState(0)
  const [scale, setScale]   = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const renderTask = useRef<{ cancel: () => void } | null>(null)

  // Load PDF
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getPdfJs().then(async (pdfjs) => {
      try {
        const pdf = await pdfjs.getDocument(src).promise
        if (cancelled) return
        pdfRef.current = pdf
        setTotal(pdf.numPages)

        // Restore saved page
        const saved = progressStore.readingProgress[docId]
        const startPage = saved && saved.pageNumber > 1 ? Math.min(saved.pageNumber, pdf.numPages) : 1
        setPage(startPage)
        setLoading(false)
      } catch (e) {
        if (!cancelled) setError(String(e))
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [src])

  // Render current page
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || loading) return

    // Cancel any in-flight render
    renderTask.current?.cancel()

    let cancelled = false
    pdfRef.current.getPage(page).then((pdfPage: any) => {
      if (cancelled || !canvasRef.current) return
      const viewport = pdfPage.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width  = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!

      const task = pdfPage.render({ canvasContext: ctx, viewport })
      renderTask.current = task

      task.promise.then(() => {
        if (cancelled) return
        drawWatermark(ctx, viewport.width, viewport.height)
        // Track progress
        progressStore.updatePageProgress(docId, page, pdfRef.current?.numPages ?? 0)
      }).catch(() => {})
    })

    return () => { cancelled = true; renderTask.current?.cancel() }
  }, [page, scale, loading])

  function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.fillStyle = '#c73937'
    ctx.font = '14px Roboto, sans-serif'
    ctx.translate(w / 2, h / 2)
    ctx.rotate(-45 * Math.PI / 180)
    const text = 'Fitness Library · Vũ Hải'
    const step = 120
    for (let x = -w; x < w; x += step) {
      for (let y = -h; y < h; y += step) {
        ctx.fillText(text, x, y)
      }
    }
    ctx.restore()
  }

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(1, p), total)
    setPage(clamped)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-fg-muted text-sm p-8 text-center">
        <p>Không thể hiển thị PDF: {error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-3" onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-2 border-b border-border/50 flex-shrink-0">
        <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-surface-3 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4 text-fg-secondary" />
        </button>
        <span className="text-xs text-fg-secondary">
          Trang {loading ? '...' : page} / {loading ? '...' : total}
        </span>
        <button onClick={() => goToPage(page + 1)} disabled={page >= total}
          className="p-1.5 rounded hover:bg-surface-3 disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4 text-fg-secondary" />
        </button>
        <div className="flex-1" />
        {/* Progress bar */}
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-[#16a34a] rounded-full transition-all"
                style={{ width: `${(page / total) * 100}%` }} />
            </div>
            <span className="text-[10px] text-fg-muted">{Math.round((page / total) * 100)}%</span>
          </div>
        )}
        <button onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="p-1.5 rounded hover:bg-surface-3 transition-colors">
          <ZoomIn className="w-4 h-4 text-fg-secondary" />
        </button>
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="p-1.5 rounded hover:bg-surface-3 transition-colors">
          <ZoomOut className="w-4 h-4 text-fg-secondary" />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-6 h-6 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-lg"
            style={{ maxWidth: '100%', display: 'block' }}
          />
        )}
      </div>

      {/* Keyboard hint */}
      <div className="px-4 py-2 bg-surface-2 border-t border-border/30 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
          className="text-xs text-fg-muted hover:text-fg-primary disabled:opacity-30 flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" />Trang trước
        </button>
        <button onClick={() => goToPage(page + 1)} disabled={page >= total}
          className="text-xs text-fg-muted hover:text-fg-primary disabled:opacity-30 flex items-center gap-1">
          Trang sau<ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
