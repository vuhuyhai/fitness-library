import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface TagChipProps {
  tag: string
  active?: boolean
  removable?: boolean
  onClick?: () => void
  onRemove?: () => void
  className?: string
}

export default function TagChip({ tag, active, removable, onClick, onRemove, className }: TagChipProps) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap',
        'transition-colors duration-150',
        active
          ? 'bg-primary-light border-primary/40 text-primary font-medium'
          : 'bg-surface-2 border-border text-fg-secondary hover:text-fg-primary hover:border-border-focus',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {tag}
      {removable && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="hover:text-danger transition-colors"
          aria-label={`Xóa tag ${tag}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.span>
  )
}
