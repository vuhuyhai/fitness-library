package server

import (
	"net/http"

	"fitness-library/internal/db"
	"fitness-library/internal/services"

	"golang.org/x/crypto/bcrypt"
)

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.settingsRepo.GetAll()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// Never expose secrets to the frontend
	delete(settings, "admin.password_hash")
	delete(settings, "jwt.secret")
	writeOK(w, settings)
}

func (s *Server) handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var settings map[string]string
	if !decodeJSON(w, r, &settings) {
		return
	}

	// Handle admin password change via special key
	if newPwd, ok := settings["admin.new_password"]; ok && newPwd != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(newPwd), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, "hash error", http.StatusInternalServerError)
			return
		}
		settings["admin.password_hash"] = string(hash)
		delete(settings, "admin.new_password")
	}

	// Prevent overwriting secrets from frontend
	delete(settings, "jwt.secret")

	if err := s.settingsRepo.Save(settings); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Refresh thumbnail service if ffmpeg path changed
	if ffmpegPath, ok := settings["ffmpeg.path"]; ok {
		thumbDir, _ := db.ThumbnailDir()
		s.thumbSvc = services.NewThumbnailService(thumbDir, ffmpegPath)
	}

	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleTestAI(w http.ResponseWriter, r *http.Request) {
	if err := s.aiSvc.TestConnection(s.ctx); err != nil {
		writeError(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}
