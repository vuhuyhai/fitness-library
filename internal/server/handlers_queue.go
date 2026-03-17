package server

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"fitness-library/internal/models"
)

func (s *Server) handleGetQueueStatus(w http.ResponseWriter, r *http.Request) {
	items, err := s.queueRepo.GetAllItems()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	status := models.QueueStatus{
		Items:   items,
		Running: s.queueSvc.IsRunning(),
		Paused:  s.queueSvc.IsPaused(),
	}
	for _, it := range items {
		status.Total++
		switch it.Status {
		case "done":
			status.Done++
		case "pending", "processing":
			status.Pending++
		}
	}
	writeOK(w, status)
}

func (s *Server) handleStartQueue(w http.ResponseWriter, r *http.Request) {
	if err := s.queueSvc.Start(); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handlePauseQueue(w http.ResponseWriter, r *http.Request) {
	var err error
	if s.queueSvc.IsPaused() {
		err = s.queueSvc.Resume()
	} else {
		err = s.queueSvc.Pause()
	}
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleClearDoneQueue(w http.ResponseWriter, r *http.Request) {
	if err := s.queueRepo.ClearDone(); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

func (s *Server) handleUpdateQueueItemCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		CatID string `json:"cat_id"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if err := s.queueRepo.UpdateCatID(id, body.CatID); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

// handleUploadFiles accepts multipart file uploads, saves them to uploadDir,
// and queues them for processing. Replaces the desktop SelectFiles dialog.
func (s *Server) handleUploadFiles(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(500 << 20); err != nil { // 500 MB limit
		writeError(w, "form parse: "+err.Error(), http.StatusBadRequest)
		return
	}

	fhs := r.MultipartForm.File["files"]
	if len(fhs) == 0 {
		writeError(w, "no files uploaded", http.StatusBadRequest)
		return
	}

	var paths []string
	for _, fh := range fhs {
		src, err := fh.Open()
		if err != nil {
			writeError(w, "open: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer src.Close()

		dst := filepath.Join(s.uploadDir, filepath.Base(fh.Filename))
		// Avoid overwriting existing file with same name
		if _, err := os.Stat(dst); err == nil {
			ext  := filepath.Ext(fh.Filename)
			base := fh.Filename[:len(fh.Filename)-len(ext)]
			dst   = filepath.Join(s.uploadDir, fmt.Sprintf("%s_%d%s", base, time.Now().UnixMilli(), ext))
		}

		out, err := os.Create(dst)
		if err != nil {
			writeError(w, "create: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if _, err := io.Copy(out, src); err != nil {
			out.Close()
			writeError(w, "save: "+err.Error(), http.StatusInternalServerError)
			return
		}
		out.Close()
		paths = append(paths, dst)
	}

	items, err := s.queueRepo.AddFiles(paths)
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, items)
}
