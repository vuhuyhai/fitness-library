package server

import (
	"encoding/json"
	"net/http"
	"strings"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeOK(w http.ResponseWriter, v any) { writeJSON(w, http.StatusOK, v) }

func writeError(w http.ResponseWriter, msg string, status int) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// corsMiddleware adds CORS headers and handles OPTIONS preflight requests.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// decodeJSON reads JSON body into v, writing a 400 error on failure.
// Returns false if decoding failed (caller should return early).
func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeError(w, "invalid request body: "+err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

// isAPIPath returns true for /api/* and /localfile/* paths.
func isAPIPath(path string) bool {
	return strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/localfile/")
}
