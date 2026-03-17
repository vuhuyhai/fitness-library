import { memo } from 'react'
import { motion } from 'framer-motion'
import { Eye, Clock, Bookmark, BookmarkCheck } from 'lucide-react'
import { toastSuccess } from '../../lib/toast'
import { useUIStore } from '../../store/useUIStore'
import { useLibraryStore } from '../../store/useLibraryStore'
import { api, localFileURL } from '../../lib/wailsApi'
import { TYPE_LABELS, TYPE_COLORS, CAT_COLORS, formatNumber, formatDate } from '../../lib/utils'
import SvgCover from '../../helpers/svgCoverComponent'
import type { Document } from '../../types'

interface Props { documents: Document[] }

const listContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

function DocumentList({ documents }: Props) {
  const { openViewer } = useUIStore()
  const { updateDocument } = useLibraryStore()

  async function toggleSave(e: React.MouseEvent, doc: Document) {
    e.stopPropagation()
    const isSaved = !doc.is_saved
    await api.updateDocument(doc.id, { is_saved: isSaved })
    updateDocument({ ...doc, is_saved: isSaved })
    toastSuccess(isSaved ? 'Đã lưu' : 'Đã bỏ lưu')
  }

  return (
    <motion.div
      variants={listContainer}
      initial="initial"
      animate="animate"
      className="space-y-1"
    >
      {documents.map((doc) => {
        const catColor = CAT_COLORS[doc.cat_id] ?? '#6b7280'
        const coverSrc = doc.cover_path ? localFileURL(doc.cover_path) : null

        return (
          <motion.div
            key={doc.id}
            variants={listItem}
            onClick={() => { api.incrementViews(doc.id).catch(() => {}); openViewer(doc.id) }}
            role="article"
            aria-label={`${doc.title}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openViewer(doc.id)}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group border border-transparent hover:border-border/40"
          >
            {/* Stripe + thumbnail */}
            <div className="flex items-stretch gap-2 flex-shrink-0">
              <div className="w-1 rounded-full flex-shrink-0" style={{ background: catColor }} />
              <div className="w-[88px] h-[62px] rounded-lg overflow-hidden bg-surface-3 flex-shrink-0">
                {coverSrc ? (
                  <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <SvgCover docId={doc.id} catId={doc.cat_id} width={88} height={62} className="w-full h-full" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="text-sm font-semibold text-fg-secondary truncate group-hover:text-fg-primary flex-1">
                  {doc.title}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[doc.type]}`}>
                  {TYPE_LABELS[doc.type]}
                </span>
              </div>
              {doc.summary && (
                <p className="text-xs text-fg-muted line-clamp-1 mb-1">{doc.summary}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {doc.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] bg-surface-3 text-fg-muted px-1.5 py-0.5 rounded-full border border-border">{t}</span>
                ))}
                <span className="text-[10px] text-fg-muted flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />{formatNumber(doc.views)}
                </span>
                {doc.read_time > 0 && (
                  <span className="text-[10px] text-fg-muted flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />{doc.read_time}p
                  </span>
                )}
                <span className="text-[10px] text-fg-muted">{formatDate(doc.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={(e) => toggleSave(e, doc)}
              aria-label={doc.is_saved ? `Bỏ lưu ${doc.title}` : `Lưu ${doc.title}`}
              aria-pressed={doc.is_saved}
              className="p-1.5 rounded text-fg-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            >
              {doc.is_saved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export default memo(DocumentList)
