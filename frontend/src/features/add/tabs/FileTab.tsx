import { FileText, Folder, X } from 'lucide-react'

interface FileTabProps {
  filePath: string
  fileName: string
  onPick: () => void
  onClear: () => void
}

function getTypeLabel(ext: string | undefined): string {
  if (ext === 'mp4' || ext === 'mkv') return 'Video'
  if (ext === 'pdf') return 'PDF'
  if (ext === 'docx') return 'Word'
  return 'Văn bản'
}

export default function FileTab({ filePath, fileName, onPick, onClear }: FileTabProps) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const typeLabel = getTypeLabel(ext)

  if (!filePath) {
    return (
      <button
        onClick={onPick}
        className="w-full border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary-light/30 transition-all duration-200 group"
      >
        <Folder className="w-12 h-12 text-fg-muted group-hover:text-primary transition-colors" />
        <div className="text-center">
          <p className="text-fg-secondary font-medium text-sm group-hover:text-fg-primary">Nhấn để chọn file</p>
          <p className="text-xs text-fg-muted mt-1">PDF, DOCX, Markdown, MP4, MKV</p>
        </div>
      </button>
    )
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-surface-2">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
          <FileText className="w-7 h-7 text-fg-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg-primary truncate">{fileName}</p>
          <p className="text-xs text-fg-secondary mt-0.5 truncate">{filePath}</p>
          <span className="inline-block mt-1.5 text-[10px] bg-surface-3 text-fg-secondary px-2 py-0.5 rounded border border-border">
            {typeLabel}
          </span>
        </div>
        <button
          onClick={onClear}
          className="p-2 text-fg-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={onPick}
        className="mt-3 text-xs text-fg-secondary hover:text-fg-primary underline transition-colors"
      >
        Chọn file khác
      </button>
    </div>
  )
}
