import { Plus, X } from 'lucide-react'
import type { Exercise } from '../../../types'

interface WorkoutTabProps {
  goal: string; setGoal: (v: string) => void
  level: string; setLevel: (v: string) => void
  weeks: number; setWeeks: (v: number) => void
  sessionsPerWeek: number; setSessionsPerWeek: (v: number) => void
  exercises: Exercise[]
  updateExercise: (i: number, field: keyof Exercise, value: string | number) => void
  addExercise: () => void
  removeExercise: (i: number) => void
}

export const GOALS = ['Giảm mỡ', 'Tăng cơ', 'Sức bền', 'Linh hoạt', 'Phục hồi', 'Sức mạnh']
export const LEVELS = ['Người mới', 'Trung bình', 'Nâng cao', 'Chuyên nghiệp']
export function emptyExercise(): Exercise {
  return { name: '', sets: 3, reps: '10', weight: '', rest: '60s', notes: '' }
}

const inputCls = 'w-full bg-surface-3 border border-border rounded px-2 py-1.5 text-xs text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors'
const selectCls = 'w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-border-focus cursor-pointer transition-colors'

export default function WorkoutTab({
  goal, setGoal, level, setLevel, weeks, setWeeks,
  sessionsPerWeek, setSessionsPerWeek,
  exercises, updateExercise, addExercise, removeExercise,
}: WorkoutTabProps) {
  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-secondary block mb-1.5">Mục tiêu</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className={selectCls}>
            {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-fg-secondary block mb-1.5">Trình độ</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-fg-secondary block mb-1.5">Số tuần</label>
          <input
            type="number" min={1} max={52}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className={selectCls}
          />
        </div>
        <div>
          <label className="text-xs text-fg-secondary block mb-1.5">Buổi / tuần</label>
          <input
            type="number" min={1} max={7}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
            className={selectCls}
          />
        </div>
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-fg-secondary">Bài tập ({exercises.length})</label>
          <button
            onClick={addExercise}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            <Plus className="w-3 h-3" /> Thêm bài
          </button>
        </div>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center bg-surface-2 rounded-lg p-2.5 border border-border group">
              <div className="col-span-4">
                <input
                  value={ex.name}
                  onChange={(e) => updateExercise(i, 'name', e.target.value)}
                  placeholder="Tên bài tập"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number" min={1}
                  value={ex.sets}
                  onChange={(e) => updateExercise(i, 'sets', Number(e.target.value))}
                  placeholder="Sets"
                  className={inputCls + ' text-center'}
                />
              </div>
              <div className="col-span-2">
                <input
                  value={ex.reps}
                  onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                  placeholder="Reps"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <input
                  value={ex.weight || ''}
                  onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                  placeholder="kg"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between gap-1">
                <input
                  value={ex.rest || ''}
                  onChange={(e) => updateExercise(i, 'rest', e.target.value)}
                  placeholder="Rest"
                  className={'flex-1 ' + inputCls}
                />
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(i)}
                    className="text-fg-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-2.5 text-[10px] text-fg-muted">
            <div className="col-span-4">Tên bài</div>
            <div className="col-span-2 text-center">Sets</div>
            <div className="col-span-2">Reps</div>
            <div className="col-span-2">Tạ (kg)</div>
            <div className="col-span-2">Nghỉ</div>
          </div>
        </div>
      </div>
    </div>
  )
}
