package server

import (
	"net/http"
	"strconv"

	"fitness-library/internal/models"
)

// ── Unlock ────────────────────────────────────────────────────────────────

func (s *Server) handleUnlockDocument(w http.ResponseWriter, r *http.Request) {
	if err := s.userRepo.UnlockDocument(r.PathValue("id")); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleIsUnlocked(w http.ResponseWriter, r *http.Request) {
	ok, err := s.userRepo.IsDocumentUnlocked(r.PathValue("id"))
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"unlocked": ok})
}

func (s *Server) handleGetUnlocked(w http.ResponseWriter, r *http.Request) {
	ids, err := s.userRepo.GetUnlockedDocuments()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, ids)
}

func (s *Server) handleSetLock(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IsLocked     bool `json:"is_locked"`
		PreviewLines int  `json:"preview_lines"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := s.userRepo.SetDocumentLock(r.PathValue("id"), req.IsLocked, req.PreviewLines); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

// ── Reading progress ──────────────────────────────────────────────────────

func (s *Server) handleGetProgress(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := s.userRepo.GetReadingProgress(id)
	if err != nil {
		writeOK(w, models.ReadingProgressDTO{DocID: id})
		return
	}
	writeOK(w, p)
}

func (s *Server) handleSaveProgress(w http.ResponseWriter, r *http.Request) {
	var progress models.ReadingProgressDTO
	if !decodeJSON(w, r, &progress) {
		return
	}
	progress.DocID = r.PathValue("id")
	if err := s.userRepo.SaveReadingProgress(progress); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

// ── Share events ──────────────────────────────────────────────────────────

func (s *Server) handleLogShareEvent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DocID      string `json:"doc_id"`
		Tone       string `json:"tone"`
		Visibility string `json:"visibility"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	doc, err := s.docRepo.GetDocument(req.DocID)
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	if err := s.userRepo.SaveShareEvent(req.DocID, doc.Title, req.Tone, req.Visibility); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleGetShareEvents(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	events, err := s.userRepo.GetRecentShareEvents(limit)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, events)
}
