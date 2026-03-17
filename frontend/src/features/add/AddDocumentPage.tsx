import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { FileText, Upload, Dumbbell, StickyNote, Sparkles, Save, X } from 'lucide-react'
import { api } from '../../lib/wailsApi'
import { useLibraryStore } from '../../store/useLibraryStore'
import { CAT_NAMES, CAT_COLORS } from '../../lib/utils'
import type { CreateDocumentInput, Exercise } from '../../types'
import ArticleTab from './tabs/ArticleTab'
import FileTab from './tabs/FileTab'
import WorkoutTab, { GOALS, LEVELS, emptyExercise } from './tabs/WorkoutTab'
import NoteTab from './tabs/NoteTab'

type TabKey = 'article' | 'file' | 'workout' | 'note'

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'article', label: 'Bài Viết',  icon: FileText   },
  { key: 'file',    label: 'Tải File',  icon: Upload      },
  { key: 'workout', label: 'Giáo Án',   icon: Dumbbell    },
  { key: 'note',    label: 'Ghi Chú',   icon: StickyNote  },
]

export default function AddDocumentPage() {
  const navigate = useNavigate()
  const { categories, documents } = useLibraryStore()
  const [activeTab, setActiveTab] = useState<TabKey>('article')
  const [saving, setSaving] = useState(false)

  const allKnownTags = useMemo(
    () => Array.from(new Set(documents.flatMap((d) => d.tags))).sort(),
    [documents]
  )

  // Shared fields
  const [title, setTitle]         = useState('')
  const [catId, setCatId]         = useState('')
  const [tagInput, setTagInput]   = useState('')
  const [tags, setTags]           = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)

  // Tab-specific state
  const [articleContent, setArticleContent] = useState('')
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('edit')
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const [filePath, setFilePath]   = useState('')
  const [fileName, setFileName]   = useState('')
  const [goal, setGoal]           = useState(GOALS[0])
  const [level, setLevel]         = useState(LEVELS[0])
  const [weeks, setWeeks]         = useState(4)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])
  const [noteContent, setNoteContent] = useState('')

  // ── Tag helpers ──
  function addTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)) }
  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1])
  }

  // ── Markdown toolbar ──
  function insertMd(prefix: string, suffix = '', placeholder = '') {
    const ta = editorRef.current
    if (!ta) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    const selected = value.slice(start, end) || placeholder
    const replacement = `${prefix}${selected}${suffix}`
    const newVal = value.slice(0, start) + replacement + value.slice(end)
    setArticleContent(newVal)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 0)
  }

  // ── File picker ──
  async function pickFile() {
    try {
      const paths = await api.selectFiles()
      if (!paths || paths.length === 0) return
      const p = paths[0]
      setFilePath(p)
      const parts = p.replace(/\\/g, '/').split('/')
      const name = parts[parts.length - 1].replace(/\.[^.]+$/, '')
      setFileName(parts[parts.length - 1])
      if (!title) setTitle(name)
    } catch (e) {
      toast.error('Lỗi chọn file: ' + String(e))
    }
  }

  // ── Exercise helpers ──
  function updateExercise(i: number, field: keyof Exercise, value: string | number) {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }
  function addExercise() { setExercises((prev) => [...prev, emptyExercise()]) }
  function removeExercise(i: number) { setExercises((prev) => prev.filter((_, idx) => idx !== i)) }

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!title.trim()) { toast.error('Vui lòng nhập tiêu đề'); return }
    setSaving(true)
    try {
      let input: CreateDocumentInput
      if (activeTab === 'article') {
        input = { title, type: 'article', cat_id: catId, content: articleContent, tags }
      } else if (activeTab === 'file') {
        if (!filePath) { toast.error('Chưa chọn file'); setSaving(false); return }
        const ext = fileName.split('.').pop()?.toLowerCase()
        const type = ext === 'mp4' || ext === 'mkv' || ext === 'avi' ? 'video'
          : ext === 'pdf' ? 'pdf'
          : 'article'
        input = { title, type, cat_id: catId, file_path: filePath, tags }
      } else if (activeTab === 'workout') {
        const plan = { goal, level, duration_weeks: weeks, sessions_per_week: sessionsPerWeek, exercises }
        input = { title, type: 'workout', cat_id: catId, content: JSON.stringify(plan), tags }
      } else {
        input = { title, type: 'note', cat_id: catId, content: noteContent, tags }
      }

      const doc = await api.createDocument(input)
      if (aiEnabled && doc.id) {
        api.runAIPipeline(doc.id).catch(() => {})
      }
      toast.success('Đã lưu tài liệu')
      navigate('/library')
    } catch (e) {
      toast.error('Lỗi lưu: ' + String(e))
    } finally {
      setSaving(false)
    }
  }, [activeTab, title, catId, tags, articleContent, filePath, fileName, goal, level, weeks, sessionsPerWeek, exercises, noteContent, aiEnabled])

  const flatCats = categories.flatMap((c) => [c, ...(c.children || [])])

  const tagSuggestions = useMemo(
    () => allKnownTags.filter((t) => t.includes(tagInput.toLowerCase()) && !tags.includes(t)).slice(0, 8),
    [allKnownTags, tagInput, tags]
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-fg-primary">Thêm Tài Liệu Mới</h1>
          <p className="text-sm text-fg-secondary mt-1">Tạo bài viết, nhập file, giáo án luyện tập hoặc ghi chú</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-surface-2 p-1 rounded-lg w-fit border border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-transparent text-fg-secondary hover:text-fg-primary hover:bg-surface-3'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main form */}
          <div className="col-span-2 space-y-5">
            <div>
              <label className="text-xs text-fg-secondary block mb-1.5">
                Tiêu đề <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề tài liệu..."
                className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'article' && (
                  <ArticleTab
                    content={articleContent}
                    setContent={setArticleContent}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                    editorRef={editorRef}
                    insertMd={insertMd}
                  />
                )}
                {activeTab === 'file' && (
                  <FileTab
                    filePath={filePath}
                    fileName={fileName}
                    onPick={pickFile}
                    onClear={() => { setFilePath(''); setFileName('') }}
                  />
                )}
                {activeTab === 'workout' && (
                  <WorkoutTab
                    goal={goal} setGoal={setGoal}
                    level={level} setLevel={setLevel}
                    weeks={weeks} setWeeks={setWeeks}
                    sessionsPerWeek={sessionsPerWeek} setSessionsPerWeek={setSessionsPerWeek}
                    exercises={exercises}
                    updateExercise={updateExercise}
                    addExercise={addExercise}
                    removeExercise={removeExercise}
                  />
                )}
                {activeTab === 'note' && (
                  <NoteTab content={noteContent} setContent={setNoteContent} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Category */}
            <div>
              <label className="text-xs text-fg-secondary block mb-1.5">Danh mục</label>
              <select
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2.5 text-sm text-fg-primary focus:outline-none focus:border-border-focus transition-colors cursor-pointer"
              >
                <option value="">— Không chọn —</option>
                {flatCats.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? `  ↳ ${cat.name}` : cat.name}
                  </option>
                ))}
              </select>
              {catId && CAT_COLORS[catId] && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[catId] }} />
                  <span className="text-xs text-fg-secondary">{CAT_NAMES[catId]}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="relative">
              <label className="text-xs text-fg-secondary block mb-1.5">Tags</label>
              <div className="bg-surface-3 border border-border rounded-lg px-2.5 py-2 min-h-[2.5rem] flex flex-wrap gap-1.5 focus-within:border-border-focus transition-colors">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-primary/15 text-primary border border-primary/25 rounded-full px-2 py-0.5"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-white">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
                  onKeyDown={onTagKeyDown}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                  placeholder={tags.length === 0 ? 'Nhập tag, Enter để thêm...' : ''}
                  className="flex-1 min-w-[80px] bg-transparent text-xs text-fg-primary placeholder:text-fg-muted focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-fg-muted mt-1">Enter hoặc dấu phẩy để thêm tag</p>
              {showTagSuggestions && tagInput && tagSuggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-surface-2 border border-border rounded-lg shadow-xl overflow-hidden">
                  {tagSuggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={() => { addTag(s); setShowTagSuggestions(false) }}
                      className="w-full text-left px-3 py-1.5 text-xs text-fg-primary hover:bg-surface-3 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI toggle */}
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-xs font-medium text-fg-primary">Auto AI</p>
                  <p className="text-[10px] text-fg-secondary">Tags & tóm tắt tự động</p>
                </div>
              </div>
              <button
                onClick={() => setAiEnabled((v) => !v)}
                className={`w-10 h-5 rounded-full transition-colors relative ${aiEnabled ? 'bg-yellow-500' : 'bg-surface-3 border border-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${aiEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Đang lưu...' : 'Lưu tài liệu'}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-2 text-xs text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
