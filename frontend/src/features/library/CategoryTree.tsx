import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLibraryStore } from '../../store/useLibraryStore'

const QUICK_FILTERS = [
  { id: 'all',      label: 'Tất cả'  },
  { id: 'newest',   label: 'Mới nhất'},
  { id: 'trending', label: 'Trending'},
  { id: 'saved',    label: 'Đã lưu'  },
] as const

export default function CategoryTree() {
  const {
    categories, activeCategory, activeSubCategory, quickFilter,
    setActiveCategory, setActiveSubCategory, setQuickFilter,
  } = useLibraryStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggleExpand(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }))
  }

  return (
    <nav
      className="w-52 flex-shrink-0 flex flex-col border-r border-border overflow-y-auto bg-sidebar"
      role="navigation"
      aria-label="Danh mục tài liệu"
    >
      {/* Quick filters */}
      <div className="pt-3 pb-2">
        {QUICK_FILTERS.map(({ id, label }) => {
          const isActive = quickFilter === id && !activeCategory
          return (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'w-full flex items-center px-4 py-2 text-sm transition-colors',
                'border-l-[3px]',
                isActive
                  ? 'bg-primary-light text-primary border-primary font-medium'
                  : 'text-fg-secondary border-transparent hover:bg-surface-3 hover:text-fg-primary',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-1.5 pt-2">
        <span className="text-[10px] font-bold text-fg-muted uppercase tracking-widest">Danh mục</span>
      </div>

      {/* Category tree */}
      <ul role="tree" aria-label="Danh mục">
        {categories.map((cat) => {
          const hasChildren = (cat.children?.length ?? 0) > 0
          const isExpanded  = !!expanded[cat.id]
          const isActive    = activeCategory === cat.id && !activeSubCategory

          return (
            <li key={cat.id} role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
              <button
                onClick={() => { setActiveCategory(cat.id); if (hasChildren) toggleExpand(cat.id) }}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                  'border-l-[3px]',
                  isActive
                    ? 'bg-primary-light text-primary border-primary font-medium'
                    : 'text-fg-secondary border-transparent hover:bg-surface-3 hover:text-fg-primary',
                ].join(' ')}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: cat.color ?? '#6b7280' }}
                />
                <span className="flex-1 text-left truncate leading-snug">{cat.name}</span>
                <span className="text-xs text-fg-muted">{cat.count}</span>
                {hasChildren && (
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-fg-muted" />
                  </motion.span>
                )}
              </button>

              {/* Animated sub-category list */}
              <AnimatePresence initial={false}>
                {isExpanded && hasChildren && (
                  <motion.ul
                    role="group"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' as const }}
                    style={{ overflow: 'hidden' }}
                  >
                    {cat.children!.map((sub) => {
                      const isSubActive = activeSubCategory === sub.id
                      return (
                        <li key={sub.id} role="treeitem">
                          <button
                            onClick={() => setActiveSubCategory(sub.id)}
                            aria-current={isSubActive ? 'page' : undefined}
                            className={[
                              'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-xs transition-colors',
                              'border-l-[3px]',
                              isSubActive
                                ? 'bg-primary-light text-primary border-primary font-medium'
                                : 'text-fg-secondary border-transparent hover:bg-surface-3 hover:text-fg-primary',
                            ].join(' ')}
                          >
                            <span className="flex-1 text-left truncate">{sub.name}</span>
                            <span className="text-fg-muted">{sub.count}</span>
                          </button>
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
