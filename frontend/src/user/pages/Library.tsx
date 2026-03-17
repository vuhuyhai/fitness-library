/**
 * User Library — read-only. Không có nút Thêm / Sửa / Xóa.
 * Sử dụng useUserLibraryStore thay vì useLibraryStore.
 * CategoryTree vẫn dùng useLibraryStore (shared singleton —
 * admin và user không bao giờ hoạt động đồng thời).
 */
import { useEffect, useCallback, useRef, useState } from 'react'
import { LayoutGrid, List, SlidersHorizontal, BookOpen, RefreshCw } from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { toastError } from '../../lib/toast'
import { useUserLibraryStore } from '../stores/useUserLibraryStore'
import { useLibraryStore } from '../../store/useLibraryStore'
import { useUIStore } from '../../store/useUIStore'
import { DocCardSkeleton, DocRowSkeleton } from '../../components/ui/Skeleton'
import CategoryTree from '../../features/library/CategoryTree'
import TagFilterBar from '../../features/library/TagFilterBar'
import UserDocCard from './UserDocCard'
import UserDocList from './UserDocList'
import type { Document, DocumentFilter } from '../../types'

function useMinLoadingTime(isLoading: boolean, minMs = 300) {
  const [show, setShow] = useState(isLoading)
  useEffect(() => {
    if (isLoading) { setShow(true) } else {
      const t = setTimeout(() => setShow(false), minMs)
      return () => clearTimeout(t)
    }
  }, [isLoading, minMs])
  return show
}

const SORT_OPTIONS = [
  { value: 'date',  label: 'Mới nhất'  },
  { value: 'views', label: 'Phổ biến'  },
  { value: 'title', label: 'A → Z'     },
]

export default function UserLibrary() {
  // Documents state from UserLibraryStore
  const {
    documents, setDocuments, activeTags, sortBy, setSortBy, quickFilter, isLoading, setLoading,
  } = useUserLibraryStore()
  // Category filter from LibraryStore (shared with CategoryTree)
  const { activeCategory, categories, setCategories } = useLibraryStore()
  const { viewMode, setViewMode, searchQuery, setSearchQuery } = useUIStore()
  const showSkeleton = useMinLoadingTime(isLoading)
  const [searchResults, setSearchResults] = useState<Document[]>([])
  const [isSearching, setIsSearching]     = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const handler = () => setViewMode(viewMode === 'grid' ? 'list' : 'grid')
    window.addEventListener('toggle-view-mode', handler)
    return () => window.removeEventListener('toggle-view-mode', handler)
  }, [viewMode])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const isSaved: boolean | undefined = undefined  // User bookmarks handled in Bookmarks page
      let resolvedSort: 'date' | 'title' | 'views' = sortBy
      if (quickFilter === 'trending') resolvedSort = 'views'
      if (quickFilter === 'newest')   resolvedSort = 'date'

      const filter: DocumentFilter = {
        cat_id: activeCategory ?? '',
        sort_by: resolvedSort,
        limit: 200,
        offset: 0,
        is_saved: isSaved,
      }
      const docs = await api.getDocuments(filter)
      setDocuments(docs)
    } catch (e) {
      toastError('Lỗi tải tài liệu: ' + String(e))
    } finally {
      setLoading(false)
    }
  }, [activeCategory, sortBy, quickFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  useEffect(() => {
    if (categories.length === 0) {
      api.getCategories().then(setCategories).catch(console.error)
    }
  }, [])

  // Search debounce
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (searchQuery.length >= 2) {
      setIsSearching(true)
      searchTimer.current = setTimeout(async () => {
        try {
          const results = await api.searchDocuments(searchQuery)
          setSearchResults(results)
        } finally { setIsSearching(false) }
      }, 300)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const isSearchMode = searchQuery.length >= 2
  const baseList     = isSearchMode ? searchResults : documents
  const filtered     = activeTags.length > 0
    ? baseList.filter((d) => activeTags.every((t) => d.tags.includes(t)))
    : baseList
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags))).sort()
  const activeCat = categories.find((c) => c.id === activeCategory)

  return (
    <div className="flex h-full overflow-hidden">
      <CategoryTree />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <span className="text-fg-muted">Thư Viện</span>
            {activeCat && (
              <>
                <span className="text-fg-muted">/</span>
                <span className="text-fg-primary font-medium truncate">{activeCat.name}</span>
              </>
            )}
            {isSearchMode && (
              <>
                <span className="text-fg-muted">/</span>
                <span className="text-fg-primary">Tìm kiếm: "{searchQuery}"</span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <input
              id="lib-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              aria-label="Tìm kiếm tài liệu"
              className="w-52 bg-surface-3/60 border border-border/40 rounded-lg px-3 py-1.5 text-xs text-fg-primary placeholder-fg-muted focus:outline-none focus:border-[#16a34a]/50 transition-colors"
            />
            {isSearching && <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-muted animate-spin" />}
            {searchQuery && !isSearching && (
              <button onClick={() => setSearchQuery('')} aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary text-xs">✕</button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-fg-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'views')}
              aria-label="Sắp xếp theo"
              className="bg-surface-3/60 border border-border/40 rounded text-xs text-fg-secondary px-2 py-1.5 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border/50 overflow-hidden flex-shrink-0" role="group">
            <button onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#dcfce7] text-[#16a34a]' : 'text-fg-muted hover:text-fg-primary hover:bg-surface-3'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#dcfce7] text-[#16a34a]' : 'text-fg-muted hover:text-fg-primary hover:bg-surface-3'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* NOTE: Không có nút "Thêm Tài Liệu" ở User mode */}
        </div>

        <TagFilterBar tags={allTags} />

        {/* Stats row */}
        <div className="px-4 py-1.5 flex items-center flex-shrink-0 border-b border-border/30">
          <span className="text-xs text-fg-muted">
            {showSkeleton ? 'Đang tải...' : `${filtered.length} tài liệu`}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showSkeleton ? (
            viewMode === 'grid'
              ? <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {Array.from({ length: 8 }).map((_, i) => <DocCardSkeleton key={i} />)}
                </div>
              : <div className="space-y-1">
                  {Array.from({ length: 8 }).map((_, i) => <DocRowSkeleton key={i} />)}
                </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-60 text-center">
              <BookOpen className="w-14 h-14 text-fg-muted mb-4" />
              <p className="text-fg-secondary font-medium mb-1">
                {isSearchMode ? 'Không tìm thấy tài liệu phù hợp' : 'Thư viện trống'}
              </p>
              <p className="text-fg-muted text-sm">
                {isSearchMode ? 'Thử thay đổi từ khóa tìm kiếm' : 'Chưa có tài liệu nào'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {filtered.map((doc, i) => <UserDocCard key={doc.id} doc={doc} index={i} />)}
            </div>
          ) : (
            <UserDocList documents={filtered} />
          )}
        </div>
      </div>
    </div>
  )
}
