import type { ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'category' | 'type' | 'default'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  color?: string       // hex — used for category badge
  className?: string
}

export default function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  if (variant === 'category' && color) {
    return (
      <span
        className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full', className)}
        style={{
          color,
          background: `${color}18`,
          border: `1px solid ${color}40`,
        }}
      >
        {children}
      </span>
    )
  }

  if (variant === 'type') {
    return (
      <span className={clsx(
        'text-[10px] font-medium px-2 py-0.5 rounded-full',
        'bg-info/10 text-info border border-info/20',
        className
      )}>
        {children}
      </span>
    )
  }

  return (
    <span className={clsx(
      'text-[10px] font-medium px-2 py-0.5 rounded-full',
      'bg-surface-3 text-fg-secondary border border-border',
      className
    )}>
      {children}
    </span>
  )
}
