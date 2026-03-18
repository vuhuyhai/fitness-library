import { useEffect, useCallback, useRef, useState } from 'react'
import { LayoutGrid, List, Plus, SlidersHorizontal, BookOpen, RefreshCw, CheckSquare, Trash2, X, Square } from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { toastError, toastSuccess } from '../../lib/toast'
import { useLibraryStore } from '../../store/useLibraryStore'
import { useUIStore } from '../../store/useUIStore'
import { DocCardSkeleton, DocRowSkeleton } from '../../components/ui/Skeleton'
import CategoryTree from './CategoryTree'
import DocumentCard from './DocumentCard'
import DocumentList from './DocumentList'
import TagFilterBar from './TagFilterBar'
import DeleteConfirmModal from '../../admin/components/DeleteConfirmModal'
import { showUndoToast } from '../../admin/components/UndoToast'
import type { Document, DocumentFilter, DeleteOptions } from '../../types'
import { useNavigate } from 'react-router-dom'

interface Props {
  isAdmin?: boolean
}

/** Minimum time (ms) to display skeleton to avoid flash */
function useMinLoadingTime(isLoading: boolean, minMs = 300) {
  const [show, setShow] = useState(isLoading)
  useEffect(() => {
    if (isLoading) {
      setShow(true)
    } else {
      const t = setTimeout(() => setShow(false), minMs)
      return () => clearTimeout(t)
    }
  }, [isLoading, minMs])
  return show
}

const SORT_OPTIONS = [
  { value: 'date',      label: 'Mới nhất'    },
  { value: 'views',     label: 'Phổ biến'    },
  { value: 'title',     label: 'A → Z'       },
  { value: 'read_time', label: 'Thời gian đọc'},
]

export default function LibraryPage({ isAdmin = false }: Props) {
  const {
    documents, setDocuments, categories, removeDocument, addDocument,
    activeCategory, activeTags, sortBy, setSortBy, quickFilter,
    isLoading, setLoading,
    isSelectionMode, selectedDocIds, toggleSelectionMode, toggleSelectDoc,
    selectAll, clearSelection,
  } = useLibraryStore()
  const { viewMode, setViewMode, searchQuery, setSearchQuery } = useUIStore()
  const showSkeleton = useMinLoadingTime(isLoading)
  const [searchResults, setSearchResults] = useState<Document[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const navigate = useNavigate()
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  // Toggle view mode via 'G' shortcut
  useEffect(() => {
    const handler = () => setViewMode(viewMode === 'grid' ? 'list' : 'grid')
    window.addEventListener('toggle-view-mode', handler)
    return () => window.removeEventListener('toggle-view-mode', handler)
  }, [viewMode])

  // Keyboard shortcuts in selection mode
  useEffect(() => {
    if (!isAdmin) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (inInput) return
      if (e.key === 'Escape' && isSelectionMode) { clearSelection(); return }
      if ((e.key === 'a' || e.key === 'A') && e.ctrlKey && isSelectionMode) {
        e.preventDefault()
        selectAll(filtered.map((d) => d.id))
      }
      if (e.key === 'Delete' && isSelectionMode && selectedDocIds.size > 0) {
        setBatchDeleteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAdmin, isSelectionMode, selectedDocIds])

  // Fetch documents on filter change
  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const isSaved = quickFilter === 'saved' ? true : undefined
      let resolvedSort: 'date' | 'title' | 'views' =
        sortBy === 'read_time' ? 'date' : (sortBy as 'date' | 'title' | 'views')
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

  // Load categories once
  useEffect(() => {
    if (categories.length === 0) {
      api.getCategories().then((cats) => useLibraryStore.getState().setCategories(cats))
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
        } finally {
          setIsSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const isSearchMode = searchQuery.length >= 2
  const baseList = isSearchMode ? searchResults : documents

  // Apply tag filter
  const filtered = activeTags.length > 0
    ? baseList.filter((d) => activeTags.every((t) => d.tags.includes(t)))
    : baseList

  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags))).sort()
  const activeCat = categories.find((c) => c.id === activeCategory)
  const selectedIds = Array.from(selectedDocIds)
  const allSelected = filtered.length > 0 && filtered.every((d) => selectedDocIds.has(d.id))

  async function handleBatchDelete(opts: DeleteOptions) {
    setBatchDeleteOpen(false)
    const ids = selectedIds
    const snapshots = filtered.filter((d) => ids.includes(d.id))
    clearSelection()

    // Optimistic removal
    ids.forEach((id) => removeDocument(id))

    try {
      const result = await api.batchDeleteDocuments(ids, opts)
      showUndoToast(`${ids.length} tài liệu`, result.undoToken, 30, async (token) => {
        try {
          await api.undoDelete(token)
          snapshots.forEach((doc) => addDocument(doc))
          toastSuccess(`Đã hoàn tác! ${ids.length} tài liệu được khôi phục.`)
        } catch {
          toastError('Không thể hoàn tác.')
        }
      })
    } catch (e) {
      snapshots.forEach((doc) => addDocument(doc))
      toastError('Lỗi xóa hàng loạt: ' + String(e))
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <CategoryTree />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface flex-shrink-0">
          {isAdmin && isSelectionMode ? (
            /* Selection mode topbar */
            <>
              <span className="text-sm font-medium text-fg-primary flex-1">
                {selectedDocIds.size} đã chọn
              </span>
              <button
                onClick={() => allSelected ? clearSelection() : selectAll(filtered.map((d) => d.id))}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-surface-3 transition-colors"
              >
                {allSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <button
                onClick={() => clearSelection()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-surface-3 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Thoát
              </button>
              <button
                onClick={() => { if (selectedDocIds.size > 0) setBatchDeleteOpen(true) }}
                disabled={selectedDocIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-danger hover:bg-danger/90 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa ({selectedDocIds.size})
              </button>
            </>
          ) : (
            /* Normal topbar */
            <>
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
                  placeholder="Tìm kiếm... (/)"
                  aria-label="Tìm kiếm tài liệu"
                  className="w-56 bg-surface-3/60 border border-border/40 rounded-lg px-3 py-1.5 text-xs text-fg-primary placeholder-fg-muted focus:outline-none focus:border-border-focus transition-colors"
                />
                {isSearching && (
                  <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-muted animate-spin" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-fg-muted" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sắp xếp theo"
                  className="bg-surface-3/60 border border-border/40 rounded text-xs text-fg-secondary px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* View toggle */}
              <div className="flex rounded-lg border border-border/50 overflow-hidden flex-shrink-0" role="group">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary-light text-primary' : 'text-fg-muted hover:text-fg-primary hover:bg-surface-3'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary-light text-primary' : 'text-fg-muted hover:text-fg-primary hover:bg-surface-3'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Admin: select many button */}
              {isAdmin && (
                <button
                  onClick={toggleSelectionMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs text-fg-secondary hover:text-fg-primary hover:bg-surface-3 rounded-lg transition-colors flex-shrink-0"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Chọn nhiều
                </button>
              )}

              {/* Add button */}
              <button
                onClick={() => navigate('/add')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Tài Liệu
              </button>
            </>
          )}
        </div>

        {/* Tag filter */}
        <TagFilterBar tags={allTags} />

        {/* Stats row */}
        <div className="px-4 py-1.5 flex items-center justify-between flex-shrink-0 border-b border-border/30">
          <span className="text-xs text-fg-muted">
            {showSkeleton ? 'Đang tải...' : `${filtered.length} tài liệu`}
            {activeTags.length > 0 && ` · lọc theo ${activeTags.length} tag`}
            {isSelectionMode && selectedDocIds.size > 0 && ` · đã chọn ${selectedDocIds.size}`}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showSkeleton ? (
            viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasSearch={isSearchMode}
              hasFilter={activeTags.length > 0}
              onReset={() => { setSearchQuery(''); useLibraryStore.getState().clearTags() }}
              onAdd={() => navigate('/add')}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4" style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
            }}>
              {filtered.map((doc, i) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  index={i}
                  isAdmin={isAdmin}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedDocIds.has(doc.id)}
                  onToggleSelect={toggleSelectDoc}
                  onDeleted={removeDocument}
                />
              ))}
            </div>
          ) : (
            <DocumentList documents={filtered} />
          )}
        </div>
      </div>

      {/* Batch delete modal */}
      <DeleteConfirmModal
        isOpen={batchDeleteOpen}
        docIds={selectedIds}
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {Array.from({ length: 8 }).map((_, i) => <DocCardSkeleton key={i} />)}
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => <DocRowSkeleton key={i} />)}
    </div>
  )
}

function EmptyState({ hasSearch, hasFilter, onReset, onAdd }: {
  hasSearch: boolean; hasFilter: boolean; onReset: () => void; onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-60 text-center">
      <BookOpen className="w-14 h-14 text-fg-muted mb-4" />
      <p className="text-fg-secondary font-medium mb-1">
        {hasSearch || hasFilter ? 'Không tìm thấy tài liệu phù hợp' : 'Thư viện trống'}
      </p>
      <p className="text-fg-muted text-sm mb-5">
        {hasSearch || hasFilter ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' : 'Hãy thêm tài liệu đầu tiên của bạn'}
      </p>
      <div className="flex gap-3">
        {(hasSearch || hasFilter) && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm border border-border text-fg-secondary hover:text-fg-primary rounded-lg transition-colors"
          >
            Reset bộ lọc
          </button>
        )}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm tài liệu
        </button>
      </div>
    </div>
  )
}
