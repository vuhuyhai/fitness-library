/**
 * Typed wrappers over the Wails-generated Go bindings.
 * In desktop (Wails) mode: calls window.go.main.App.*
 * In web (browser) mode:   delegates to httpApi (fetch-based).
 *
 * All 24+ importing files can keep `import { api } from '../../lib/wailsApi'`
 * with zero changes — the correct implementation is selected at runtime.
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
import { httpApi } from './httpApi'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const go = () => (window as any).go.main.App

/** True when running inside the Wails desktop WebView. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isWails: boolean = typeof (window as any)?.go?.main?.App !== 'undefined'

const _wailsImpl = {
  // Documents
  getDocuments: (filter: DocumentFilter = {}): Promise<Document[]> =>
    go().GetDocuments(filter),
  getDocument: (id: string): Promise<Document> =>
    go().GetDocument(id),
  createDocument: (input: CreateDocumentInput): Promise<Document> =>
    go().CreateDocument(input),
  updateDocument: (id: string, updates: UpdateDocumentInput): Promise<void> =>
    go().UpdateDocument(id, updates),
  deleteDocument: (id: string): Promise<void> =>
    go().DeleteDocument(id),
  searchDocuments: (query: string): Promise<SearchResult[]> =>
    go().SearchDocuments(query),
  incrementViews: (id: string): Promise<void> =>
    go().IncrementViews(id),
  getDashboardStats: (): Promise<DashboardStats> =>
    go().GetDashboardStats(),
  rebuildFTS: (): Promise<void> =>
    go().RebuildFTS(),

  // Categories
  getCategories: (): Promise<Category[]> =>
    go().GetCategories(),
  createCategory: (name: string, icon: string, color: string, parentID: string): Promise<Category> =>
    go().CreateCategory(name, icon, color, parentID),
  deleteCategory: (id: string): Promise<void> =>
    go().DeleteCategory(id),

  // Queue
  queueFiles: (paths: string[]): Promise<ImportQueueItem[]> =>
    go().QueueFiles(paths),
  startQueue: (): Promise<void> =>
    go().StartQueue(),
  pauseQueue: (): Promise<void> =>
    go().PauseQueue(),
  getQueueStatus: (): Promise<QueueStatus> =>
    go().GetQueueStatus(),
  clearDoneQueue: (): Promise<void> =>
    go().ClearDoneQueue(),
  updateQueueItemCategory: (_id: string, _catId: string): Promise<void> =>
    Promise.resolve(), // desktop: category set via native UI

  // Thumbnails — stubs for desktop (handled natively or via Wails bindings)
  generateThumbnail: (_docId: string): Promise<{ cover_path: string; url: string; source: string }> =>
    Promise.resolve({ cover_path: '', url: '', source: 'svg' }),
  uploadThumbnail: (_docId: string, _file: File): Promise<{ cover_path: string; url: string }> =>
    Promise.resolve({ cover_path: '', url: '' }),
  deleteThumbnail: (_docId: string): Promise<void> =>
    Promise.resolve(),
  batchGenerateThumbnails: (): Promise<{ queued: number }> =>
    Promise.resolve({ queued: 0 }),

  // Settings
  getSettings: (): Promise<Record<string, string>> =>
    go().GetSettings(),
  saveSettings: (settings: Record<string, string>): Promise<void> =>
    go().SaveSettings(settings),
  testAIConnection: (): Promise<void> =>
    go().TestAIConnection(),

  // AI
  runAIPipeline: (docID: string): Promise<void> =>
    go().RunAIPipeline(docID),

  // File system
  selectDirectory: (): Promise<string> =>
    go().SelectDirectory(),
  selectFiles: (): Promise<string[]> =>
    go().SelectFiles(),
  openFileInExplorer: (path: string): Promise<void> =>
    go().OpenFileInExplorer(path),
  getDataDir: (): Promise<string> =>
    go().GetDataDir(),
  getDBStats: (): Promise<Record<string, unknown>> =>
    go().GetDBStats(),
  clearThumbnailCache: (): Promise<void> =>
    go().ClearThumbnailCache(),
  getLocalFileURL: (absPath: string): Promise<string> =>
    go().GetLocalFileURL(absPath),
  getAppVersion: (): Promise<string> =>
    go().GetAppVersion(),

  // Unlock / Lock (Feature 1: Share-to-unlock)
  unlockDocument: (docID: string): Promise<void> =>
    go().UnlockDocument(docID),
  getUnlockedDocuments: (): Promise<string[]> =>
    go().GetUnlockedDocuments(),
  isDocumentUnlocked: (docID: string): Promise<boolean> =>
    go().IsDocumentUnlocked(docID),
  setDocumentLock: (docID: string, isLocked: boolean, previewLines: number): Promise<void> =>
    go().SetDocumentLock(docID, isLocked, previewLines),
  openBrowserURL: (url: string): Promise<void> =>
    go().OpenBrowserURL(url),

  // Reading Progress (Feature 3)
  saveReadingProgress: (progress: ReadingProgressDTO): Promise<void> =>
    go().SaveReadingProgress(progress),
  getReadingProgress: (docID: string): Promise<ReadingProgressDTO> =>
    go().GetReadingProgress(docID),

  // Facebook Caption AI (Feature 4)
  generateFacebookCaption: (docID: string): Promise<CaptionResult> =>
    go().GenerateFacebookCaption(docID),
  logShareEvent: (docID: string, tone: string, visibility: string): Promise<void> =>
    go().LogShareEvent(docID, tone, visibility),
  getRecentShareEvents: (limit: number): Promise<ShareEvent[]> =>
    go().GetRecentShareEvents(limit),

  // Chat with Document AI (Feature 5)
  chatWithDocument: (docID: string, question: string, history: ChatMessage[]): Promise<ChatResponse> =>
    go().ChatWithDocument(docID, question, history),

  // Term Explanation AI (Feature 6)
  explainTerm: (term: string, context: string, catID: string): Promise<TermExplanation> =>
    go().ExplainTerm(term, context, catID),
}

/**
 * Unified `api` export: uses Wails bindings on desktop, HTTP fetch on web.
 * Import this — not `_wailsImpl` — in all components.
 */
export const api = isWails ? _wailsImpl : httpApi

/**
 * Encodes an absolute OS path to a /localfile/ URL (client-side, matches Go logic).
 * Uses RawURLEncoding — URL-safe base64 without padding (no `=`).
 */
export function localFileURL(absPath: string): string {
  if (!absPath) return ''
  // Normalize to forward slashes then base64url-encode without padding
  const slashed = absPath.replace(/\\/g, '/')
  return `/localfile/${btoa(unescape(encodeURIComponent(slashed)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')}`
}
