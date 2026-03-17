import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...rest },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-fg-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full bg-surface-3 border rounded-md px-3 py-2 text-sm text-fg-primary',
          'placeholder:text-fg-muted',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-0',
          error
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-border-focus',
          className
        )}
        {...rest}
      />
      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
