import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-hover border-transparent',
  secondary: 'bg-surface border border-border text-primary hover:bg-primary-light',
  ghost:     'bg-transparent text-fg-secondary hover:bg-surface-3 hover:text-fg-primary border-transparent',
  danger:    'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2.5',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-md',
        'transition-colors duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {children}
    </button>
  )
})

export default Button
