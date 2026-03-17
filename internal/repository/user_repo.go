package repository

import (
	"database/sql"
	"encoding/json"
	"time"

	"fitness-library/internal/models"
)

// UserRepo handles user-specific data: unlocks and reading progress.
type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

// ─── Document Unlock ───────────────────────────────────────────────────

// UnlockDocument marks a document as unlocked on this device.
func (r *UserRepo) UnlockDocument(docID string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.Exec(
		"INSERT OR REPLACE INTO user_unlocks (doc_id, unlocked_at) VALUES (?, ?)",
		docID, now,
	)
	return err
}

// GetUnlockedDocuments returns all docIDs that have been unlocked on this device.
func (r *UserRepo) GetUnlockedDocuments() ([]string, error) {
	rows, err := r.db.Query("SELECT doc_id FROM user_unlocks")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		rows.Scan(&id) //nolint:errcheck
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, nil
}

// IsDocumentUnlocked checks whether a specific doc has been unlocked.
func (r *UserRepo) IsDocumentUnlocked(docID string) (bool, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM user_unlocks WHERE doc_id = ?", docID).Scan(&count)
	return count > 0, err
}

// ─── Document Lock Settings (admin) ───────────────────────────────────

// SetDocumentLock sets the lock status and preview line count for a document.
func (r *UserRepo) SetDocumentLock(docID string, isLocked bool, previewLines int) error {
	locked := 0
	if isLocked {
		locked = 1
	}
	if previewLines <= 0 {
		previewLines = 5
	}
	_, err := r.db.Exec(
		"INSERT OR REPLACE INTO document_locks (doc_id, is_locked, preview_lines) VALUES (?, ?, ?)",
		docID, locked, previewLines,
	)
	return err
}

// ─── Reading Progress ─────────────────────────────────────────────────

// SaveReadingProgress upserts the reading progress for a document.
func (r *UserRepo) SaveReadingProgress(p models.ReadingProgressDTO) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if p.LastReadAt == "" {
		p.LastReadAt = now
	}
	_, err := r.db.Exec(
		`INSERT OR REPLACE INTO reading_progress
		 (doc_id, scroll_percent, page_number, total_pages, last_read_at, reading_time_seconds)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		p.DocID, p.ScrollPercent, p.PageNumber, p.TotalPages, p.LastReadAt, p.ReadingTimeSeconds,
	)
	return err
}

// GetReadingProgress returns the stored progress for a document.
// Returns a zero-value DTO (not an error) when no record exists.
func (r *UserRepo) GetReadingProgress(docID string) (models.ReadingProgressDTO, error) {
	var p models.ReadingProgressDTO
	p.DocID = docID
	err := r.db.QueryRow(
		`SELECT scroll_percent, page_number, total_pages, COALESCE(last_read_at,''), reading_time_seconds
		 FROM reading_progress WHERE doc_id = ?`,
		docID,
	).Scan(&p.ScrollPercent, &p.PageNumber, &p.TotalPages, &p.LastReadAt, &p.ReadingTimeSeconds)
	if err == sql.ErrNoRows {
		return p, nil
	}
	return p, err
}

// ─── Share Events (analytics) ─────────────────────────────────────────

// SaveShareEvent records a Facebook share event.
// visibility: "public" when user confirmed public post, "unknown" otherwise.
func (r *UserRepo) SaveShareEvent(docID, docTitle, tone, visibility string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.Exec(
		"INSERT INTO share_events (doc_id, doc_title, tone, visibility, created_at) VALUES (?, ?, ?, ?, ?)",
		docID, docTitle, tone, visibility, now,
	)
	return err
}

// GetRecentShareEvents returns the most recent share events (up to limit).
func (r *UserRepo) GetRecentShareEvents(limit int) ([]models.ShareEvent, error) {
	rows, err := r.db.Query(
		`SELECT id, doc_id, doc_title, tone, created_at
		 FROM share_events ORDER BY created_at DESC LIMIT ?`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var events []models.ShareEvent
	for rows.Next() {
		var e models.ShareEvent
		rows.Scan(&e.ID, &e.DocID, &e.DocTitle, &e.Tone, &e.CreatedAt) //nolint:errcheck
		events = append(events, e)
	}
	if events == nil {
		events = []models.ShareEvent{}
	}
	return events, nil
}

// ─── Term Cache ───────────────────────────────────────────────────────

// GetTermCache looks up a cached term explanation. Returns (nil, false) on miss.
func (r *UserRepo) GetTermCache(term string) (*models.TermExplanation, bool) {
	var simple, detail, example, relatedJSON string
	var isOffline int
	err := r.db.QueryRow(
		`SELECT simple, detail, example, related, is_offline
		 FROM term_cache WHERE term = ?`, term,
	).Scan(&simple, &detail, &example, &relatedJSON, &isOffline)
	if err != nil {
		return nil, false
	}
	var related []string
	json.Unmarshal([]byte(relatedJSON), &related) //nolint:errcheck
	return &models.TermExplanation{
		Term:         term,
		Simple:       simple,
		Detail:       detail,
		Example:      example,
		RelatedTerms: related,
		IsKnown:      true,
		IsOffline:    isOffline == 1,
	}, true
}

// SaveTermCache inserts or updates a term explanation in the cache.
func (r *UserRepo) SaveTermCache(exp *models.TermExplanation, catID string) error {
	relatedJSON, err := json.Marshal(exp.RelatedTerms)
	if err != nil {
		relatedJSON = []byte("[]")
	}
	offline := 0
	if exp.IsOffline {
		offline = 1
	}
	_, err = r.db.Exec(
		`INSERT OR REPLACE INTO term_cache (term, cat_id, simple, detail, example, related, is_offline)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		exp.Term, catID, exp.Simple, exp.Detail, exp.Example, string(relatedJSON), offline,
	)
	return err
}
