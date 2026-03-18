import { useEffect, useRef, useState } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  toastId: string | number
  title: string
  undoToken: string
  expiresIn: number            // seconds
  onUndo: (token: string) => void
}

export default function UndoToast({ toastId, title, undoToken, expiresIn, onUndo }: Props) {
  const [remaining, setRemaining] = useState(expiresIn)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((n) => {
        if (n <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  function handleUndo() {
    clearInterval(intervalRef.current)
    toast.dismiss(toastId)
    onUndo(undoToken)
  }

  const progress = (remaining / expiresIn) * 100
  const urgent = remaining <= 8

  // Truncate long title
  const displayTitle = title.length > 35 ? title.slice(0, 32) + '…' : title

  return (
    <div className="flex flex-col gap-2.5 bg-surface-2 border border-border rounded-xl shadow-xl p-4 min-w-[300px] max-w-[360px]">
      {/* Row 1: icon + title */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-4 h-4 text-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg-primary truncate">Đã xóa "{displayTitle}"</p>
        </div>
      </div>

      {/* Countdown bar */}
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-none ${urgent ? 'bg-danger' : 'bg-danger/50'}`}
          style={{
            width: `${progress}%`,
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Row 2: countdown text + undo button */}
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs ${urgent ? 'text-danger font-medium' : 'text-fg-secondary'}`}>
          Xóa vĩnh viễn sau <strong>{remaining}s</strong>
        </p>
        <button
          onClick={handleUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Hoàn tác
        </button>
      </div>
    </div>
  )
}

/** Show an undo toast and call onUndo if user clicks within the window. */
export function showUndoToast(
  title: string,
  undoToken: string,
  expiresIn: number,
  onUndo: (token: string) => void,
) {
  toast.custom(
    (t) => (
      <UndoToast
        toastId={t}
        title={title}
        undoToken={undoToken}
        expiresIn={expiresIn}
        onUndo={onUndo}
      />
    ),
    { duration: expiresIn * 1000, position: 'bottom-right' },
  )
}
