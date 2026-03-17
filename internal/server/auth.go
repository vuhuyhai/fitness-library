package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// ── JWT (HS256, no external dependencies) ──────────────────────────────────

type jwtClaims struct {
	Role string `json:"role"`
	Iat  int64  `json:"iat"`
	Exp  int64  `json:"exp"`
}

func b64url(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

func (s *Server) generateToken() (string, error) {
	header  := b64url([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, _ := json.Marshal(jwtClaims{
		Role: "admin",
		Iat:  time.Now().Unix(),
		Exp:  time.Now().Add(30 * 24 * time.Hour).Unix(),
	})
	p       := b64url(payload)
	signing := header + "." + p
	mac     := hmac.New(sha256.New, []byte(s.jwtSecret))
	mac.Write([]byte(signing)) //nolint:errcheck
	return signing + "." + b64url(mac.Sum(nil)), nil
}

func (s *Server) verifyToken(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return false
	}
	signing := parts[0] + "." + parts[1]
	mac     := hmac.New(sha256.New, []byte(s.jwtSecret))
	mac.Write([]byte(signing)) //nolint:errcheck
	if b64url(mac.Sum(nil)) != parts[2] {
		return false
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}
	var claims jwtClaims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return false
	}
	return claims.Exp > time.Now().Unix()
}

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return r.URL.Query().Get("token") // fallback for query param
}

// requireAdmin is middleware that rejects unauthenticated requests.
func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.verifyToken(extractBearerToken(r)) {
			writeError(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}
