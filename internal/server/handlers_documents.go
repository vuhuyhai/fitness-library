package server

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"fitness-library/internal/models"

	"github.com/google/uuid"
)

func (s *Server) handleGetDocuments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit := 200
	if l, err := strconv.Atoi(q.Get("limit")); err == nil && l > 0 {
		limit = l
	}
	offset := 0
	if o, err := strconv.Atoi(q.Get("offset")); err == nil && o >= 0 {
		offset = o
	}
	filter := models.DocumentFilter{
		CatID:  q.Get("cat_id"),
		SortBy: q.Get("sort_by"),
		Limit:  limit,
		Offset: offset,
	}
	if q.Get("is_saved") == "true" {
		t := true
		filter.IsSaved = &t
	}

	docs, err := s.docRepo.GetDocuments(filter)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, docs)
}

func (s *Server) handleGetDocument(w http.ResponseWriter, r *http.Request) {
	doc, err := s.docRepo.GetDocument(r.PathValue("id"))
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	writeOK(w, doc)
}

func (s *Server) handleSearchDocuments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len([]rune(q)) < 2 {
		writeOK(w, []models.SearchResult{})
		return
	}
	results, err := s.docRepo.SearchDocuments(q)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, results)
}

func (s *Server) handleIncrementViews(w http.ResponseWriter, r *http.Request) {
	s.docRepo.IncrementViews(r.PathValue("id")) //nolint:errcheck
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleGetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := s.docRepo.GetDashboardStats()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, stats)
}

func (s *Server) handleGetDBStats(w http.ResponseWriter, r *http.Request) {
	stats := s.catRepo.GetDBStats(s.dataDir + "/fitness.db")
	stats["ffmpeg_available"] = s.thumbSvc.HasFFmpeg()
	writeOK(w, stats)
}

func (s *Server) handleCreateDocument(w http.ResponseWriter, r *http.Request) {
	var input models.CreateDocumentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	doc, err := s.docRepo.CreateDocument(input)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, doc)
}

func (s *Server) handleUpdateDocument(w http.ResponseWriter, r *http.Request) {
	var updates models.UpdateDocumentInput
	if !decodeJSON(w, r, &updates) {
		return
	}
	if err := s.docRepo.UpdateDocument(r.PathValue("id"), updates); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleGetDeletePreview(w http.ResponseWriter, r *http.Request) {
	prev, err := s.docRepo.GetDeletePreview(r.PathValue("id"))
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, prev)
}

func (s *Server) handleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Default options: delete file + related data, keep thumbnail
	opts := models.DeleteOptions{DeleteFile: true, DeleteRelated: true, DeleteThumbnail: false}
	if r.Body != nil && r.ContentLength != 0 {
		json.NewDecoder(r.Body).Decode(&opts) //nolint:errcheck
	}

	// Get doc info for audit log before deleting
	prev, _ := s.docRepo.GetDeletePreview(id)

	// Soft delete
	if err := s.docRepo.SoftDelete(id, opts); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Store undo token (30-second window)
	token := uuid.New().String()
	expiresAt := time.Now().Add(30 * time.Second)
	s.docRepo.InsertUndoToken(token, id, expiresAt) //nolint:errcheck

	// Write audit log entry now (may be updated to wasUndone later)
	s.docRepo.AddDeleteLog(models.DeleteLog{ //nolint:errcheck
		DocID:     id,
		DocTitle:  prev.Title,
		DeletedBy: "admin",
		DeletedAt: time.Now().UTC().Format(time.RFC3339),
	})

	thumbDir := filepath.Join(s.dataDir, "thumbnails")

	// Schedule hard purge after 30 seconds
	go func() {
		time.Sleep(30 * time.Second)

		docID, valid := s.docRepo.UndoTokenExists(token)
		if !valid || docID == "" {
			return // user undid or token expired
		}
		s.docRepo.ConsumeUndoToken(token) //nolint:errcheck
		freed, _ := s.docRepo.PurgeDocument(id, opts, thumbDir)
		s.docRepo.AddDeleteLog(models.DeleteLog{ //nolint:errcheck
			DocID:     id,
			DocTitle:  prev.Title,
			DeletedBy: "admin",
			FreedBytes: freed,
			DeletedAt: time.Now().UTC().Format(time.RFC3339),
		})
	}()

	writeOK(w, models.DeleteResult{
		Success:      true,
		DeletedItems: 1,
		UndoToken:    token,
		Message:      "Tài liệu sẽ bị xóa sau 30 giây",
	})
}

func (s *Server) handleUndoDelete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}

	docID, valid := s.docRepo.UndoTokenExists(body.Token)
	if !valid || docID == "" {
		writeError(w, "Thời gian hoàn tác đã hết", http.StatusGone)
		return
	}

	if err := s.docRepo.RestoreDocument(docID); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	s.docRepo.ConsumeUndoToken(body.Token) //nolint:errcheck
	s.docRepo.MarkDeleteLogUndone(docID)   //nolint:errcheck

	writeOK(w, map[string]string{"docId": docID})
}

func (s *Server) handleBatchDeleteDocuments(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs  []string             `json:"ids"`
		Opts models.DeleteOptions `json:"opts"`
	}
	body.Opts = models.DeleteOptions{DeleteFile: true, DeleteRelated: true}
	if !decodeJSON(w, r, &body) {
		return
	}
	if len(body.IDs) == 0 {
		writeError(w, "no ids provided", http.StatusBadRequest)
		return
	}

	thumbDir := filepath.Join(s.dataDir, "thumbnails")
	token := uuid.New().String()
	expiresAt := time.Now().Add(30 * time.Second)

	var titles []string
	for _, id := range body.IDs {
		prev, _ := s.docRepo.GetDeletePreview(id)
		titles = append(titles, prev.Title)
		s.docRepo.SoftDelete(id, body.Opts) //nolint:errcheck
		s.docRepo.InsertUndoToken(token+"_"+id, id, expiresAt) //nolint:errcheck
	}

	ids := body.IDs
	opts := body.Opts
	go func() {
		time.Sleep(30 * time.Second)
		for i, id := range ids {
			t := token + "_" + id
			docID, valid := s.docRepo.UndoTokenExists(t)
			if !valid || docID == "" {
				continue
			}
			s.docRepo.ConsumeUndoToken(t) //nolint:errcheck
			freed, _ := s.docRepo.PurgeDocument(id, opts, thumbDir)
			title := ""
			if i < len(titles) {
				title = titles[i]
			}
			s.docRepo.AddDeleteLog(models.DeleteLog{ //nolint:errcheck
				DocID: id, DocTitle: title, DeletedBy: "admin",
				FreedBytes: freed, DeletedAt: time.Now().UTC().Format(time.RFC3339),
			})
		}
	}()

	writeOK(w, models.DeleteResult{
		Success:      true,
		DeletedItems: len(body.IDs),
		UndoToken:    token,
		Message:      "Tài liệu sẽ bị xóa sau 30 giây",
	})
}

func (s *Server) handleGetDeleteLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := s.docRepo.GetDeleteLogs(50)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, logs)
}

func (s *Server) handleRebuildFTS(w http.ResponseWriter, r *http.Request) {
	if err := s.docRepo.RebuildFTS(); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

// handleRunAIPipeline runs AI tag/summary/readtime synchronously (web mode).
func (s *Server) handleRunAIPipeline(w http.ResponseWriter, r *http.Request) {
	id  := r.PathValue("id")
	doc, err := s.docRepo.GetDocument(id)
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	result, err := s.aiSvc.ProcessDocument(s.ctx, doc.ID, doc.Title, doc.Content)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if result != nil {
		s.docRepo.UpdateAIFields(id, result.Tags, result.Summary, result.ReadTime) //nolint:errcheck
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleGenerateCaption(w http.ResponseWriter, r *http.Request) {
	doc, err := s.docRepo.GetDocument(r.PathValue("id"))
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	result, err := s.aiSvc.GenerateFacebookCaption(s.ctx, doc.Title, doc.Summary)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, result)
}
