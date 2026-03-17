import { memo } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useLibraryStore } from '../../store/useLibraryStore'

interface Props { tags: string[] }

function TagFilterBar({ tags }: Props) {
  const { activeTags, toggleTag, clearTags } = useLibraryStore()
  if (tags.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto scrollbar-hide flex-shrink-0">
      {activeTags.length > 0 && (
        <button
          onClick={clearTags}
          className="flex items-center gap-1 text-[11px] text-danger hover:text-danger/80 flex-shrink-0 transition-colors bg-danger/10 rounded-full px-2 py-1 border border-danger/20"
        >
          <X className="w-3 h-3" /> Xóa lọc
        </button>
      )}
      <div className="flex gap-1.5 flex-nowrap">
        {tags.map((tag, i) => (
          <motion.button
            key={tag}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ delay: i * 0.02, duration: 0.15 }}
            onClick={() => toggleTag(tag)}
            className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap ${
              activeTags.includes(tag)
                ? 'bg-primary-light border-primary/40 text-primary font-medium'
                : 'bg-surface-3 border-border text-fg-secondary hover:text-fg-primary hover:border-border-focus'
            }`}
          >
            {tag}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default memo(TagFilterBar)
