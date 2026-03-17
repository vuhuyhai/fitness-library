import { useEffect, useState } from 'react'
import { Bookmark, SlidersHorizontal } from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { useUIStore } from '../../store/useUIStore'
import { DocCardSkeleton } from '../../components/ui/Skeleton'
import UserDocCard from './UserDocCard'
import UserDocList from './UserDocList'
import type { Document } from '../../types'
import { useUserLibraryStore } from '../stores/useUserLibraryStore'

type SortMode = 'date' | 'title' | 'views'

export default function Bookmarks() {
  const [docs, setDocs]       = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState<SortMode>('date')
  const { viewMode, setViewMode } = useUIStore()
  const { updateDocument }    = useUserLibraryStore()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const all = await api.getDocuments({ is_saved: true, sort_by: sort, limit: 200, offset: 0 })
        setDocs(all)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sort])

  // Reflect bookmark toggles from UserDocCard
  useEffect(() => {
    const unsaved = docs.filter((d) => !d.is_saved)
    if (unsaved.length > 0) setDocs((p) => p.filter((d) => d.is_saved))
  }, [docs])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface flex-shrink-0">
        <Bookmark className="w-4 h-4 text-[#16a34a]" />
        <span className="text-sm font-semibold text-fg-primary flex-1">Tài Liệu Đã Lưu</span>

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-fg-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-surface-3/60 border border-border/40 rounded text-xs text-fg-secondary px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="date">Mới nhất</option>
            <option value="title">A → Z</option>
            <option value="views">Phổ biến</option>
          </select>
        </div>

        <div className="flex rounded-lg border border-border/50 overflow-hidden">
          <button onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#dcfce7] text-[#16a34a]' : 'text-fg-muted hover:bg-surface-3'}`}>
            ⊞
          </button>
          <button onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#dcfce7] text-[#16a34a]' : 'text-fg-muted hover:bg-surface-3'}`}>
            ☰
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-1.5 border-b border-border/30 flex-shrink-0">
        <span className="text-xs text-fg-muted">
          {loading ? 'Đang tải...' : `${docs.length} tài liệu đã lưu`}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {Array.from({ length: 6 }).map((_, i) => <DocCardSkeleton key={i} />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-60 text-center">
            <Bookmark className="w-14 h-14 text-fg-muted mb-4" />
            <p className="text-fg-secondary font-medium mb-1">Chưa lưu tài liệu nào</p>
            <p className="text-fg-muted text-sm">Nhấn biểu tượng bookmark khi đọc để lưu tài liệu</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {docs.map((doc, i) => <UserDocCard key={doc.id} doc={doc} index={i} />)}
          </div>
        ) : (
          <UserDocList documents={docs} />
        )}
      </div>
    </div>
  )
}
