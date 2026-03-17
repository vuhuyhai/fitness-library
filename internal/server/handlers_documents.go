package server

import (
	"net/http"
	"strconv"

	"fitness-library/internal/models"
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

func (s *Server) handleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	if err := s.docRepo.DeleteDocument(r.PathValue("id")); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
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
