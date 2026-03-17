package server

import (
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	hash := s.settingsRepo.Get("admin.password_hash")
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeError(w, "Sai mật khẩu", http.StatusUnauthorized)
		return
	}

	token, err := s.generateToken()
	if err != nil {
		writeError(w, "token error", http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]string{"token": token})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeOK(w, map[string]string{"role": "admin"})
}
