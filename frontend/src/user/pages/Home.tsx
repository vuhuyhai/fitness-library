import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, TrendingUp, Sparkles, Clock } from 'lucide-react'
import { api, localFileURL } from '../../lib/wailsApi'
import { useUIStore } from '../../store/useUIStore'
import { useUserProgressStore } from '../stores/useUserProgressStore'
import SvgCover from '../../helpers/svgCoverComponent'
import { formatDate, CAT_NAMES, TYPE_LABELS } from '../../lib/utils'
import type { Document } from '../../types'

export default function UserHome() {
  const [newest, setNewest]       = useState<Document[]>([])
  const [popular, setPopular]     = useState<Document[]>([])
  const [recentDocs, setRecentDocs] = useState<Document[]>([])
  const [loading, setLoading]     = useState(true)
  const { openViewer }            = useUIStore()
  const { recentlyRead, readingProgress } = useUserProgressStore()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [n, p] = await Promise.all([
          api.getDocuments({ sort_by: 'date',  limit: 6,  offset: 0 }),
          api.getDocuments({ sort_by: 'views', limit: 6,  offset: 0 }),
        ])
        setNewest(n)
        setPopular(p)

        // Load recently read docs
        if (recentlyRead.length > 0) {
          const recent = await Promise.all(
            recentlyRead.slice(0, 5).map((id) => api.getDocument(id).catch(() => null))
          )
          setRecentDocs(recent.filter(Boolean) as Document[])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function open(doc: Document) {
    openViewer(doc.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-success border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">Chào mừng trở lại! 👋</h1>
          <p className="text-fg-secondary mt-1 text-sm">Tiếp tục hành trình khám phá kiến thức của bạn</p>
        </div>

        {/* Continue reading */}
        {recentDocs.length > 0 && (
          <Section title="Tiếp tục đọc" icon={<BookOpen className="w-4 h-4" />} color="#16a34a">
            <div className="grid grid-cols-1 gap-3">
              {recentDocs.map((doc) => {
                const pct = readingProgress[doc.id]?.scrollPercent ?? 0
                return (
                  <ContinueCard key={doc.id} doc={doc} progress={pct} onClick={() => open(doc)} />
                )
              })}
            </div>
          </Section>
        )}

        {/* Mới thêm */}
        <Section title="Mới thêm" icon={<Sparkles className="w-4 h-4" />} color="#16a34a">
          <DocGrid docs={newest} onOpen={open} />
        </Section>

        {/* Phổ biến */}
        <Section title="Phổ biến" icon={<TrendingUp className="w-4 h-4" />} color="#16a34a">
          <DocGrid docs={popular} onOpen={open} />
        </Section>

      </div>
    </div>
  )
}

function Section({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: string; children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-fg-primary mb-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5" style={{ color }}>
          {icon} {title}
        </span>
      </h2>
      {children}
    </section>
  )
}

function ContinueCard({ doc, progress, onClick }: { doc: Document; progress: number; onClick: () => void }) {
  const coverSrc = doc.cover_path ? localFileURL(doc.cover_path) : null
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 3 }}
      className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface-2 hover:border-success/40 hover:bg-success/5 text-left w-full transition-colors group"
    >
      <div className="w-16 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-surface-3">
        {coverSrc
          ? <img src={coverSrc} alt="" className="w-full h-full object-cover" />
          : <SvgCover docId={doc.id} catId={doc.cat_id} className="w-full h-full" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg-primary truncate">{doc.title}</p>
        <p className="text-xs text-fg-muted mt-0.5">{CAT_NAMES[doc.cat_id] ?? 'Khác'}</p>
        {/* Progress bar */}
        <div className="mt-1.5 h-1 bg-surface-3 rounded-full overflow-hidden w-full">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'rgb(var(--color-success))' }}
          />
        </div>
      </div>
      <span className="text-xs text-fg-muted flex-shrink-0">{progress}%</span>
    </motion.button>
  )
}

function DocGrid({ docs, onOpen }: { docs: Document[]; onOpen: (doc: Document) => void }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
      {docs.map((doc, i) => {
        const coverSrc = doc.cover_path ? localFileURL(doc.cover_path) : null
        return (
          <motion.button
            key={doc.id}
            onClick={() => onOpen(doc)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(22,163,74,0.12)' }}
            className="rounded-xl border border-border bg-surface-2 overflow-hidden text-left cursor-pointer group"
          >
            <div className="h-28 bg-surface-3 overflow-hidden">
              {coverSrc
                ? <img src={coverSrc} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <SvgCover docId={doc.id} catId={doc.cat_id} className="w-full h-full" />
              }
            </div>
            <div className="p-3">
              <p className="text-xs text-fg-muted mb-1">
                {TYPE_LABELS[doc.type]} · {CAT_NAMES[doc.cat_id] ?? 'Khác'}
              </p>
              <h3 className="text-sm font-semibold text-fg-primary line-clamp-2 leading-snug">
                {doc.title}
              </h3>
              <p className="text-[11px] text-fg-muted mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(doc.created_at)}
              </p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
