import { useEffect, useState } from 'react'
import { TrendingUp, BookOpen, CheckCircle, Clock, Flame, RotateCcw } from 'lucide-react'
import { api, localFileURL } from '../../lib/wailsApi'
import { useUserProgressStore } from '../stores/useUserProgressStore'
import { useUIStore } from '../../store/useUIStore'
import SvgCover from '../../helpers/svgCoverComponent'
import type { Document } from '../../types'

function formatReadingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} giờ ${m} phút`
  if (m > 0) return `${m} phút`
  return `${seconds} giây`
}

function calcStreak(progressMap: Record<string, { lastReadAt: string }>): number {
  const days = new Set<string>()
  Object.values(progressMap).forEach(({ lastReadAt }) => {
    if (lastReadAt) days.add(lastReadAt.substring(0, 10))
  })
  if (days.size === 0) return 0

  const sorted = Array.from(days).sort().reverse()
  let streak = 0
  const today = new Date()

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    const expectedStr = expected.toISOString().substring(0, 10)
    if (sorted[i] === expectedStr) streak++
    else break
  }
  return streak
}

export default function Progress() {
  const { readingProgress, recentlyRead, clearProgress } = useUserProgressStore()
  const { openViewer } = useUIStore()
  const [docs, setDocs] = useState<Record<string, Document>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ids = recentlyRead
    if (ids.length === 0) return
    setLoading(true)
    Promise.all(
      ids.map((id) => api.getDocument(id).then((d) => [id, d] as [string, Document]).catch(() => null))
    ).then((results) => {
      const map: Record<string, Document> = {}
      results.forEach((r) => { if (r) map[r[0]] = r[1] })
      setDocs(map)
    }).finally(() => setLoading(false))
  }, [])

  const entries = Object.entries(readingProgress)
  const done    = entries.filter(([, p]) => p.scrollPercent >= 95)
  const inProg  = entries.filter(([, p]) => p.scrollPercent > 5 && p.scrollPercent < 95)
    .sort(([, a], [, b]) => (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? ''))
  const totalSecs = entries.reduce((acc, [, p]) => acc + (p.readingTimeSeconds ?? 0), 0)
  const streak    = calcStreak(readingProgress as Record<string, { lastReadAt: string }>)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-fg-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />Tiến Độ Đọc
          </h1>
          <p className="text-sm text-fg-secondary mt-1">Theo dõi hành trình học tập của bạn</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="Đã xem" value={recentlyRead.length} color="rgb(var(--color-success))" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Đang đọc" value={inProg.length} color="rgb(var(--color-info))" />
          <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Hoàn thành" value={done.length} color="rgb(var(--color-success))" />
          <StatCard icon={<Flame className="w-4 h-4" />} label={`Streak ${streak} ngày`} value={totalSecs > 0 ? formatReadingTime(totalSecs) : '–'} color="rgb(var(--color-warning))" isText />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-success border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* In-progress section */}
        {!loading && inProg.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-primary mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-info" />Đang đọc dở ({inProg.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {inProg.map(([id, p]) => {
                const doc = docs[id]
                if (!doc) return null
                return (
                  <button key={id} onClick={() => openViewer(id)}
                    className="flex gap-3 p-3 rounded-xl border border-border bg-surface-2 hover:border-success/40 hover:bg-success/5 text-left transition-colors group">
                    <div className="w-16 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-surface-3">
                      {doc.cover_path
                        ? <img src={localFileURL(doc.cover_path)} alt="" className="w-full h-full object-cover" draggable={false} />
                        : <SvgCover docId={id} catId={doc.cat_id} className="w-full h-full" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-fg-primary truncate group-hover:text-success transition-colors">{doc.title}</p>
                      <div className="mt-1.5 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-info" style={{ width: `${p.scrollPercent}%` }} />
                      </div>
                      <p className="text-[10px] text-fg-muted mt-1">{p.scrollPercent}% · Đọc tiếp →</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Completed section */}
        {!loading && done.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-primary mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />Đã đọc xong ({done.length})
            </h2>
            <div className="space-y-2">
              {done.map(([id, p]) => {
                const doc = docs[id]
                if (!doc) return null
                return (
                  <div key={id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-success/20 bg-success/5 text-left">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-primary truncate">{doc.title}</p>
                      <p className="text-[10px] text-fg-muted">
                        {p.readingTimeSeconds > 0 ? formatReadingTime(p.readingTimeSeconds) + ' · ' : ''}
                        {p.lastReadAt ? new Date(p.lastReadAt).toLocaleDateString('vi-VN') : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => clearProgress(id)}
                      aria-label="Xóa tiến độ"
                      className="p-1.5 rounded hover:bg-surface-3 text-fg-muted hover:text-fg-primary transition-colors flex-shrink-0"
                      title="Xóa tiến độ"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* All recently read (fallback list) */}
        {!loading && inProg.length === 0 && done.length === 0 && recentlyRead.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-fg-primary mb-4">
              Tài Liệu Đã Xem ({recentlyRead.length})
            </h2>
            <div className="space-y-3">
              {recentlyRead.map((id) => {
                const doc = docs[id]
                const pct = readingProgress[id]?.scrollPercent ?? 0
                if (!doc) return null
                return (
                  <button key={id} onClick={() => openViewer(id)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl border border-border bg-surface-2 hover:border-success/40 hover:bg-success/5 text-left transition-colors group">
                    <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-3">
                      {doc.cover_path
                        ? <img src={localFileURL(doc.cover_path)} alt="" className="w-full h-full object-cover" />
                        : <SvgCover docId={id} catId={doc.cat_id} className="w-full h-full" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-primary truncate group-hover:text-success transition-colors">{doc.title}</p>
                      <div className="mt-1.5 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 95 ? 'rgb(var(--color-success))' : 'rgb(var(--color-info))' }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0"
                      style={{ color: pct >= 95 ? 'rgb(var(--color-success))' : 'rgb(var(--color-info))' }}>{pct}%</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {recentlyRead.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-60 text-center">
            <TrendingUp className="w-14 h-14 text-fg-muted mb-4" />
            <p className="text-fg-secondary font-medium">Chưa có tiến độ</p>
            <p className="text-fg-muted text-sm mt-1">Bắt đầu đọc để theo dõi tiến độ của bạn</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, isText }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; isText?: boolean
}) {
  return (
    <div className="bg-surface-2 rounded-xl border border-border p-3 flex flex-col items-center gap-1.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      {isText
        ? <p className="text-sm font-bold text-fg-primary text-center leading-tight">{value}</p>
        : <p className="text-2xl font-bold text-fg-primary">{value}</p>
      }
      <p className="text-[10px] text-fg-secondary text-center">{label}</p>
    </div>
  )
}
