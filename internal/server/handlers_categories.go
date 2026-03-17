package server

import "net/http"

func (s *Server) handleGetCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := s.catRepo.GetCategories()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, cats)
}

func (s *Server) handleCreateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Icon     string `json:"icon"`
		Color    string `json:"color"`
		ParentID string `json:"parent_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	cat, err := s.catRepo.CreateCategory(req.Name, req.Icon, req.Color, req.ParentID)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, cat)
}

func (s *Server) handleDeleteCategory(w http.ResponseWriter, r *http.Request) {
	if err := s.catRepo.DeleteCategory(r.PathValue("id")); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}
