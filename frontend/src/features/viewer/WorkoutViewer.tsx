import type { Document } from '../../types'

type ExRow = { name: string; sets: number; reps: string; weight?: string; rest?: string; notes?: string }
type PlanMeta = { goal?: string; level?: string; duration_weeks?: number; sessions_per_week?: number }

function parsePlan(content: string): { exercises: ExRow[]; planMeta: PlanMeta } {
  try {
    const parsed = JSON.parse(content || '[]')
    if (Array.isArray(parsed)) {
      return { exercises: parsed, planMeta: {} }
    }
    if (parsed && typeof parsed === 'object') {
      return {
        exercises: parsed.exercises ?? [],
        planMeta: {
          goal: parsed.goal,
          level: parsed.level,
          duration_weeks: parsed.duration_weeks,
          sessions_per_week: parsed.sessions_per_week,
        },
      }
    }
  } catch { /* fall through */ }
  return { exercises: [], planMeta: {} }
}

export default function WorkoutViewer({ doc }: { doc: Document }) {
  const { exercises, planMeta } = parsePlan(doc.content)
  const meta = doc.workout_plan ?? planMeta

  const metaRows: [string, string][] = [
    ['Mục tiêu', meta.goal ?? '—'],
    ['Trình độ', meta.level ?? '—'],
    ['Thời gian', meta.duration_weeks ? `${meta.duration_weeks} tuần` : '—'],
    ['Buổi/tuần', meta.sessions_per_week ? String(meta.sessions_per_week) : '—'],
  ]

  return (
    <div className="space-y-5">
      {(doc.workout_plan || planMeta.goal) && (
        <div className="grid grid-cols-2 gap-3">
          {metaRows.map(([label, value]) => (
            <div key={label} className="bg-surface-3 rounded-lg p-3 border border-border">
              <span className="text-[10px] text-fg-muted block mb-1 uppercase tracking-wide">{label}</span>
              <p className="text-sm font-semibold text-fg-primary capitalize">{value}</p>
            </div>
          ))}
        </div>
      )}

      {exercises.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-secondary border-b border-border">
              <th className="pb-2 font-medium">Bài tập</th>
              <th className="pb-2 font-medium">Sets</th>
              <th className="pb-2 font-medium">Reps</th>
              <th className="pb-2 font-medium">Tạ (kg)</th>
              <th className="pb-2 font-medium">Nghỉ</th>
              <th className="pb-2 font-medium">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surface-3/50">
                <td className="py-2.5 text-fg-primary font-medium">{ex.name}</td>
                <td className="py-2.5 text-fg-secondary">{ex.sets}</td>
                <td className="py-2.5 text-fg-secondary">{ex.reps}</td>
                <td className="py-2.5 text-fg-secondary">{ex.weight ?? '—'}</td>
                <td className="py-2.5 text-fg-secondary">{ex.rest ?? '—'}</td>
                <td className="py-2.5 text-fg-muted text-xs">{ex.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-fg-muted text-sm text-center py-8">Không có dữ liệu bài tập</p>
      )}
    </div>
  )
}
