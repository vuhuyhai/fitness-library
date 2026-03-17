package server

import (
	"net/http"

	"fitness-library/internal/models"
	"fitness-library/internal/services"
)

func (s *Server) handleChatWithDocument(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Question string               `json:"question"`
		History  []models.ChatMessage `json:"history"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	doc, err := s.docRepo.GetDocument(r.PathValue("id"))
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	resp, err := s.aiSvc.ChatWithDocument(s.ctx, doc.Content, req.Question, req.History)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, resp)
}

func (s *Server) handleExplainTerm(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Term    string `json:"term"`
		Context string `json:"context"`
		CatID   string `json:"cat_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	// 1. Pre-built offline dictionary
	if offline := services.LookupFitnessTerm(req.Term); offline != nil {
		s.userRepo.SaveTermCache(offline, req.CatID) //nolint:errcheck
		writeOK(w, offline)
		return
	}

	// 2. SQLite cache
	if cached, ok := s.userRepo.GetTermCache(req.Term); ok {
		writeOK(w, cached)
		return
	}

	// 3. AI call
	exp, err := s.aiSvc.ExplainTerm(s.ctx, req.Term, req.Context, req.CatID)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	s.userRepo.SaveTermCache(exp, req.CatID) //nolint:errcheck
	writeOK(w, exp)
}
