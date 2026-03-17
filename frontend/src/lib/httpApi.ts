/**
 * Fetch-based API adapter for web mode.
 * Mirrors the exact same interface as wailsApi so all components work unchanged.
 */
import type {
  Document,
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilter,
  SearchResult,
  Category,
  ImportQueueItem,
  QueueStatus,
  DashboardStats,
  ReadingProgressDTO,
  CaptionResult,
  ShareEvent,
  ChatMessage,
  ChatResponse,
  TermExplanation,
} from '../types'
import { getToken, clearToken } from './auth'

// In production the API is on the same origin. Set VITE_API_BASE for dev proxy.
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function url(path: string) {
  return BASE + path
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    clearToken()
    window.location.reload()
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(url(path), { headers: authHeaders() })
  if (!res.ok) {
    handleUnauthorized(res)
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(url(path), {
    method:  'POST',
    headers: authHeaders(),
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    handleUnauthorized(res)
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(url(path), {
    method:  'PUT',
    headers: authHeaders(),
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    handleUnauthorized(res)
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(url(path), { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    handleUnauthorized(res)
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

// ─── Filter → query string ────────────────────────────────────────────────

function filterToQS(filter: DocumentFilter): string {
  const p = new URLSearchParams()
  if (filter.cat_id)        p.set('cat_id',  filter.cat_id)
  if (filter.sort_by)       p.set('sort_by', filter.sort_by)
  if (filter.limit != null) p.set('limit',   String(filter.limit))
  if (filter.offset)        p.set('offset',  String(filter.offset))
  if (filter.is_saved)      p.set('is_saved','true')
  return p.toString() ? '?' + p.toString() : ''
}

// ─── Upload helper (multipart) ────────────────────────────────────────────

export async function uploadFiles(files: File[]): Promise<ImportQueueItem[]> {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  const res = await fetch(url('/api/admin/queue/upload'), {
    method:  'POST',
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    body:    form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}

// ─── Login ────────────────────────────────────────────────────────────────

export async function login(password: string): Promise<string> {
  const data = await post<{ token: string }>('/api/auth/login', { password })
  return data.token
}

// ─── Public API (matches wailsApi `api` object exactly) ──────────────────

export const httpApi = {
  // Documents
  getDocuments: (filter: DocumentFilter = {}): Promise<Document[]> =>
    get(`/api/documents${filterToQS(filter)}`),
  getDocument: (id: string): Promise<Document> =>
    get(`/api/documents/${id}`),
  createDocument: (input: CreateDocumentInput): Promise<Document> =>
    post('/api/admin/documents', input),
  updateDocument: (id: string, updates: UpdateDocumentInput): Promise<void> =>
    put(`/api/admin/documents/${id}`, updates),
  deleteDocument: (id: string): Promise<void> =>
    del(`/api/admin/documents/${id}`),
  searchDocuments: (query: string): Promise<SearchResult[]> =>
    get(`/api/documents/search?q=${encodeURIComponent(query)}`),
  incrementViews: (id: string): Promise<void> =>
    post(`/api/documents/${id}/views`),
  getDashboardStats: (): Promise<DashboardStats> =>
    get('/api/stats'),
  rebuildFTS: (): Promise<void> =>
    post('/api/admin/fts/rebuild'),

  // Categories
  getCategories: (): Promise<Category[]> =>
    get('/api/categories'),
  createCategory: (name: string, icon: string, color: string, parentID: string): Promise<Category> =>
    post('/api/admin/categories', { name, icon, color, parent_id: parentID }),
  deleteCategory: (id: string): Promise<void> =>
    del(`/api/admin/categories/${id}`),

  // Queue
  queueFiles: (_paths: string[]): Promise<ImportQueueItem[]> => {
    // In web mode file queuing happens via uploadFiles() + drag-drop in ImportPage.
    // This stub is here only so TypeScript is satisfied.
    return Promise.resolve([])
  },
  startQueue: (): Promise<void> =>
    post('/api/admin/queue/start'),
  pauseQueue: (): Promise<void> =>
    post('/api/admin/queue/pause'),
  getQueueStatus: (): Promise<QueueStatus> =>
    get('/api/admin/queue'),
  clearDoneQueue: (): Promise<void> =>
    del('/api/admin/queue/done'),
  updateQueueItemCategory: (id: string, catId: string): Promise<void> =>
    put(`/api/admin/queue/${id}/category`, { cat_id: catId }),

  // Settings
  getSettings: (): Promise<Record<string, string>> =>
    get('/api/admin/settings'),
  saveSettings: (settings: Record<string, string>): Promise<void> =>
    put('/api/admin/settings', settings),
  testAIConnection: (): Promise<void> =>
    post('/api/admin/settings/test-ai'),

  // AI
  runAIPipeline: (docID: string): Promise<void> =>
    post(`/api/admin/documents/${docID}/ai`),

  // File system (web stubs — not applicable in browser)
  selectDirectory: (): Promise<string> => Promise.resolve(''),
  selectFiles:     (): Promise<string[]> => Promise.resolve([]),
  openFileInExplorer: (_path: string): Promise<void> => Promise.resolve(),
  getDataDir:      (): Promise<string> => Promise.resolve(''),
  getDBStats:      (): Promise<Record<string, unknown>> =>
    get('/api/admin/stats/db'),
  clearThumbnailCache: (): Promise<void> => Promise.resolve(),
  getLocalFileURL: (absPath: string): Promise<string> => {
    // Encode identical to the Go server's LocalFileURL
    const slashed  = absPath.replace(/\\/g, '/')
    const encoded  = btoa(unescape(encodeURIComponent(slashed)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return Promise.resolve(`/localfile/${encoded}`)
  },
  getAppVersion: (): Promise<string> => Promise.resolve('web'),

  // Unlock / Lock
  unlockDocument:      (docID: string): Promise<void> =>
    post(`/api/unlock/${docID}`),
  getUnlockedDocuments: (): Promise<string[]> =>
    get('/api/unlocked'),
  isDocumentUnlocked:  (docID: string): Promise<boolean> =>
    get<{ unlocked: boolean }>(`/api/unlock/${docID}/status`).then(r => r.unlocked),
  setDocumentLock: (docID: string, isLocked: boolean, previewLines: number): Promise<void> =>
    post(`/api/admin/documents/${docID}/lock`, { is_locked: isLocked, preview_lines: previewLines }),
  openBrowserURL: (url: string): Promise<void> => {
    window.open(url, '_blank', 'noopener,noreferrer')
    return Promise.resolve()
  },

  // Reading Progress
  saveReadingProgress: (progress: ReadingProgressDTO): Promise<void> =>
    put(`/api/progress/${progress.doc_id}`, progress),
  getReadingProgress: (docID: string): Promise<ReadingProgressDTO> =>
    get(`/api/progress/${docID}`),

  // Facebook Caption AI
  generateFacebookCaption: (docID: string): Promise<CaptionResult> =>
    post(`/api/admin/documents/${docID}/caption`),
  logShareEvent: (docID: string, tone: string, visibility: string): Promise<void> =>
    post('/api/share-events', { doc_id: docID, tone, visibility }),
  getRecentShareEvents: (limit: number): Promise<ShareEvent[]> =>
    get(`/api/admin/share-events?limit=${limit}`),

  // Chat with Document AI
  chatWithDocument: (docID: string, question: string, history: ChatMessage[]): Promise<ChatResponse> =>
    post(`/api/chat/${docID}`, { question, history }),

  // Term Explanation AI
  explainTerm: (term: string, context: string, catID: string): Promise<TermExplanation> =>
    post('/api/terms/explain', { term, context, cat_id: catID }),
}
