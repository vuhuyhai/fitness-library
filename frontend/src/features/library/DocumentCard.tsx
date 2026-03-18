import { memo, useState } from 'react'
import { Eye, Clock, Bookmark, BookmarkCheck, Lock, Unlock, Trash2, PenLine } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store/useUIStore'
import { useLibraryStore } from '../../store/useLibraryStore'
import { api, localFileURL } from '../../lib/wailsApi'
import { toastSuccess, toastError } from '../../lib/toast'
import { TYPE_LABELS, TYPE_COLORS, CAT_NAMES, CAT_COLORS, formatNumber } from '../../lib/utils'
import SvgCover from '../../helpers/svgCoverComponent'
import DeleteConfirmModal from '../../admin/components/DeleteConfirmModal'
import { showUndoToast } from '../../admin/components/UndoToast'
import type { Document, DeleteOptions } from '../../types'

interface Props {
  doc: Document
  index?: number
  isAdmin?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onDeleted?: (id: string) => void
}

function DocumentCard({
  doc,
  index = 0,
  isAdmin = false,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onDeleted,
}: Props) {
  const { openViewer } = useUIStore()
  const { updateDocument, toggleTag, removeDocument, addDocument } = useLibraryStore()
  const navigate = useNavigate()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleClick() {
    if (isSelectionMode) {
      onToggleSelect?.(doc.id)
      return
    }
    api.incrementViews(doc.id).catch(() => {})
    openViewer(doc.id)
  }

  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (isSelectionMode) return
    const isSaved = !doc.is_saved
    await api.updateDocument(doc.id, { is_saved: isSaved })
    updateDocument({ ...doc, is_saved: isSaved })
    toastSuccess(isSaved ? 'Đã lưu vào danh sách đọc' : 'Đã bỏ lưu')
  }

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/edit/${doc.id}`)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    setShowDeleteModal(true)
  }

  const docSnapshot = doc // capture for undo restore

  async function confirmDelete(opts: DeleteOptions) {
    setShowDeleteModal(false)
    setDeleting(true)
    // Optimistic removal
    removeDocument(doc.id)
    onDeleted?.(doc.id)

    try {
      const result = await api.deleteDocument(doc.id, opts)
      showUndoToast(doc.title, result.undoToken, 30, async (token) => {
        try {
          await api.undoDelete(token)
          // Restore from snapshot (doc still exists server-side during undo window)
          addDocument(docSnapshot)
          toastSuccess('Đã hoàn tác! Tài liệu đã được khôi phục.')
        } catch {
          toastError('Không thể hoàn tác. Tài liệu đã bị xóa vĩnh viễn.')
        }
      })
    } catch (e) {
      // Restore on API error
      addDocument(docSnapshot)
      toastError('Lỗi xóa: ' + String(e))
    } finally {
      setDeleting(false)
    }
  }

  const coverSrc = doc.cover_path ? localFileURL(doc.cover_path) : null
  const catColor = CAT_COLORS[doc.cat_id] ?? '#6b7280'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: deleting ? 0 : 1, y: 0, scale: deleting ? 0.9 : 1 }}
        whileHover={isSelectionMode ? {} : { y: -3, boxShadow: '0 8px 24px rgba(199, 57, 55, 0.12)' }}
        transition={{ delay: deleting ? 0 : Math.min(index * 0.04, 0.4), duration: 0.2, ease: 'easeOut' }}
        onClick={handleClick}
        role="article"
        aria-label={`${doc.title} — ${CAT_NAMES[doc.cat_id] ?? 'Khác'}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`group relative bg-surface-2 rounded-lg border overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors
          ${isSelected ? 'border-primary bg-primary-light/10 ring-1 ring-primary/30' : 'border-border'}
          ${deleting ? 'pointer-events-none' : ''}
        `}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${isSelected ? 'bg-primary border-primary' : 'bg-black/40 border-white/60 backdrop-blur-sm'}`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Cover */}
        <div className="relative overflow-hidden bg-surface-3" style={{ height: 140 }}>
          <motion.div
            className="w-full h-full"
            whileHover={isSelectionMode ? {} : { scale: 1.03 }}
            transition={{ duration: 0.3 }}
          >
            {coverSrc ? (
              <img src={coverSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <SvgCover docId={doc.id} catId={doc.cat_id} className="w-full h-full" />
            )}
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <span
            className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm"
            style={{ color: catColor, background: `${catColor}25`, border: `1px solid ${catColor}40` }}
          >
            {CAT_NAMES[doc.cat_id] ?? 'Khác'}
          </span>

          <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm ${TYPE_COLORS[doc.type]}`}>
            {TYPE_LABELS[doc.type]}
          </span>

          {/* Lock badge */}
          {doc.is_locked && (
            <span className="absolute bottom-2 left-2 text-[9px] text-amber-400 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />Khóa
            </span>
          )}
          {!doc.is_locked && (
            <span className="absolute bottom-2 left-2 text-[9px] text-emerald-400 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Unlock className="w-2.5 h-2.5" />Tự do
            </span>
          )}

          {/* Admin action buttons */}
          {isAdmin && !isSelectionMode && (
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleEditClick}
                title="Sửa tài liệu"
                className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-fg-secondary hover:text-primary backdrop-blur-sm shadow-sm transition-colors"
              >
                <PenLine className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteClick}
                title="Xóa tài liệu"
                className="p-1.5 bg-white/90 hover:bg-danger/10 rounded-lg text-fg-secondary hover:text-danger backdrop-blur-sm shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bookmark (hidden in selection mode) */}
          {!isSelectionMode && !isAdmin && (
            <button
              onClick={toggleSave}
              aria-label={doc.is_saved ? `Bỏ lưu ${doc.title}` : `Lưu ${doc.title}`}
              aria-pressed={doc.is_saved}
              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/60 hover:text-primary transition-all opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
            >
              {doc.is_saved
                ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                : <Bookmark className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Deleting overlay */}
          {deleting && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <h3 className="text-[13px] font-bold text-fg-primary line-clamp-2 leading-snug">
            {doc.title}
          </h3>

          {doc.summary && (
            <p className="text-[11px] text-fg-secondary line-clamp-2 leading-relaxed">{doc.summary}</p>
          )}

          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); if (!isSelectionMode) toggleTag(tag) }}
                  aria-label={`Lọc theo tag: ${tag}`}
                  className="text-[10px] bg-surface-3 hover:bg-primary-light hover:text-primary text-fg-muted px-1.5 py-0.5 rounded-full border border-border hover:border-primary/30 transition-colors"
                >
                  {tag}
                </button>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-[10px] text-fg-muted">+{doc.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[8px] text-primary font-bold">VH</span>
              </div>
              <span className="text-[10px] text-fg-muted truncate">{doc.author}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-fg-muted flex-shrink-0">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />{formatNumber(doc.views)}
              </span>
              {doc.read_time > 0 && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />{doc.read_time}p
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        docIds={[doc.id]}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  )
}

export default memo(DocumentCard)
