import { memo } from 'react'
import { motion } from 'framer-motion'
import { Eye, Clock, Bookmark, BookmarkCheck, Lock, CheckCircle } from 'lucide-react'
import { toastSuccess } from '../../lib/toast'
import { useUIStore } from '../../store/useUIStore'
import { useUserLibraryStore } from '../stores/useUserLibraryStore'
import { useUserProgressStore } from '../stores/useUserProgressStore'
import { api, localFileURL } from '../../lib/wailsApi'
import { TYPE_LABELS, TYPE_COLORS, CAT_COLORS, formatNumber, formatDate } from '../../lib/utils'
import SvgCover from '../../helpers/svgCoverComponent'
import type { Document } from '../../types'

const SUCCESS_RGB = 'rgb(var(--color-success))'

function UserDocList({ documents }: { documents: Document[] }) {
  const { openViewer } = useUIStore()
  const { updateDocument } = useUserLibraryStore()
  const { readingProgress, isUnlocked } = useUserProgressStore()

  async function toggleSave(e: React.MouseEvent, doc: Document) {
    e.stopPropagation()
    const isSaved = !doc.is_saved
    await api.updateDocument(doc.id, { is_saved: isSaved })
    updateDocument({ ...doc, is_saved: isSaved })
    toastSuccess(isSaved ? 'Đã lưu' : 'Đã bỏ lưu')
  }

  return (
    <motion.div
      variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
      initial="initial" animate="animate"
      className="space-y-1"
    >
      {documents.map((doc) => {
        const catColor = CAT_COLORS[doc.cat_id] ?? '#6b7280'
        const coverSrc = doc.cover_path ? localFileURL(doc.cover_path) : null
        const pct = readingProgress[doc.id]?.scrollPercent ?? 0
        const isLocked = doc.is_locked && !isUnlocked(doc.id)

        return (
          <motion.div
            key={doc.id}
            variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, transition: { duration: 0.2 } } }}
            onClick={() => openViewer(doc.id)}
            role="article" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openViewer(doc.id)}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-3 cursor-pointer transition-colors group border border-transparent hover:border-border/60"
          >
            <div className="flex items-stretch gap-2 flex-shrink-0">
              <div className="w-1 rounded-full flex-shrink-0" style={{ background: catColor }} />
              <div className="w-[88px] h-[62px] rounded-lg overflow-hidden bg-surface-3 flex-shrink-0 relative">
                {coverSrc
                  ? <img src={coverSrc} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                  : <SvgCover docId={doc.id} catId={doc.cat_id} width={88} height={62} className="w-full h-full" />
                }
                {/* Progress bar at bottom of thumbnail */}
                {pct > 0 && (
                  <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/30">
                    <div className="h-full" style={{ width: `${pct}%`, background: pct >= 95 ? SUCCESS_RGB : 'rgb(var(--color-primary))' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h3 className="text-sm font-semibold text-fg-secondary truncate group-hover:text-fg-primary flex-1">
                  {doc.title}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[doc.type]}`}>
                  {TYPE_LABELS[doc.type]}
                </span>
              </div>
              {doc.summary && <p className="text-xs text-fg-muted line-clamp-1 mb-1">{doc.summary}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Lock indicator */}
                {isLocked && (
                  <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                    <Lock className="w-3 h-3" />Cần share
                  </span>
                )}
                {/* Progress text */}
                {pct >= 95 && (
                  <span className="text-[10px] text-success flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" />Đã đọc xong
                  </span>
                )}
                {pct > 5 && pct < 95 && (
                  <span className="text-[10px] text-fg-muted">Đã đọc {pct}%</span>
                )}
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

            <button
              onClick={(e) => toggleSave(e, doc)}
              aria-label={doc.is_saved ? `Bỏ lưu ${doc.title}` : `Lưu ${doc.title}`}
              aria-pressed={doc.is_saved}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-fg-muted"
            >
              {doc.is_saved
                ? <BookmarkCheck className="w-4 h-4 text-success" />
                : <Bookmark className="w-4 h-4" />
              }
            </button>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

export default memo(UserDocList)
