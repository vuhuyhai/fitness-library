import { useEffect, useState, useCallback, useRef } from 'react'
import { BookOpen, Film, Dumbbell, Eye, TrendingUp, Clock, Upload, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api, localFileURL } from '../../lib/wailsApi'
import { useLibraryStore } from '../../store/useLibraryStore'
import { useUIStore } from '../../store/useUIStore'
import { useQueueStore } from '../../store/useQueueStore'
import { TYPE_LABELS, formatNumber, formatDate } from '../../lib/utils'
import { StatCardSkeleton } from '../../components/ui/Skeleton'
import SvgCover from '../../helpers/svgCoverComponent'
import type { DashboardStats } from '../../types'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { openViewer } = useUIStore()
  const { setActiveCategory, toggleTag } = useLibraryStore()
  const { addItems, addLog } = useQueueStore()
  const navigate = useNavigate()
  const dropRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    api.getDashboardStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const paths = await api.selectFiles()
    if (!paths || paths.length === 0) return
    try {
      const items = await api.queueFiles(paths)
      addItems(items)
      addLog(`Dashboard: thêm ${items.length} file vào queue`)
      toast.success(`Đã thêm ${items.length} file vào queue`)
      navigate('/import')
    } catch (err) {
      toast.error('Lỗi thêm file: ' + String(err))
    }
  }, [])

  const handleQuickImport = useCallback(async () => {
    try {
      const paths = await api.selectFiles()
      if (!paths || paths.length === 0) return
      const items = await api.queueFiles(paths)
      addItems(items)
      toast.success(`Đã thêm ${items.length} file`)
      navigate('/import')
    } catch (err) {
      toast.error(String(err))
    }
  }, [])

  const handleTagClick = (tag: string) => {
    toggleTag(tag)
    navigate('/library')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface">
      <div className="max-w-[1200px] mx-auto w-full px-6 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Tổng Quan</h1>
          <p className="text-sm text-fg-secondary mt-1">Thư viện kiến thức fitness của Vũ Hải</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Tổng Tài Liệu"
                value={formatNumber(stats?.total_documents ?? 0)}
                Icon={BookOpen}
                color="#2563eb"
                onClick={() => navigate('/library')}
              />
              <StatCard
                label="Video"
                value={formatNumber(stats?.by_type?.video ?? 0)}
                Icon={Film}
                color="#7c3aed"
                onClick={() => { setActiveCategory('cat-workout'); navigate('/library') }}
              />
              <StatCard
                label="Giáo Án"
                value={formatNumber(stats?.by_type?.workout ?? 0)}
                Icon={Dumbbell}
                color="#c73937"
                onClick={() => navigate('/library')}
              />
              <StatCard
                label="Lượt Xem"
                value={formatNumber(stats?.total_views ?? 0)}
                Icon={Eye}
                color="#d97706"
              />
            </>
          )}
        </div>

        {/* 2-col content */}
        <div className="grid grid-cols-5 gap-6">
          {/* Recent reads (60%) */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-fg-muted" />
                <h2 className="text-sm font-semibold text-fg-primary">Đọc Gần Đây</h2>
              </div>
              <button
                onClick={() => navigate('/library')}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
              >
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {stats?.recent_reads?.length ? (
                stats.recent_reads.slice(0, 8).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => openViewer(doc.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-3 transition-colors group text-left"
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-surface-3">
                      {doc.cover_path ? (
                        <img src={localFileURL(doc.cover_path)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <SvgCover docId={doc.id} catId={doc.cat_id} width={48} height={48} className="w-full h-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-primary truncate group-hover:text-primary font-medium">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-fg-muted">{TYPE_LABELS[doc.type]}</span>
                        <span className="text-fg-muted">·</span>
                        <span className="text-xs text-fg-muted flex items-center gap-1">
                          <Eye className="w-3 h-3" />{formatNumber(doc.views)}
                        </span>
                        {doc.read_time > 0 && (
                          <>
                            <span className="text-fg-muted">·</span>
                            <span className="text-xs text-fg-muted">{doc.read_time} phút</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-fg-muted flex-shrink-0">{formatDate(doc.created_at)}</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 text-fg-muted text-sm">Chưa có tài liệu nào</div>
              )}
            </div>
          </div>

          {/* Tags cloud (40%) */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-fg-muted" />
              <h2 className="text-sm font-semibold text-fg-primary">Tags Nổi Bật</h2>
            </div>
            {stats?.trending_tags?.length ? (
              <TagCloud tags={stats.trending_tags} onTagClick={handleTagClick} />
            ) : (
              <div className="text-center py-10 text-fg-muted text-sm">Chưa có tags</div>
            )}
          </div>
        </div>

        {/* Quick drop zone */}
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleQuickImport}
          className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
            dragOver
              ? 'border-primary bg-primary-light'
              : 'border-border hover:border-primary/40 hover:bg-surface-3'
          }`}
        >
          <Upload className={`w-8 h-8 transition-colors ${dragOver ? 'text-primary' : 'text-fg-muted'}`} />
          <div className="text-center">
            <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-primary' : 'text-fg-secondary'}`}>
              Kéo file vào đây để thêm nhanh
            </p>
            <p className="text-xs text-fg-muted mt-1">Hỗ trợ .pdf · .docx · .md · .mp4 · .txt</p>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  onClick?: () => void
}

function StatCard({ label, value, Icon, color, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-surface-2 border border-border rounded-lg p-4 hover:border-primary/30 hover:shadow-card-hover transition-all ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-fg-primary">{value}</p>
      <p className="text-xs text-fg-secondary mt-1">{label}</p>
    </button>
  )
}

// ─── Tag Cloud ───────────────────────────────────────────
interface TagCloudProps {
  tags: { tag: string; count: number }[]
  onTagClick: (tag: string) => void
}

function TagCloud({ tags, onTagClick }: TagCloudProps) {
  const maxCount = tags[0]?.count || 1
  const minSize  = 11
  const maxSize  = 20

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-surface-2 rounded-lg border border-border min-h-32">
      {tags.slice(0, 20).map((tc) => {
        const size    = minSize + ((tc.count / maxCount) * (maxSize - minSize))
        const opacity = 0.5 + (tc.count / maxCount) * 0.5
        return (
          <button
            key={tc.tag}
            onClick={() => onTagClick(tc.tag)}
            style={{ fontSize: `${size}px`, opacity }}
            className="text-primary hover:text-primary-hover hover:opacity-100 transition-all font-medium"
          >
            {tc.tag}
          </button>
        )
      })}
    </div>
  )
}
