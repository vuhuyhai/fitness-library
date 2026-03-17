import { useState, useRef } from 'react'
import { Sparkles, Upload, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/wailsApi'
import SvgCover from '../../helpers/svgCoverComponent'

interface ThumbnailPickerProps {
  docId: string
  title: string
  catId: string
  coverPath: string
  thumbnailSource: string
  onUpdate: (coverPath: string, source: string) => void
}

export default function ThumbnailPicker({
  docId,
  title,
  catId,
  coverPath,
  thumbnailSource,
  onUpdate,
}: ThumbnailPickerProps) {
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Derive preview URL
  const previewUrl = coverPath
    ? (coverPath.startsWith('/localfile/') ? coverPath : `/localfile/thumbnails/${docId}.jpg`)
    : null

  const sourceLabel: Record<string, string> = {
    svg: 'SVG', ai: 'AI', pdf: 'PDF', video: 'Video', upload: 'Upload',
  }
  const sourceBadgeColor: Record<string, string> = {
    svg: 'text-fg-muted bg-surface-3',
    ai: 'text-purple-400 bg-purple-400/10',
    pdf: 'text-blue-400 bg-blue-400/10',
    video: 'text-orange-400 bg-orange-400/10',
    upload: 'text-success bg-success/10',
  }

  async function handleGenerateAI() {
    if (!docId) return
    setGenerating(true)
    const toastId = toast.loading('AI đang tạo thumbnail...')
    try {
      const result = await api.generateThumbnail(docId)
      onUpdate(result.cover_path, 'ai')
      toast.success('Thumbnail AI đã sẵn sàng!', { id: toastId })
    } catch (e) {
      toast.error('Không tạo được thumbnail: ' + String(e), { id: toastId })
    } finally {
      setGenerating(false)
    }
  }

  async function handleUpload(file: File) {
    if (!docId || !file) return
    setUploading(true)
    try {
      const result = await api.uploadThumbnail(docId, file)
      onUpdate(result.cover_path, 'upload')
      toast.success('Đã upload thumbnail')
    } catch (e) {
      toast.error('Lỗi upload: ' + String(e))
    } finally {
      setUploading(false)
    }
  }

  async function handleReset() {
    if (!docId) return
    try {
      await api.deleteThumbnail(docId)
      onUpdate('', 'svg')
      toast.success('Đã đặt lại về SVG mặc định')
    } catch (e) {
      toast.error('Lỗi: ' + String(e))
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      <div className="relative rounded-lg overflow-hidden bg-surface-3 border border-border" style={{ height: 120 }}>
        {previewUrl ? (
          <img
            src={previewUrl + '?t=' + Date.now()}
            alt="thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <SvgCover docId={docId || 'preview'} catId={catId} className="w-full h-full" />
        )}
        {/* Source badge */}
        <span className={`absolute top-1.5 left-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${sourceBadgeColor[thumbnailSource] ?? sourceBadgeColor.svg}`}>
          {sourceLabel[thumbnailSource] ?? 'SVG'}
        </span>
        {(generating || uploading) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Actions */}
      {docId ? (
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleGenerateAI}
            disabled={generating || uploading}
            title="Tạo thumbnail AI (Pollinations)"
            className="flex flex-col items-center gap-1 py-2 text-[10px] bg-surface-3 hover:bg-primary-light hover:text-primary border border-border rounded-md transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI tạo
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={generating || uploading}
            title="Upload ảnh thủ công"
            className="flex flex-col items-center gap-1 py-2 text-[10px] bg-surface-3 hover:bg-surface-2 border border-border rounded-md transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload
          </button>
          <button
            onClick={handleReset}
            disabled={generating || uploading || thumbnailSource === 'svg'}
            title="Đặt lại về SVG mặc định"
            className="flex flex-col items-center gap-1 py-2 text-[10px] bg-surface-3 hover:bg-surface-2 border border-border rounded-md transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mặc định
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-fg-muted text-center py-1">
          Thumbnail AI sẽ tự động tạo sau khi lưu
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
    </div>
  )
}
