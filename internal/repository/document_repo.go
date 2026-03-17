package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"fitness-library/internal/models"

	"github.com/google/uuid"
)

type DocumentRepo struct {
	db *sql.DB
}

func NewDocumentRepo(db *sql.DB) *DocumentRepo {
	return &DocumentRepo{db: db}
}

// selectDocCols is the shared SELECT column list for documents + document_locks join.
// Always alias the documents table as "d" and document_locks as "dl".
const selectDocCols = `d.id, d.title, d.type, d.cat_id,
  COALESCE(d.sub_cat_id,''), COALESCE(d.file_path,''), COALESCE(d.content,''),
  COALESCE(d.summary,''), COALESCE(d.cover_path,''), COALESCE(d.thumbnail_source,'svg'),
  d.tags, d.views, d.read_time, d.is_saved, d.author, d.created_at, d.updated_at,
  COALESCE(dl.is_locked,1), COALESCE(dl.preview_lines,5)`

// scanDocument scans a row into a Document (18 columns: 16 doc + 2 lock).
func scanDocument(rows interface {
	Scan(...any) error
}, d *models.Document) error {
	var tagsJSON string
	var isSaved, isLocked, previewLines int
	if err := rows.Scan(
		&d.ID, &d.Title, &d.Type, &d.CatID, &d.SubCatID,
		&d.FilePath, &d.Content, &d.Summary, &d.CoverPath, &d.ThumbnailSource,
		&tagsJSON, &d.Views, &d.ReadTime, &isSaved,
		&d.Author, &d.CreatedAt, &d.UpdatedAt,
		&isLocked, &previewLines,
	); err != nil {
		return err
	}
	json.Unmarshal([]byte(tagsJSON), &d.Tags) //nolint:errcheck
	d.IsSaved = isSaved == 1
	d.IsLocked = isLocked == 1
	d.PreviewLines = previewLines
	if d.PreviewLines == 0 {
		d.PreviewLines = 5
	}
	if d.Tags == nil {
		d.Tags = []string{}
	}
	return nil
}

func (r *DocumentRepo) GetDocuments(filter models.DocumentFilter) ([]models.Document, error) {
	args := []interface{}{}
	conds := []string{}

	if filter.CatID != "" {
		conds = append(conds, "d.cat_id = ?")
		args = append(args, filter.CatID)
	}
	if filter.SubCatID != "" {
		conds = append(conds, "d.sub_cat_id = ?")
		args = append(args, filter.SubCatID)
	}
	if filter.Type != "" {
		conds = append(conds, "d.type = ?")
		args = append(args, filter.Type)
	}
	if filter.IsSaved != nil {
		v := 0
		if *filter.IsSaved {
			v = 1
		}
		conds = append(conds, "d.is_saved = ?")
		args = append(args, v)
	}
	if filter.Tag != "" {
		conds = append(conds, "d.tags LIKE ?")
		args = append(args, "%"+filter.Tag+"%")
	}

	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	orderBy := "ORDER BY d.created_at DESC"
	switch filter.SortBy {
	case "title":
		orderBy = "ORDER BY d.title ASC"
	case "views":
		orderBy = "ORDER BY d.views DESC"
	}

	limit := 50
	if filter.Limit > 0 {
		limit = filter.Limit
	}
	args = append(args, limit, filter.Offset)

	query := fmt.Sprintf(
		`SELECT %s FROM documents d LEFT JOIN document_locks dl ON dl.doc_id = d.id %s %s LIMIT ? OFFSET ?`,
		selectDocCols, where, orderBy,
	)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var d models.Document
		if err := scanDocument(rows, &d); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	if docs == nil {
		docs = []models.Document{}
	}
	return docs, rows.Err()
}

func (r *DocumentRepo) GetDocument(id string) (models.Document, error) {
	var d models.Document
	row := r.db.QueryRow(
		fmt.Sprintf(`SELECT %s FROM documents d LEFT JOIN document_locks dl ON dl.doc_id = d.id WHERE d.id = ?`, selectDocCols),
		id,
	)
	if err := scanDocument(row, &d); err != nil {
		return d, err
	}
	return d, nil
}

func (r *DocumentRepo) CreateDocument(input models.CreateDocumentInput) (models.Document, error) {
	id := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)

	author := input.Author
	if author == "" {
		author = "Vũ Hải"
	}
	tags := input.Tags
	if tags == nil {
		tags = []string{}
	}
	tagsJSON, _ := json.Marshal(tags)

	_, err := r.db.Exec(
		`INSERT INTO documents (id, title, type, cat_id, sub_cat_id, file_path, content, tags, read_time, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, input.Title, input.Type, input.CatID, input.SubCatID, input.FilePath, input.Content, string(tagsJSON), input.ReadTime, author, now, now,
	)
	if err != nil {
		return models.Document{}, err
	}
	return r.GetDocument(id)
}

func (r *DocumentRepo) UpdateDocument(id string, u models.UpdateDocumentInput) error {
	sets := []string{"updated_at = ?"}
	args := []interface{}{time.Now().UTC().Format(time.RFC3339)}

	if u.Title != nil {
		sets = append(sets, "title = ?"); args = append(args, *u.Title)
	}
	if u.Content != nil {
		sets = append(sets, "content = ?"); args = append(args, *u.Content)
	}
	if u.Summary != nil {
		sets = append(sets, "summary = ?"); args = append(args, *u.Summary)
	}
	if u.CoverPath != nil {
		sets = append(sets, "cover_path = ?"); args = append(args, *u.CoverPath)
	}
	if u.Tags != nil {
		tagsJSON, _ := json.Marshal(u.Tags)
		sets = append(sets, "tags = ?"); args = append(args, string(tagsJSON))
	}
	if u.SubCatID != nil {
		sets = append(sets, "sub_cat_id = ?"); args = append(args, *u.SubCatID)
	}
	if u.IsSaved != nil {
		v := 0
		if *u.IsSaved {
			v = 1
		}
		sets = append(sets, "is_saved = ?")
		args = append(args, v)
	}
	if u.ReadTime != nil {
		sets = append(sets, "read_time = ?"); args = append(args, *u.ReadTime)
	}

	args = append(args, id)
	_, err := r.db.Exec(fmt.Sprintf("UPDATE documents SET %s WHERE id = ?", strings.Join(sets, ", ")), args...)
	return err
}

func (r *DocumentRepo) UpdateAIFields(id string, tags []string, summary string, readTime int) error {
	tagsJSON, _ := json.Marshal(tags)
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.Exec(
		"UPDATE documents SET tags=?, summary=?, read_time=?, updated_at=? WHERE id=?",
		string(tagsJSON), summary, readTime, now, id,
	)
	return err
}

func (r *DocumentRepo) DeleteDocument(id string) error {
	_, err := r.db.Exec("DELETE FROM documents WHERE id = ?", id)
	return err
}

func (r *DocumentRepo) IncrementViews(id string) error {
	_, err := r.db.Exec("UPDATE documents SET views = views + 1 WHERE id = ?", id)
	return err
}

func (r *DocumentRepo) SearchDocuments(query string) ([]models.SearchResult, error) {
	safeQuery := `"` + strings.ReplaceAll(query, `"`, `""`) + `"`

	rows, err := r.db.Query(fmt.Sprintf(`
		SELECT %s, highlight(documents_fts, 1, '<mark>', '</mark>') as snippet
		FROM documents_fts
		JOIN documents d ON d.id = documents_fts.id
		LEFT JOIN document_locks dl ON dl.doc_id = d.id
		WHERE documents_fts MATCH ?
		ORDER BY rank
		LIMIT 50
	`, selectDocCols), safeQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.SearchResult
	for rows.Next() {
		var sr models.SearchResult
		var tagsJSON string
		var isSaved, isLocked, previewLines int
		if err := rows.Scan(
			&sr.ID, &sr.Title, &sr.Type, &sr.CatID, &sr.SubCatID,
			&sr.FilePath, &sr.Content, &sr.Summary, &sr.CoverPath, &sr.ThumbnailSource,
			&tagsJSON, &sr.Views, &sr.ReadTime, &isSaved,
			&sr.Author, &sr.CreatedAt, &sr.UpdatedAt,
			&isLocked, &previewLines, &sr.Snippet,
		); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(tagsJSON), &sr.Tags) //nolint:errcheck
		sr.IsSaved = isSaved == 1
		sr.IsLocked = isLocked == 1
		sr.PreviewLines = previewLines
		if sr.PreviewLines == 0 {
			sr.PreviewLines = 5
		}
		if sr.Tags == nil {
			sr.Tags = []string{}
		}
		results = append(results, sr)
	}
	if results == nil {
		results = []models.SearchResult{}
	}
	return results, rows.Err()
}

func (r *DocumentRepo) GetDashboardStats() (models.DashboardStats, error) {
	stats := models.DashboardStats{ByType: map[string]int{}}

	rows, err := r.db.Query("SELECT type, COUNT(*) FROM documents GROUP BY type")
	if err != nil {
		return stats, err
	}
	defer rows.Close()
	for rows.Next() {
		var t string
		var c int
		rows.Scan(&t, &c) //nolint:errcheck
		stats.ByType[t] = c
		stats.TotalDocuments += c
	}

	r.db.QueryRow("SELECT COALESCE(SUM(views),0) FROM documents").Scan(&stats.TotalViews) //nolint:errcheck

	recentRows, err := r.db.Query(
		fmt.Sprintf(`SELECT %s FROM documents d LEFT JOIN document_locks dl ON dl.doc_id = d.id ORDER BY d.views DESC, d.updated_at DESC LIMIT 10`, selectDocCols),
	)
	if err == nil {
		defer recentRows.Close()
		for recentRows.Next() {
			var d models.Document
			if err := scanDocument(recentRows, &d); err == nil {
				stats.RecentReads = append(stats.RecentReads, d)
			}
		}
	}

	tagRows, err := r.db.Query(
		`SELECT value as tag, COUNT(*) as cnt FROM documents, json_each(documents.tags) GROUP BY value ORDER BY cnt DESC LIMIT 20`,
	)
	if err == nil {
		defer tagRows.Close()
		for tagRows.Next() {
			var tc models.TagCount
			tagRows.Scan(&tc.Tag, &tc.Count) //nolint:errcheck
			stats.TrendingTags = append(stats.TrendingTags, tc)
		}
	}

	if stats.RecentReads == nil {
		stats.RecentReads = []models.Document{}
	}
	if stats.TrendingTags == nil {
		stats.TrendingTags = []models.TagCount{}
	}
	return stats, nil
}

func (r *DocumentRepo) RebuildFTS() error {
	_, err := r.db.Exec("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')")
	return err
}

func (r *DocumentRepo) UpdateCoverPath(id, coverPath, source string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := r.db.Exec(
		"UPDATE documents SET cover_path=?, thumbnail_source=?, updated_at=? WHERE id=?",
		coverPath, source, now, id,
	)
	return err
}

func (r *DocumentRepo) GetDocsNeedingThumbnail() ([]models.Document, error) {
	rows, err := r.db.Query(
		fmt.Sprintf(`SELECT %s FROM documents d LEFT JOIN document_locks dl ON dl.doc_id = d.id
		WHERE (d.cover_path IS NULL OR d.cover_path = '' OR d.thumbnail_source = 'svg' OR d.thumbnail_source = '')
		ORDER BY d.created_at DESC LIMIT 50`, selectDocCols),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var docs []models.Document
	for rows.Next() {
		var d models.Document
		if err := scanDocument(rows, &d); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	if docs == nil {
		docs = []models.Document{}
	}
	return docs, rows.Err()
}
