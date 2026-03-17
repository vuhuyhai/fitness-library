package services

import (
	"encoding/base64"
	"net/http"
	"path/filepath"
	"strings"
)

// LocalFileHandler serves local files via the /localfile/{base64path} URL pattern.
// It supports HTTP Range requests (needed for video seeking).
func NewLocalFileHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		encoded := strings.TrimPrefix(r.URL.Path, "/localfile/")
		if encoded == "" {
			http.Error(w, "missing path", http.StatusBadRequest)
			return
		}

		// URL-safe base64 — try with padding, without padding, and standard as fallback
		decoded, err := base64.URLEncoding.DecodeString(encoded)
		if err != nil {
			decoded, err = base64.RawURLEncoding.DecodeString(encoded)
		}
		if err != nil {
			decoded, err = base64.StdEncoding.DecodeString(encoded)
		}
		if err != nil {
			http.Error(w, "invalid path encoding", http.StatusBadRequest)
			return
		}

		absPath := filepath.FromSlash(string(decoded))

		// Security: only serve absolute paths (we only ever encode absolute paths).
		// filepath.Clean resolves all ".." components, so check IsAbs on the result.
		clean := filepath.Clean(absPath)
		if !filepath.IsAbs(clean) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}

		http.ServeFile(w, r, clean)
	})
}

// LocalFileURL encodes an absolute OS path to a /localfile/ URL.
// Uses RawURLEncoding (no padding) to match the frontend's localFileURL helper.
func LocalFileURL(absPath string) string {
	slashed := filepath.ToSlash(absPath)
	encoded := base64.RawURLEncoding.EncodeToString([]byte(slashed))
	return "/localfile/" + encoded
}
