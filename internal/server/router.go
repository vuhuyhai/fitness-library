package server

import (
	"net/http"
	"os"
	"path/filepath"

	"fitness-library/internal/services"
)

func (s *Server) setupRoutes() http.Handler {
	mux := http.NewServeMux()

	// ── Auth ──────────────────────────────────────────────────────────────
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/auth/me",     s.requireAdmin(s.handleMe))

	// ── Public: documents ─────────────────────────────────────────────────
	mux.HandleFunc("GET /api/documents",              s.handleGetDocuments)
	mux.HandleFunc("GET /api/documents/search",       s.handleSearchDocuments)
	mux.HandleFunc("GET /api/documents/{id}",         s.handleGetDocument)
	mux.HandleFunc("POST /api/documents/{id}/views",  s.handleIncrementViews)
	mux.HandleFunc("GET /api/stats",                  s.handleGetStats)

	// ── Admin: documents ──────────────────────────────────────────────────
	mux.HandleFunc("POST /api/admin/documents",              s.requireAdmin(s.handleCreateDocument))
	mux.HandleFunc("PUT /api/admin/documents/{id}",          s.requireAdmin(s.handleUpdateDocument))
	mux.HandleFunc("DELETE /api/admin/documents/{id}",       s.requireAdmin(s.handleDeleteDocument))
	mux.HandleFunc("POST /api/admin/documents/{id}/ai",              s.requireAdmin(s.handleRunAIPipeline))
	mux.HandleFunc("POST /api/admin/documents/{id}/caption",         s.requireAdmin(s.handleGenerateCaption))
	mux.HandleFunc("POST /api/admin/documents/{id}/lock",            s.requireAdmin(s.handleSetLock))
	mux.HandleFunc("GET /api/admin/documents/{id}/delete-preview",   s.requireAdmin(s.handleGetDeletePreview))
	mux.HandleFunc("POST /api/admin/documents/batch-delete",         s.requireAdmin(s.handleBatchDeleteDocuments))
	mux.HandleFunc("POST /api/admin/undo-delete",                    s.requireAdmin(s.handleUndoDelete))
	mux.HandleFunc("GET /api/admin/delete-logs",                     s.requireAdmin(s.handleGetDeleteLogs))
	mux.HandleFunc("GET /api/admin/stats/db",                        s.requireAdmin(s.handleGetDBStats))
	mux.HandleFunc("POST /api/admin/fts/rebuild",                    s.requireAdmin(s.handleRebuildFTS))

	// ── Categories ────────────────────────────────────────────────────────
	mux.HandleFunc("GET /api/categories",                s.handleGetCategories)
	mux.HandleFunc("POST /api/admin/categories",         s.requireAdmin(s.handleCreateCategory))
	mux.HandleFunc("DELETE /api/admin/categories/{id}",  s.requireAdmin(s.handleDeleteCategory))

	// ── Queue ─────────────────────────────────────────────────────────────
	mux.HandleFunc("GET /api/admin/queue",              s.requireAdmin(s.handleGetQueueStatus))
	mux.HandleFunc("POST /api/admin/queue/start",       s.requireAdmin(s.handleStartQueue))
	mux.HandleFunc("POST /api/admin/queue/pause",       s.requireAdmin(s.handlePauseQueue))
	mux.HandleFunc("DELETE /api/admin/queue/done",      s.requireAdmin(s.handleClearDoneQueue))
	mux.HandleFunc("POST /api/admin/queue/upload",           s.requireAdmin(s.handleUploadFiles))
	mux.HandleFunc("POST /api/admin/upload-temp",            s.requireAdmin(s.handleUploadTempFile))
	mux.HandleFunc("PUT /api/admin/queue/{id}/category",     s.requireAdmin(s.handleUpdateQueueItemCategory))

	// ── Thumbnails ────────────────────────────────────────────────────────────────
	mux.HandleFunc("POST /api/admin/documents/{id}/thumbnail",        s.requireAdmin(s.handleGenerateThumbnail))
	mux.HandleFunc("POST /api/admin/documents/{id}/thumbnail/upload", s.requireAdmin(s.handleUploadThumbnail))
	mux.HandleFunc("DELETE /api/admin/documents/{id}/thumbnail",      s.requireAdmin(s.handleDeleteThumbnail))
	mux.HandleFunc("POST /api/admin/thumbnails/batch",                s.requireAdmin(s.handleBatchGenerateThumbnails))

		// ── Settings ──────────────────────────────────────────────────────────
	mux.HandleFunc("GET /api/admin/settings",           s.requireAdmin(s.handleGetSettings))
	mux.HandleFunc("PUT /api/admin/settings",           s.requireAdmin(s.handleSaveSettings))
	mux.HandleFunc("POST /api/admin/settings/test-ai",  s.requireAdmin(s.handleTestAI))

	// ── User: unlock ──────────────────────────────────────────────────────
	mux.HandleFunc("POST /api/unlock/{id}",        s.handleUnlockDocument)
	mux.HandleFunc("GET /api/unlock/{id}/status",  s.handleIsUnlocked)
	mux.HandleFunc("GET /api/unlocked",            s.handleGetUnlocked)

	// ── User: reading progress ────────────────────────────────────────────
	mux.HandleFunc("GET /api/progress/{id}",   s.handleGetProgress)
	mux.HandleFunc("PUT /api/progress/{id}",   s.handleSaveProgress)

	// ── Share events ──────────────────────────────────────────────────────
	mux.HandleFunc("POST /api/share-events",           s.handleLogShareEvent)
	mux.HandleFunc("GET /api/admin/share-events",      s.requireAdmin(s.handleGetShareEvents))

	// ── AI: chat + terms ──────────────────────────────────────────────────
	mux.HandleFunc("POST /api/chat/{id}",      s.handleChatWithDocument)
	mux.HandleFunc("POST /api/terms/explain",  s.handleExplainTerm)

	// ── Local file serving ────────────────────────────────────────────────
	mux.Handle("/localfile/", services.NewLocalFileHandler())

	// ── SPA catch-all ─────────────────────────────────────────────────────
	mux.HandleFunc("/", s.handleSPA)

	return corsMiddleware(mux)
}

// handleSPA serves the React SPA for all non-API paths.
func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	if isAPIPath(r.URL.Path) {
		writeError(w, "not found", http.StatusNotFound)
		return
	}

	// Serve static assets if the file exists
	clean := filepath.Clean(r.URL.Path)
	full  := filepath.Join(s.frontendDir, clean)
	if info, err := os.Stat(full); err == nil && !info.IsDir() {
		http.ServeFile(w, r, full)
		return
	}

	// Fall back to index.html for SPA client-side routing
	http.ServeFile(w, r, filepath.Join(s.frontendDir, "index.html"))
}
