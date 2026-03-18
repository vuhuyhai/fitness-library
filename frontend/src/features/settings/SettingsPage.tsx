import { useEffect, useState } from 'react'
import { Eye, EyeOff, RefreshCw, Folder, Database, ExternalLink, Plus, Trash2, Download, Bot, KeyRound, HardDrive, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { api, isWails } from '../../lib/wailsApi'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useLibraryStore } from '../../store/useLibraryStore'
import type { Category, StorageInfo } from '../../types'

type AIProvider = 'claude' | 'gemini' | 'openai'

const AI_PROVIDERS: { id: AIProvider; label: string; placeholder: string; keyName: string }[] = [
  { id: 'claude',  label: 'Claude (Anthropic)', placeholder: 'sk-ant-api03-...', keyName: 'ai.api_key' },
  { id: 'gemini',  label: 'Gemini (Google)',     placeholder: 'AIzaSy...',         keyName: 'ai.gemini_api_key' },
  { id: 'openai',  label: 'ChatGPT (OpenAI)',    placeholder: 'sk-...',            keyName: 'ai.openai_api_key' },
]

const MODEL_OPTIONS: Record<AIProvider, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (mặc định)' },
    { value: 'claude-opus-4-6',           label: 'Claude Opus 4.6 (mạnh nhất)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (nhanh nhất)' },
    { value: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5' },
    { value: 'claude-3-7-sonnet-20250219',label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-20241022',label: 'Claude 3.5 Sonnet' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (mặc định)' },
    { value: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro (mạnh nhất)' },
    { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (ổn định)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (nhanh nhất)' },
    { value: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro (cũ)' },
  ],
  openai: [
    { value: 'gpt-4o',                  label: 'GPT-4o (mặc định)' },
    { value: 'gpt-4o-mini',             label: 'GPT-4o Mini (nhanh & tiết kiệm)' },
    { value: 'gpt-4.1',                 label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini',            label: 'GPT-4.1 Mini' },
    { value: 'o1',                      label: 'o1 (suy luận)' },
    { value: 'o1-mini',                 label: 'o1 Mini (suy luận nhanh)' },
    { value: 'o3-mini',                 label: 'o3 Mini (suy luận mới nhất)' },
  ],
}

const EMOJI_OPTIONS = ['💪', '🥗', '🧘', '🧠', '🔬', '📚', '🏃', '🎯', '🌿', '⚡']
const COLOR_OPTIONS = ['#c73937', '#16a34a', '#2563eb', '#7c3aed', '#0891b2', '#d97706', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6']

export default function SettingsPage() {
  const [settings, setLocalSettings] = useState<Record<string, string>>({})
  const [showKey, setShowKey]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd]   = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [testing, setTesting]         = useState(false)
  const [dbStats, setDbStats]         = useState<Record<string, unknown> | null>(null)
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [backingUp, setBackingUp]     = useState(false)
  const [appVersion, setAppVersion]   = useState('1.0.0')
  const { setSettings, setAiStatus }  = useSettingsStore()

  const { categories, setCategories } = useLibraryStore()
  const [newCatName, setNewCatName]   = useState('')
  const [newCatIcon, setNewCatIcon]   = useState('📚')
  const [newCatColor, setNewCatColor] = useState('#16a34a')
  const [addingCat, setAddingCat]     = useState(false)

  useEffect(() => {
    api.getSettings().then(setLocalSettings).catch(console.error)
    api.getDBStats().then(setDbStats).catch(console.error)
    api.getStorageInfo().then(setStorageInfo).catch(console.error)
    api.getAppVersion().then(setAppVersion).catch(console.error)
    if (categories.length === 0) {
      api.getCategories().then(setCategories).catch(console.error)
    }
  }, [])

  function update(key: string, value: string) {
    setLocalSettings((p) => ({ ...p, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.saveSettings(settings)
      setSettings(settings)
      if (settings['ai.api_key']) setAiStatus('unknown')
      toast.success('Đã lưu cài đặt')
    } catch (e) {
      toast.error('Lỗi lưu: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    const provider = (settings['ai.provider'] || 'claude') as AIProvider
    const providerInfo = AI_PROVIDERS.find((p) => p.id === provider)!
    setTesting(true)
    try {
      // Save current provider settings before testing
      await api.saveSettings({
        'ai.provider':        provider,
        'ai.api_key':         settings['ai.api_key'] || '',
        'ai.gemini_api_key':  settings['ai.gemini_api_key'] || '',
        'ai.openai_api_key':  settings['ai.openai_api_key'] || '',
        'ai.model':           settings['ai.model'] || '',
      })
      await api.testAIConnection()
      setAiStatus('connected')
      toast.success(`Kết nối ${providerInfo.label} thành công!`)
    } catch (e) {
      setAiStatus('offline')
      toast.error('Lỗi kết nối: ' + String(e))
    } finally {
      setTesting(false)
    }
  }

  async function selectDir() {
    const dir = await api.selectDirectory()
    if (dir) update('library.dir', dir)
  }

  async function rebuildFTS() {
    try {
      await api.rebuildFTS()
      toast.success('Đã rebuild FTS5 index')
    } catch (e) {
      toast.error('Lỗi: ' + String(e))
    }
  }

  async function clearCache() {
    try {
      await api.clearThumbnailCache()
      toast.success('Đã xóa thumbnail cache')
    } catch (e) {
      toast.error('Lỗi: ' + String(e))
    }
  }

  async function changePassword() {
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    setChangingPwd(true)
    try {
      await api.saveSettings({ 'admin.new_password': newPassword })
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Đã đổi mật khẩu thành công')
    } catch (e) {
      toast.error('Lỗi đổi mật khẩu: ' + String(e))
    } finally {
      setChangingPwd(false)
    }
  }

  async function backupNow() {
    setBackingUp(true)
    try {
      const result = await api.backupDatabase()
      toast.success(`Backup tạo thành công: ${result.path.split(/[\\/]/).pop()}`)
    } catch (e) {
      toast.error('Lỗi backup: ' + String(e))
    } finally {
      setBackingUp(false)
    }
  }

  function fmtBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  async function exportJSON() {
    try {
      const docs = await api.getDocuments({ limit: 9999 })
      const blob = new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `fitness-library-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Đã xuất ${docs.length} tài liệu`)
    } catch (e) {
      toast.error('Lỗi xuất dữ liệu: ' + String(e))
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const cat = await api.createCategory(newCatName.trim(), newCatIcon, newCatColor, '')
      setCategories([...categories, cat])
      setNewCatName('')
      toast.success(`Đã thêm danh mục "${cat.name}"`)
    } catch (e) {
      toast.error('Lỗi thêm danh mục: ' + String(e))
    } finally {
      setAddingCat(false)
    }
  }

  async function deleteCategory(cat: Category) {
    if (cat.count > 0) {
      toast.error(`Không thể xóa — còn ${cat.count} tài liệu trong "${cat.name}"`)
      return
    }
    try {
      await api.deleteCategory(cat.id)
      setCategories(categories.filter((c) => c.id !== cat.id))
      toast.success(`Đã xóa danh mục "${cat.name}"`)
    } catch (e) {
      toast.error('Lỗi xóa: ' + String(e))
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-fg-primary">Cài Đặt</h1>
          <p className="text-sm text-fg-secondary mt-1">Cấu hình AI, thư mục, danh mục và các tuỳ chọn khác</p>
        </div>

        {/* ── AI & Phân Loại ── */}
        <Section accent="#c73937" title="AI & Phân Loại">
          <div className="space-y-4">

            {/* Provider selector */}
            <Field label="Nhà cung cấp AI">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-2 rounded-lg border border-border">
                {AI_PROVIDERS.map((p) => {
                  const active = (settings['ai.provider'] || 'claude') === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        update('ai.provider', p.id)
                        update('ai.model', '') // reset model on provider change
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                        active
                          ? 'bg-white dark:bg-surface-3 text-primary shadow-sm border border-primary/20'
                          : 'text-fg-muted hover:text-fg-primary hover:bg-surface-3/60'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{
                        p.id === 'claude' ? 'Claude' : p.id === 'gemini' ? 'Gemini' : 'ChatGPT'
                      }</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-fg-muted mt-1.5">
                {AI_PROVIDERS.find((p) => p.id === (settings['ai.provider'] || 'claude'))?.label}
              </p>
            </Field>

            {/* API Key for active provider */}
            {AI_PROVIDERS.map((p) => {
              if ((settings['ai.provider'] || 'claude') !== p.id) return null
              const keyValue = settings[p.keyName] || ''
              return (
                <Field key={p.id} label={`${p.label} — API Key`}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={keyValue}
                        onChange={(e) => update(p.keyName, e.target.value)}
                        placeholder={p.placeholder}
                        className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-primary/30 pr-9 transition-colors"
                      />
                      <button
                        onClick={() => setShowKey((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary transition-colors"
                        aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={testConnection}
                      disabled={testing || !keyValue}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs bg-surface-3 hover:bg-primary-light text-fg-secondary hover:text-primary border border-border rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${testing ? 'animate-spin' : ''}`} />
                      {testing ? 'Đang test...' : 'Test'}
                    </button>
                  </div>
                </Field>
              )
            })}

            {/* Model selector — options change by provider */}
            <Field label="Model">
              {(() => {
                const provider = (settings['ai.provider'] || 'claude') as AIProvider
                const models = MODEL_OPTIONS[provider]
                const defaultModel = models[0].value
                return (
                  <select
                    value={settings['ai.model'] || defaultModel}
                    onChange={(e) => update('ai.model', e.target.value)}
                    className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-border-focus cursor-pointer transition-colors"
                  >
                    {models.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                )
              })()}
            </Field>

            <Toggle
              label="Tự động phân loại khi import"
              desc="Gọi AI để gán tags sau khi import"
              value={settings['ai.auto_tag'] === 'true'}
              onChange={(v) => update('ai.auto_tag', v ? 'true' : 'false')}
            />
            <Toggle
              label="Tự động tóm tắt"
              desc="Tạo tóm tắt AI cho mỗi tài liệu"
              value={settings['ai.auto_summary'] === 'true'}
              onChange={(v) => update('ai.auto_summary', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* ── Thư Mục & File ── */}
        <Section accent="#2563eb" title="Thư Mục & File">
          <div className="space-y-4">
            <Field label="Thư mục thư viện">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings['library.dir'] || ''}
                  onChange={(e) => update('library.dir', e.target.value)}
                  placeholder="Chưa chọn..."
                  className="flex-1 bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors"
                />
                <button
                  onClick={selectDir}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs bg-surface-3 hover:bg-surface-2 text-fg-secondary hover:text-fg-primary border border-border rounded-md transition-colors whitespace-nowrap"
                >
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  Chọn
                </button>
              </div>
            </Field>

            <Field label="URL chia sẻ public (dùng cho Facebook share link)">
              <input
                type="text"
                value={settings['share.base_url'] || ''}
                onChange={(e) => update('share.base_url', e.target.value)}
                placeholder="https://fitnesslibrary.vuhai.app"
                className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors"
              />
              <p className="text-xs text-fg-muted mt-1">Link chia sẻ = {settings['share.base_url'] || 'https://fitnesslibrary.vuhai.app'}/doc/&#123;id&#125;</p>
            </Field>

            {/* AI Reading Features */}
            <div className="border-t border-border/40 pt-3 space-y-2.5">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Tính năng AI khi đọc</p>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm text-fg-primary">Chat với tài liệu</p>
                  <p className="text-xs text-fg-muted">Hỏi AI về nội dung tài liệu đang đọc (phím tắt: C)</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings['enableDocChat'] !== 'false'}
                  onClick={() => update('enableDocChat', settings['enableDocChat'] === 'false' ? 'true' : 'false')}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    settings['enableDocChat'] !== 'false' ? 'bg-success' : 'bg-surface-3 border border-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings['enableDocChat'] !== 'false' ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm text-fg-primary">Giải thích thuật ngữ</p>
                  <p className="text-xs text-fg-muted">Bôi đen 1-5 từ để xem giải thích tức thì</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings['enableTermExplain'] !== 'false'}
                  onClick={() => update('enableTermExplain', settings['enableTermExplain'] === 'false' ? 'true' : 'false')}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    settings['enableTermExplain'] !== 'false' ? 'bg-success' : 'bg-surface-3 border border-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings['enableTermExplain'] !== 'false' ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-sm text-fg-primary">Ưu tiên từ điển offline</p>
                  <p className="text-xs text-fg-muted">Dùng từ điển tích hợp (nhanh, không tốn API) trước khi gọi AI</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings['preferOfflineDict'] !== 'false'}
                  onClick={() => update('preferOfflineDict', settings['preferOfflineDict'] === 'false' ? 'true' : 'false')}
                  className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                    settings['preferOfflineDict'] !== 'false' ? 'bg-success' : 'bg-surface-3 border border-border'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    settings['preferOfflineDict'] !== 'false' ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
              </label>
            </div>

            <Field label="Đường dẫn ffmpeg (tuỳ chọn)">
              <input
                type="text"
                value={settings['ffmpeg.path'] || ''}
                onChange={(e) => update('ffmpeg.path', e.target.value)}
                placeholder="C:\ffmpeg\bin\ffmpeg.exe"
                className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors"
              />
              {dbStats && (
                <p className={`text-xs mt-1 ${dbStats.ffmpeg_available ? 'text-success' : 'text-danger'}`}>
                  FFmpeg: {dbStats.ffmpeg_available ? '✓ Tìm thấy' : '✗ Không tìm thấy'}
                </p>
              )}
            </Field>

            {dbStats && (
              <button
                onClick={() => api.openFileInExplorer(dbStats.db_path as string)}
                className="flex items-center gap-1.5 text-xs text-info hover:text-info/80 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở thư mục dữ liệu
              </button>
            )}
          </div>
        </Section>

        {/* ── Danh Mục ── */}
        <Section accent="#7c3aed" title="Danh Mục">
          <div className="space-y-3">
            {/* Existing categories */}
            <div className="space-y-1.5">
              {categories.filter((c) => !c.parent_id).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 border border-border group hover:border-border-focus/30 transition-colors"
                >
                  {/* Icon + color dot */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${cat.color}18` }}
                  >
                    {cat.icon}
                  </div>
                  {/* Color dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: cat.color }}
                  />
                  {/* Name */}
                  <span className="text-sm text-fg-primary flex-1 font-medium">{cat.name}</span>
                  {/* Count */}
                  <span className="text-xs text-fg-muted bg-surface-3 px-2 py-0.5 rounded-full">
                    {cat.count} tài liệu
                  </span>
                  {/* Delete */}
                  <button
                    onClick={() => deleteCategory(cat)}
                    aria-label={`Xóa danh mục ${cat.name}`}
                    title={cat.count > 0 ? 'Không thể xóa khi còn tài liệu' : 'Xóa danh mục'}
                    className="text-fg-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 p-1 rounded flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-fg-secondary">Thêm danh mục mới</p>

              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                placeholder="Tên danh mục..."
                className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors"
              />

              {/* Emoji picker */}
              <div>
                <p className="text-[11px] text-fg-muted mb-2 font-medium">Chọn Icon</p>
                <div className="flex gap-1.5 flex-wrap">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewCatIcon(e)}
                      className={`w-9 h-9 rounded-md text-base transition-all flex items-center justify-center ${
                        newCatIcon === e
                          ? 'bg-primary-light ring-1 ring-primary/50'
                          : 'bg-surface-3 hover:bg-surface-2 border border-border'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <p className="text-[11px] text-fg-muted mb-2 font-medium">Chọn Màu</p>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCatColor(c)}
                      aria-label={`Màu ${c}`}
                      className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${
                        newCatColor === c ? 'ring-2 ring-offset-2 ring-fg-muted scale-110' : 'hover:scale-105'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview + Add button */}
              <div className="flex items-center gap-3 pt-1">
                {newCatName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-3 border border-border flex-1 min-w-0">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${newCatColor}18` }}>
                      {newCatIcon}
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: newCatColor }} />
                    <span className="text-xs text-fg-primary truncate">{newCatName}</span>
                  </div>
                )}
                <button
                  onClick={addCategory}
                  disabled={addingCat || !newCatName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingCat ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Bảo Mật (web only) ── */}
        {!isWails && (
          <Section accent="#dc2626" title="Bảo Mật">
            <div className="space-y-3">
              <Field label="Mật khẩu mới">
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus pr-9 transition-colors"
                  />
                  <button
                    onClick={() => setShowNewPwd((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary transition-colors"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Xác nhận mật khẩu">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-border-focus transition-colors"
                />
              </Field>
              <button
                onClick={changePassword}
                disabled={changingPwd || !newPassword || !confirmPassword}
                className="flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-danger/80 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {changingPwd ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
              </button>
            </div>
          </Section>
        )}

        {/* ── Lưu Trữ Dữ Liệu ── */}
        <Section accent="#0891b2" title="Lưu Trữ Dữ Liệu">
          {storageInfo ? (
            <div className="space-y-3">
              {/* Storage overview grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Database', icon: <Database className="w-3.5 h-3.5" />, bytes: storageInfo.db_bytes, count: null },
                  { label: 'Thumbnails', icon: <HardDrive className="w-3.5 h-3.5" />, bytes: storageInfo.thumb_bytes, count: storageInfo.thumb_count },
                  { label: 'File gốc', icon: <Folder className="w-3.5 h-3.5" />, bytes: storageInfo.upload_bytes, count: storageInfo.upload_count },
                  { label: 'Backups', icon: <Shield className="w-3.5 h-3.5" />, bytes: storageInfo.backup_bytes, count: storageInfo.backup_count },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-2 rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-fg-secondary text-xs font-medium">
                      {item.icon}
                      {item.label}
                    </div>
                    <p className="text-sm font-bold text-fg-primary">{fmtBytes(item.bytes)}</p>
                    {item.count !== null && (
                      <p className="text-[11px] text-fg-muted">{item.count} file</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Data dir path */}
              <div className="bg-surface-2 rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs font-medium text-fg-secondary">Thư mục dữ liệu</p>
                <p className="text-[11px] text-fg-muted font-mono break-all bg-surface-3 px-2 py-1 rounded">
                  {storageInfo.data_dir}
                </p>
                <p className="text-[11px] text-fg-muted">
                  Schema version: <span className="text-fg-primary font-medium">{storageInfo.schema_version}</span>
                </p>
              </div>

              {/* Backup action */}
              <div className="flex items-center gap-3">
                <button
                  onClick={backupNow}
                  disabled={backingUp}
                  className="flex items-center gap-1.5 px-4 py-2 bg-info/10 hover:bg-info/20 text-info border border-info/30 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  <Shield className={`w-3.5 h-3.5 ${backingUp ? 'animate-pulse' : ''}`} />
                  {backingUp ? 'Đang tạo backup...' : 'Tạo Backup Ngay'}
                </button>
                <p className="text-[11px] text-fg-muted">Giữ tối đa 5 bản backup gần nhất</p>
              </div>

              <p className="text-[11px] text-fg-muted bg-surface-2 border border-border rounded px-3 py-2">
                Dữ liệu được lưu trong thư mục trên. Để giữ nguyên sau khi update/deploy, set biến môi trường <code className="bg-surface-3 px-1 rounded font-mono">FITNESS_LIBRARY_DATA_DIR</code> trỏ đến Volume mount.
              </p>
            </div>
          ) : (
            <div className="text-xs text-fg-muted">Đang tải...</div>
          )}
        </Section>

        {/* ── Debug & Bảo Trì ── */}
        <Section accent="#6b7280" title="Debug & Bảo Trì">
          {dbStats && (
            <div className="bg-surface-2 rounded-lg border border-border p-4 mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-fg-secondary font-medium">
                  <Database className="w-3.5 h-3.5" /> Database
                </span>
                <button
                  onClick={() => api.openFileInExplorer(dbStats.db_path as string)}
                  className="flex items-center gap-1 text-info hover:text-info/80 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Mở
                </button>
              </div>
              <p className="text-fg-muted font-mono break-all text-[10px] bg-surface-3 px-2 py-1 rounded">
                {dbStats.db_path as string}
              </p>
              <div className="flex gap-4 text-fg-muted">
                <span>{dbStats.doc_count as number} tài liệu</span>
                <span>{Math.round((dbStats.db_size_bytes as number) / 1024)} KB</span>
                <span className={dbStats.ffmpeg_available ? 'text-success' : 'text-danger'}>
                  FFmpeg: {dbStats.ffmpeg_available ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={<Database className="w-3.5 h-3.5" />} onClick={rebuildFTS}>
              Rebuild FTS5 Index
            </ActionBtn>
            <ActionBtn icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={clearCache}>
              Xóa thumbnail cache
            </ActionBtn>
            <ActionBtn icon={<Download className="w-3.5 h-3.5" />} onClick={exportJSON}>
              Xuất dữ liệu JSON
            </ActionBtn>
          </div>
          <p className="text-xs text-fg-muted mt-4">Fitness Library v{appVersion} — by Vũ Hải</p>
        </Section>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-md transition-colors"
        >
          {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
        </button>

      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-fg-primary mb-4 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: accent }} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-fg-secondary block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-fg-primary font-medium">{label}</p>
        <p className="text-xs text-fg-muted mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-border'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

function ActionBtn({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-xs bg-surface-3 hover:bg-surface-2 text-fg-secondary hover:text-fg-primary border border-border rounded-md transition-colors"
    >
      {icon}
      {children}
    </button>
  )
}
