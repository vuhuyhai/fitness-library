/**
 * Typed Wails bindings split by role.
 * sharedAPI — cả 2 shell đều dùng
 * adminAPI  — chỉ Admin shell dùng
 */

import type {
  Document, CreateDocumentInput, UpdateDocumentInput,
  DocumentFilter, SearchResult, Category,
  ImportQueueItem, QueueStatus, DashboardStats,
} from '../../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const go = () => (window as any).go.main.App

// ── Shared ──────────────────────────────────────────────────
export const sharedAPI = {
  getDocuments:     (filter: DocumentFilter = {}): Promise<Document[]>  => go().GetDocuments(filter),
  getDocument:      (id: string): Promise<Document>                      => go().GetDocument(id),
  searchDocuments:  (query: string): Promise<SearchResult[]>             => go().SearchDocuments(query),
  getCategories:    (): Promise<Category[]>                              => go().GetCategories(),
  incrementViews:   (id: string): Promise<void>                          => go().IncrementViews(id),
  getDashboardStats:(): Promise<DashboardStats>                          => go().GetDashboardStats(),
  getAppVersion:    (): Promise<string>                                   => go().GetAppVersion(),
  // User can bookmark too — is_saved is a shared concept
  updateDocument:   (id: string, updates: UpdateDocumentInput): Promise<void> => go().UpdateDocument(id, updates),
}

// ── Admin only ───────────────────────────────────────────────
export const adminAPI = {
  createDocument:      (input: CreateDocumentInput): Promise<Document>        => go().CreateDocument(input),
  deleteDocument:      (id: string): Promise<void>                            => go().DeleteDocument(id),
  queueFiles:          (paths: string[]): Promise<ImportQueueItem[]>          => go().QueueFiles(paths),
  startQueue:          (): Promise<void>                                       => go().StartQueue(),
  pauseQueue:          (): Promise<void>                                       => go().PauseQueue(),
  getQueueStatus:      (): Promise<QueueStatus>                               => go().GetQueueStatus(),
  clearDoneQueue:      (): Promise<void>                                       => go().ClearDoneQueue(),
  getSettings:         (): Promise<Record<string, string>>                    => go().GetSettings(),
  saveSettings:        (s: Record<string, string>): Promise<void>             => go().SaveSettings(s),
  testAIConnection:    (): Promise<void>                                       => go().TestAIConnection(),
  runAIPipeline:       (docID: string): Promise<void>                         => go().RunAIPipeline(docID),
  rebuildFTS:          (): Promise<void>                                       => go().RebuildFTS(),
  createCategory:      (name: string, icon: string, color: string, parentID: string): Promise<Category> => go().CreateCategory(name, icon, color, parentID),
  deleteCategory:      (id: string): Promise<void>                            => go().DeleteCategory(id),
  selectDirectory:     (): Promise<string>                                    => go().SelectDirectory(),
  selectFiles:         (): Promise<string[]>                                  => go().SelectFiles(),
  openFileInExplorer:  (path: string): Promise<void>                          => go().OpenFileInExplorer(path),
  getDataDir:          (): Promise<string>                                    => go().GetDataDir(),
  getDBStats:          (): Promise<Record<string, unknown>>                   => go().GetDBStats(),
  clearThumbnailCache: (): Promise<void>                                       => go().ClearThumbnailCache(),
}
