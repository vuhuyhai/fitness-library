import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Expand } from 'lucide-react'

interface VideoViewerProps {
  src: string
  title: string
}

export default function VideoViewer({ src, title }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  function onTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }

  function seekByKey(e: React.KeyboardEvent) {
    const v = videoRef.current
    if (!v) return
    if (e.key === 'ArrowRight') v.currentTime = Math.min(v.duration, v.currentTime + 5)
    if (e.key === 'ArrowLeft')  v.currentTime = Math.max(0, v.currentTime - 5)
  }

  function toggleMute() {
    const v = videoRef.current
    const next = !muted
    setMuted(next)
    if (v) v.muted = next
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-full"
          muted={muted}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setPlaying(false)}
          onClick={togglePlay}
          aria-label={title}
        />
      </div>

      {/* Controls */}
      <div className="bg-black/80 px-4 py-3 space-y-2" role="group" aria-label="Điều khiển video">
        {/* Progress / seek bar */}
        <div
          role="slider"
          aria-label="Vị trí phát"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          tabIndex={0}
          className="h-1 bg-surface-3 rounded-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          onClick={seek}
          onKeyDown={seekByKey}
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Tạm dừng' : 'Phát'}
            className="text-white hover:text-primary transition-colors"
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="text-white/60 hover:text-white transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="text-xs text-white/50 flex-1 truncate">{title}</span>
          <button
            onClick={() => videoRef.current?.requestFullscreen()}
            aria-label="Toàn màn hình"
            className="text-white/60 hover:text-white transition-colors"
          >
            <Expand className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
