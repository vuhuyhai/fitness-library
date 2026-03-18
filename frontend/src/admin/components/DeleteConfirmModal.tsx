import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X, AlertTriangle, FileText } from 'lucide-react'
import { api } from '../../lib/wailsApi'
import type { DeleteOptions, DeletePreview } from '../../types'

interface Props {
  isOpen: boolean
  docIds: string[]
  onConfirm: (opts: DeleteOptions) => void
  onCancel: () => void
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DeleteConfirmModal({ isOpen, docIds, onConfirm, onCancel }: Props) {
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [opts, setOpts] = useState<DeleteOptions>({
    deleteRelated: true,
    deleteFile: true,
    deleteThumbnail: false,
  })

  const isBatch = docIds.length > 1

  useEffect(() => {
    if (!isOpen) { setPreview(null); return }
    if (isBatch) return // no single-doc preview for batch
    if (!docIds[0]) return
    setLoading(true)
    api.getDeletePreview(docIds[0])
      .then((p) => {
        setPreview(p)
        // auto-disable file option if no file
        setOpts((o) => ({ ...o, deleteFile: !!p.filePath }))
      })
      .catch(() => setPreview(null))
      .finally(() => setLoading(false))
  }, [isOpen, docIds[0]])

  // Reset on close
  useEffect(() => {
    if (!isOpen) setOpts({ deleteRelated: true, deleteFile: true, deleteThumbnail: false })
  }, [isOpen])

  // Keyboard: Escape = cancel
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  const title = isBatch ? `Xóa ${docIds.length} tài liệu` : 'Xóa tài liệu'
  const hasFile = !isBatch && !!preview?.filePath

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-surface-2 rounded-xl border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <h2 className="flex-1 text-base font-semibold text-fg-primary">{title}</h2>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-3 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Preview */}
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[48, 36, 28].map((w) => (
                    <div key={w} className="h-3 bg-surface-3 rounded" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : isBatch ? (
                <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-danger" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg-primary">{docIds.length} tài liệu được chọn</p>
                    <p className="text-xs text-fg-secondary mt-0.5">Tất cả sẽ bị xóa cùng lúc</p>
                  </div>
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  {/* Doc row */}
                  <div className="flex items-start gap-3 p-3 bg-surface-3 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-fg-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-primary truncate">{preview.title}</p>
                      {preview.filePath && (
                        <p className="text-[11px] text-fg-muted truncate mt-0.5">{preview.filePath.split('/').pop()?.split('\\').pop()}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-[11px] text-fg-secondary">
                    {preview.readCount > 0 && <span>📖 {preview.readCount} lượt đọc</span>}
                    {preview.shareCount > 0 && <span>🔗 {preview.shareCount} chia sẻ</span>}
                    {preview.unlockCount > 0 && <span>🔓 {preview.unlockCount} mở khóa</span>}
                    {preview.readCount === 0 && preview.shareCount === 0 && preview.unlockCount === 0 && (
                      <span className="text-fg-muted">Chưa có người đọc</span>
                    )}
                  </div>

                  {preview.fileSize > 0 && (
                    <p className="text-[11px] text-fg-secondary">
                      💾 Dung lượng: {formatSize(preview.fileSize)}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Options */}
              <div className="space-y-2.5">
                {/* Delete related */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts.deleteRelated}
                    onChange={(e) => setOpts((o) => ({ ...o, deleteRelated: e.target.checked }))}
                    className="mt-0.5 accent-danger"
                  />
                  <div>
                    <p className="text-sm text-fg-primary">Xóa dữ liệu liên quan</p>
                    <p className="text-[11px] text-fg-secondary">Lịch sử đọc, unlock và chia sẻ</p>
                  </div>
                </label>

                {/* Delete file */}
                <label className={`flex items-start gap-3 ${!hasFile ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={opts.deleteFile && hasFile}
                    disabled={!hasFile}
                    onChange={(e) => setOpts((o) => ({ ...o, deleteFile: e.target.checked }))}
                    className="mt-0.5 accent-danger"
                  />
                  <div>
                    <p className="text-sm text-fg-primary">Xóa file gốc khỏi máy chủ</p>
                    <p className="text-[11px] text-fg-secondary">
                      {hasFile && preview?.fileSize
                        ? `Giải phóng ${formatSize(preview.fileSize)} dung lượng`
                        : 'Không có file (bài viết / ghi chú)'}
                    </p>
                  </div>
                </label>

                {/* Delete thumbnail */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts.deleteThumbnail}
                    onChange={(e) => setOpts((o) => ({ ...o, deleteThumbnail: e.target.checked }))}
                    className="mt-0.5 accent-danger"
                  />
                  <div>
                    <p className="text-sm text-fg-primary">Xóa ảnh thumbnail</p>
                    <p className="text-[11px] text-fg-secondary">Thumbnail sẽ được tạo lại khi cần</p>
                  </div>
                </label>
              </div>

              {/* Warning box */}
              <div className="flex gap-2.5 p-3 bg-danger/8 border border-danger/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-fg-secondary leading-relaxed">
                  Tài liệu sẽ bị xóa sau <strong className="text-fg-primary">30 giây</strong>.
                  Bạn có thể hoàn tác trong thời gian đó.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={onCancel}
                className="flex-1 py-2 text-sm text-fg-secondary border border-border rounded-lg hover:text-fg-primary hover:bg-surface-3 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={() => onConfirm(opts)}
                disabled={loading && !isBatch}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold bg-danger hover:bg-danger/90 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isBatch ? `Xóa ${docIds.length} tài liệu` : 'Xóa tài liệu'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
