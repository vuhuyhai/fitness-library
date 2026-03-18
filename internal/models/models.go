package models

// Document represents a fitness library document.
type Document struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Type        string   `json:"type"` // article|pdf|workout|video|note
	CatID       string   `json:"cat_id"`
	SubCatID    string   `json:"sub_cat_id"`
	FilePath    string   `json:"file_path"`
	Content     string   `json:"content"`
	Summary     string   `json:"summary"`
	CoverPath       string   `json:"cover_path"`
	ThumbnailSource string   `json:"thumbnail_source"`
	Tags            []string `json:"tags"`
	Views       int      `json:"views"`
	ReadTime    int      `json:"read_time"`
	IsSaved     bool     `json:"is_saved"`
	Author      string   `json:"author"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
	IsLocked    bool     `json:"is_locked"`
	PreviewLines int     `json:"preview_lines"`

	// Joined data (optional)
	WorkoutPlan *WorkoutPlan `json:"workout_plan,omitempty"`
}

// CreateDocumentInput is the input for creating a new document.
type CreateDocumentInput struct {
	Title    string   `json:"title"`
	Type     string   `json:"type"`
	CatID    string   `json:"cat_id"`
	SubCatID string   `json:"sub_cat_id"`
	FilePath string   `json:"file_path"`
	Content  string   `json:"content"`
	Tags     []string `json:"tags"`
	Author   string   `json:"author"`
	ReadTime int      `json:"read_time"`
}

// UpdateDocumentInput is the input for updating a document.
type UpdateDocumentInput struct {
	Title        *string  `json:"title,omitempty"`
	Content      *string  `json:"content,omitempty"`
	Summary      *string  `json:"summary,omitempty"`
	CoverPath    *string  `json:"cover_path,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	SubCatID     *string  `json:"sub_cat_id,omitempty"`
	IsSaved      *bool    `json:"is_saved,omitempty"`
	ReadTime     *int     `json:"read_time,omitempty"`
}

// DocumentFilter is used to filter documents in list queries.
type DocumentFilter struct {
	CatID    string `json:"cat_id"`
	SubCatID string `json:"sub_cat_id"`
	Type     string `json:"type"`
	Tag      string `json:"tag"`
	IsSaved  *bool  `json:"is_saved"`
	SortBy   string `json:"sort_by"` // date|title|views
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
}

// SearchResult is a document with a highlighted snippet.
type SearchResult struct {
	Document
	Snippet string `json:"snippet"`
}

// Category represents a document category.
type Category struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Icon      string      `json:"icon"`
	Color     string      `json:"color"`
	ParentID  string      `json:"parent_id"`
	SortOrder int         `json:"sort_order"`
	Count     int         `json:"count"`
	Children  []*Category `json:"children,omitempty"`
}

// WorkoutPlan represents a structured workout plan.
type WorkoutPlan struct {
	ID               string      `json:"id"`
	DocID            string      `json:"doc_id"`
	Goal             string      `json:"goal"`
	Level            string      `json:"level"`
	DurationWeeks    int         `json:"duration_weeks"`
	SessionsPerWeek  int         `json:"sessions_per_week"`
	Exercises        interface{} `json:"exercises"` // JSON array
}

// ImportQueueItem represents an item in the import queue.
type ImportQueueItem struct {
	ID        string `json:"id"`
	FilePath  string `json:"file_path"`
	FileName  string `json:"file_name"`
	FileType  string `json:"file_type"`
	CatID     string `json:"cat_id"`
	Status    string `json:"status"` // pending|processing|done|error
	ErrorMsg  string `json:"error_msg"`
	Progress  int    `json:"progress"`
	DocID     string `json:"doc_id,omitempty"`
	CreatedAt string `json:"created_at"`
}

// QueueStatus is the overall queue status.
type QueueStatus struct {
	Items   []ImportQueueItem `json:"items"`
	Running bool              `json:"running"`
	Paused  bool              `json:"paused"`
	Total   int               `json:"total"`
	Done    int               `json:"done"`
	Pending int               `json:"pending"`
}

// QueueProgressPayload is emitted as a Wails event.
type QueueProgressPayload struct {
	ID       string `json:"id"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
	DocID    string `json:"doc_id,omitempty"`
	Error    string `json:"error,omitempty"`
}

// DashboardStats holds stats for the dashboard page.
type DashboardStats struct {
	TotalDocuments int            `json:"total_documents"`
	ByType         map[string]int `json:"by_type"`
	TotalViews     int            `json:"total_views"`
	RecentReads    []Document     `json:"recent_reads"`
	TrendingTags   []TagCount     `json:"trending_tags"`
}

// TagCount is a tag with its frequency count.
type TagCount struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

// AIResult is the parsed response from Claude API.
type AIResult struct {
	Tags     []string `json:"tags"`
	Summary  string   `json:"summary"`
	ReadTime int      `json:"read_time"`
	Level    string   `json:"level"`
}

// ReadingProgressDTO holds a user's reading progress for a document.
type ReadingProgressDTO struct {
	DocID              string  `json:"doc_id"`
	ScrollPercent      float64 `json:"scroll_percent"`
	PageNumber         int     `json:"page_number"`
	TotalPages         int     `json:"total_pages"`
	LastReadAt         string  `json:"last_read_at"`
	ReadingTimeSeconds int     `json:"reading_time_seconds"`
}

// CaptionVariant is one tone variant of a Facebook caption.
type CaptionVariant struct {
	Tone    string `json:"tone"`
	Label   string `json:"label"`
	Emoji   string `json:"emoji"`
	Content string `json:"content"`
}

// CaptionResult is the response from GenerateFacebookCaption.
type CaptionResult struct {
	Captions []CaptionVariant `json:"captions"`
	DocTitle string           `json:"doc_title"`
	Hashtags []string         `json:"hashtags"`
}

// ShareEvent records a Facebook share action for analytics.
type ShareEvent struct {
	ID        int    `json:"id"`
	DocID     string `json:"doc_id"`
	DocTitle  string `json:"doc_title"`
	Tone      string `json:"tone"`
	CreatedAt string `json:"created_at"`
}

// ChatMessage is a single turn in a document chat conversation.
type ChatMessage struct {
	Role    string `json:"role"`    // "user" | "assistant"
	Content string `json:"content"`
}

// ChatResponse is returned by ChatWithDocument.
type ChatResponse struct {
	Answer    string   `json:"answer"`
	Citations []string `json:"citations"`
	IsOnTopic bool     `json:"isOnTopic"`
}

// DeleteOptions controls what is cleaned up when a document is deleted.
type DeleteOptions struct {
	DeleteFile      bool `json:"deleteFile"`
	DeleteThumbnail bool `json:"deleteThumbnail"`
	DeleteRelated   bool `json:"deleteRelated"`
}

// DeletePreview holds impact info shown before confirming deletion.
type DeletePreview struct {
	DocID        string `json:"docId"`
	Title        string `json:"title"`
	FileSize     int64  `json:"fileSize"`
	FilePath     string `json:"filePath"`
	HasThumbnail bool   `json:"hasThumbnail"`
	ReadCount    int    `json:"readCount"`
	ShareCount   int    `json:"shareCount"`
	UnlockCount  int    `json:"unlockCount"`
	IsLocked     bool   `json:"isLocked"`
}

// DeleteResult is returned after initiating a soft-delete.
type DeleteResult struct {
	Success      bool   `json:"success"`
	FreedBytes   int64  `json:"freedBytes"`
	DeletedItems int    `json:"deletedItems"`
	UndoToken    string `json:"undoToken"`
	Message      string `json:"message"`
}

// DeleteLog is one entry in the delete audit trail.
type DeleteLog struct {
	ID         string `json:"id"`
	DocID      string `json:"docId"`
	DocTitle   string `json:"docTitle"`
	DeletedBy  string `json:"deletedBy"`
	FreedBytes int64  `json:"freedBytes"`
	WasUndone  bool   `json:"wasUndone"`
	DeletedAt  string `json:"deletedAt"`
}

// TermExplanation is the AI explanation of a fitness term.
type TermExplanation struct {
	Term         string   `json:"term"`
	Simple       string   `json:"simple"`
	Detail       string   `json:"detail"`
	Example      string   `json:"example"`
	RelatedTerms []string `json:"relatedTerms"`
	IsKnown      bool     `json:"isKnown"`
	IsOffline    bool     `json:"isOffline"` // true = from pre-built dictionary
}
