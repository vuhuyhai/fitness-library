/**
 * UserVideoViewer — custom video player for user mode.
 * • No native controls (prevents right-click "Save Video As")
 * • Tracks progress and restores position
 * • Ctrl+S blocked in UserShell
 */
import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Expand } from 'lucide-react'
import { useUserProgressStore } from '../stores/useUserProgressStore'

interface Props {
  src: string
  title: string
  docId: string
}

export default function UserVideoViewer({ src, title, docId }: Props) {
  const progressStore = useUserProgressStore()
  const videoRef      = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [muted, setMuted]       = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loaded, setLoaded]     = useState(false)
  const throttleRef = useRef<ReturnType<typeof setTimeout>>()

  // Restore saved position when metadata loads
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    function onLoaded() {
      setDuration(v!.duration)
      setLoaded(true)
      const saved = progressStore.readingProgress[docId]
      if (saved && saved.scrollPercent > 2) {
        v!.currentTime = (saved.scrollPercent / 100) * v!.duration
      }
    }
    v.addEventListener('loadedmetadata', onLoaded)
    return () => v.removeEventListener('loadedmetadata', onLoaded)
  }, [docId])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  function onTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    const pct = (v.currentTime / v.duration) * 100
    setProgress(pct)
    // Throttle: save every 5s
    clearTimeout(throttleRef.current)
    throttleRef.current = setTimeout(() => {
      progressStore.updateScrollProgress(docId, pct)
    }, 5_000)
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

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full bg-black" onContextMenu={(e) => e.preventDefault()}>
      {/* Video element — no native controls, pointer-events none to block right-click menu */}
      <div className="flex-1 flex items-center justify-center relative" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-full"
          style={{ pointerEvents: 'none' }}
          muted={muted}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => { setPlaying(false); progressStore.markAsRead(docId) }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label={title}
          /* No controls prop — we render our own */
        />
        {/* Play overlay hint */}
        {!playing && loaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Custom controls */}
      <div className="bg-black/90 px-4 py-3 space-y-2" role="group" aria-label="Điều khiển video">
        {/* Seek bar */}
        <div
          role="slider" aria-label="Vị trí phát"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
          tabIndex={0}
          className="h-1.5 bg-gray-700 rounded-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#16a34a] relative group"
          onClick={seek} onKeyDown={seekByKey}
        >
          <div className="h-full bg-[#16a34a] rounded-full transition-none relative"
            style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} aria-label={playing ? 'Tạm dừng' : 'Phát'}
            className="text-white hover:text-[#16a34a] transition-colors">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="text-gray-400 hover:text-white transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="text-xs text-gray-400">
            {formatTime((progress / 100) * duration)} / {formatTime(duration)}
          </span>
          <span className="text-xs text-gray-500 flex-1 truncate">{title}</span>
          <button onClick={() => videoRef.current?.requestFullscreen()}
            aria-label="Toàn màn hình"
            className="text-gray-400 hover:text-white transition-colors">
            <Expand className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
