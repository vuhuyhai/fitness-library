package repository

import (
	"database/sql"
	"time"

	"fitness-library/internal/models"

	"github.com/google/uuid"
)

type CategoryRepo struct {
	db *sql.DB
}

func NewCategoryRepo(db *sql.DB) *CategoryRepo {
	return &CategoryRepo{db: db}
}

func (r *CategoryRepo) GetCategories() ([]models.Category, error) {
	rows, err := r.db.Query(`
		SELECT c.id, c.name, COALESCE(c.icon,''), COALESCE(c.color,''), COALESCE(c.parent_id,''), c.sort_order,
		       (SELECT COUNT(*) FROM documents WHERE cat_id = c.id) as cnt
		FROM categories c
		ORDER BY c.sort_order, c.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Icon, &c.Color, &c.ParentID, &c.SortOrder, &c.Count); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}

	// Build tree
	return buildTree(cats), rows.Err()
}

func buildTree(flat []models.Category) []models.Category {
	byID := map[string]*models.Category{}
	for i := range flat {
		byID[flat[i].ID] = &flat[i]
	}

	var roots []models.Category
	for i := range flat {
		c := &flat[i]
		if c.ParentID == "" {
			roots = append(roots, *c)
		} else if parent, ok := byID[c.ParentID]; ok {
			parent.Children = append(parent.Children, c)
		}
	}
	return roots
}

func (r *CategoryRepo) CreateCategory(name, icon, color, parentID string) (models.Category, error) {
	id := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)
	_ = now

	_, err := r.db.Exec(`INSERT INTO categories (id, name, icon, color, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, 99)`,
		id, name, icon, color, parentID)
	if err != nil {
		return models.Category{}, err
	}
	return models.Category{ID: id, Name: name, Icon: icon, Color: color, ParentID: parentID}, nil
}

func (r *CategoryRepo) DeleteCategory(id string) error {
	// Don't delete built-in categories
	_, err := r.db.Exec("DELETE FROM categories WHERE id = ? AND id NOT LIKE 'cat-%'", id)
	return err
}

// GetDBStats returns SQLite database size info.
func (r *CategoryRepo) GetDBStats(dbPath string) map[string]interface{} {
	stats := map[string]interface{}{}
	var pageCount, pageSize int
	r.db.QueryRow("PRAGMA page_count").Scan(&pageCount)
	r.db.QueryRow("PRAGMA page_size").Scan(&pageSize)
	stats["db_path"] = dbPath
	stats["db_size_bytes"] = pageCount * pageSize
	var docCount int
	r.db.QueryRow("SELECT COUNT(*) FROM documents").Scan(&docCount)
	stats["doc_count"] = docCount
	return stats
}
