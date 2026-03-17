package repository

import (
	"database/sql"
	"path/filepath"
	"strings"
	"time"

	"fitness-library/internal/models"

	"github.com/google/uuid"
)

type QueueRepo struct {
	db *sql.DB
}

func NewQueueRepo(db *sql.DB) *QueueRepo {
	return &QueueRepo{db: db}
}

func (r *QueueRepo) AddFiles(paths []string) ([]models.ImportQueueItem, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	var items []models.ImportQueueItem
	for _, p := range paths {
		id := uuid.New().String()
		_, err := r.db.Exec("INSERT INTO import_queue (id, file_path, status, created_at) VALUES (?, ?, 'pending', ?)", id, p, now)
		if err != nil {
			return nil, err
		}
		items = append(items, models.ImportQueueItem{
			ID:        id,
			FilePath:  p,
			FileName:  filepath.Base(p),
			FileType:  inferType(p),
			Status:    "pending",
			CreatedAt: now,
		})
	}
	return items, nil
}

func (r *QueueRepo) GetPendingItems() ([]models.ImportQueueItem, error) {
	rows, err := r.db.Query("SELECT id, file_path, COALESCE(cat_id,''), status, COALESCE(error_msg,''), created_at FROM import_queue WHERE status IN ('pending','processing') ORDER BY created_at")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.ImportQueueItem
	for rows.Next() {
		var it models.ImportQueueItem
		rows.Scan(&it.ID, &it.FilePath, &it.CatID, &it.Status, &it.ErrorMsg, &it.CreatedAt)
		it.FileName = filepath.Base(it.FilePath)
		it.FileType = inferType(it.FilePath)
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *QueueRepo) GetAllItems() ([]models.ImportQueueItem, error) {
	rows, err := r.db.Query("SELECT id, file_path, COALESCE(cat_id,''), status, COALESCE(error_msg,''), created_at FROM import_queue ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.ImportQueueItem
	for rows.Next() {
		var it models.ImportQueueItem
		rows.Scan(&it.ID, &it.FilePath, &it.CatID, &it.Status, &it.ErrorMsg, &it.CreatedAt)
		it.FileName = filepath.Base(it.FilePath)
		it.FileType = inferType(it.FilePath)
		items = append(items, it)
	}
	if items == nil {
		items = []models.ImportQueueItem{}
	}
	return items, rows.Err()
}

func (r *QueueRepo) UpdateCatID(id, catID string) error {
	_, err := r.db.Exec("UPDATE import_queue SET cat_id=? WHERE id=?", catID, id)
	return err
}

func (r *QueueRepo) UpdateStatus(id, status, errMsg string) error {
	_, err := r.db.Exec("UPDATE import_queue SET status=?, error_msg=? WHERE id=?", status, errMsg, id)
	return err
}

func (r *QueueRepo) ClearDone() error {
	_, err := r.db.Exec("DELETE FROM import_queue WHERE status IN ('done','error')")
	return err
}

func inferType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".pdf":
		return "pdf"
	case ".mp4", ".mkv", ".avi", ".mov":
		return "video"
	case ".md", ".markdown":
		return "article"
	case ".html", ".htm":
		return "article"
	case ".docx", ".doc":
		return "article"
	case ".txt":
		return "note"
	default:
		return "note"
	}
}
