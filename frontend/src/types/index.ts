export interface Document {
  id: string
  title: string
  type: 'article' | 'pdf' | 'workout' | 'video' | 'note'
  cat_id: string
  sub_cat_id: string
  file_path: string
  content: string
  summary: string
  cover_path: string
  tags: string[]
  views: number
  read_time: number
  is_saved: boolean
  author: string
  created_at: string
  updated_at: string
  /** Admin-controlled: true = locked (share required), false = free */
  is_locked: boolean
  /** Number of preview lines shown while locked */
  preview_lines: number
  workout_plan?: WorkoutPlan
}

export interface CreateDocumentInput {
  title: string
  type: string
  cat_id: string
  sub_cat_id?: string
  file_path?: string
  content?: string
  tags?: string[]
  author?: string
  read_time?: number
}

export interface UpdateDocumentInput {
  title?: string
  content?: string
  summary?: string
  cover_path?: string
  tags?: string[]
  sub_cat_id?: string
  is_saved?: boolean
  read_time?: number
}

export interface DocumentFilter {
  cat_id?: string
  sub_cat_id?: string
  type?: string
  tag?: string
  is_saved?: boolean
  sort_by?: 'date' | 'title' | 'views'
  limit?: number
  offset?: number
}

export interface SearchResult extends Document {
  snippet: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  parent_id: string
  sort_order: number
  count: number
  children?: Category[]
}

export interface WorkoutPlan {
  id: string
  doc_id: string
  goal: string
  level: string
  duration_weeks: number
  sessions_per_week: number
  exercises: Exercise[]
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  weight?: string
  rest?: string
  notes?: string
}

export interface ImportQueueItem {
  id: string
  file_path: string
  file_name: string
  file_type: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error_msg: string
  progress: number
  doc_id?: string
  created_at: string
}

export interface QueueStatus {
  items: ImportQueueItem[]
  running: boolean
  paused: boolean
  total: number
  done: number
  pending: number
}

export interface DashboardStats {
  total_documents: number
  by_type: Record<string, number>
  total_views: number
  recent_reads: Document[]
  trending_tags: TagCount[]
}

export interface TagCount {
  tag: string
  count: number
}

export interface QueueProgressPayload {
  id: string
  status: string
  progress: number
  doc_id?: string
  error?: string
}

/** Per-document reading progress (stored in localStorage + SQLite) */
export interface ReadingProgress {
  docId: string
  scrollPercent: number      // 0–100
  pageNumber: number         // PDF: current page (1-based)
  totalPages: number         // PDF: total pages
  lastReadAt: string         // ISO timestamp
  readingTimeSeconds: number // total active reading seconds
}

/** DTO for Wails IPC (snake_case matches Go struct) */
export interface ReadingProgressDTO {
  doc_id: string
  scroll_percent: number
  page_number: number
  total_pages: number
  last_read_at: string
  reading_time_seconds: number
}

/** One tone variant of an AI-generated Facebook caption */
export interface CaptionVariant {
  tone: string
  label: string
  emoji: string
  content: string
}

/** Response from GenerateFacebookCaption */
export interface CaptionResult {
  captions: CaptionVariant[]
  doc_title: string
  hashtags: string[]
}

/** Analytics record for a Facebook share event */
export interface ShareEvent {
  id: number
  doc_id: string
  doc_title: string
  tone: string
  created_at: string
}

/** A single turn in a document chat conversation */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Response from ChatWithDocument */
export interface ChatResponse {
  answer: string
  citations: string[]
  isOnTopic: boolean
}

/** AI explanation of a fitness term */
export interface TermExplanation {
  term: string
  simple: string
  detail: string
  example: string
  relatedTerms: string[]
  isKnown: boolean
  isOffline: boolean
}
