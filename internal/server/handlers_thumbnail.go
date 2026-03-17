package server

import (
	"io"
	"net/http"
)

// handleGenerateThumbnail generates an AI thumbnail for a document via Pollinations.
// POST /api/admin/documents/{id}/thumbnail
func (s *Server) handleGenerateThumbnail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	doc, err := s.docRepo.GetDocument(id)
	if err != nil {
		writeError(w, "document not found", http.StatusNotFound)
		return
	}
	thumbPath, err := s.thumbSvc.GenerateAIThumbnail(doc.ID, doc.Title, doc.CatID)
	if err != nil {
		writeError(w, "thumbnail generation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := s.docRepo.UpdateCoverPath(doc.ID, thumbPath, "ai"); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	coverURL := "/localfile/thumbnails/" + doc.ID + ".jpg"
	writeOK(w, map[string]string{"cover_path": thumbPath, "url": coverURL, "source": "ai"})
}

// handleUploadThumbnail accepts a multipart image upload as the document thumbnail.
// POST /api/admin/documents/{id}/thumbnail/upload
func (s *Server) handleUploadThumbnail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, "parse form: "+err.Error(), http.StatusBadRequest)
		return
	}
	file, _, err := r.FormFile("image")
	if err != nil {
		writeError(w, "no image field: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, "read: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if len(data) < 512 {
		writeError(w, "image too small", http.StatusBadRequest)
		return
	}

	thumbPath, err := s.thumbSvc.SaveUploadedThumbnail(id, data)
	if err != nil {
		writeError(w, "save: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if err := s.docRepo.UpdateCoverPath(id, thumbPath, "upload"); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	coverURL := "/localfile/thumbnails/" + id + ".jpg"
	writeOK(w, map[string]string{"cover_path": thumbPath, "url": coverURL, "source": "upload"})
}

// handleDeleteThumbnail removes the thumbnail and resets to SVG.
// DELETE /api/admin/documents/{id}/thumbnail
func (s *Server) handleDeleteThumbnail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.thumbSvc.DeleteThumbnail(id); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := s.docRepo.UpdateCoverPath(id, "", "svg"); err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]bool{"ok": true})
}

// handleBatchGenerateThumbnails generates AI thumbnails for all docs without real thumbnails.
// POST /api/admin/thumbnails/batch
func (s *Server) handleBatchGenerateThumbnails(w http.ResponseWriter, r *http.Request) {
	docs, err := s.docRepo.GetDocsNeedingThumbnail()
	if err != nil {
		writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeOK(w, map[string]int{"queued": len(docs)})
	// Run in background
	go func() {
		for _, doc := range docs {
			aiPath, err := s.thumbSvc.GenerateAIThumbnail(doc.ID, doc.Title, doc.CatID)
			if err == nil && aiPath != "" {
				s.docRepo.UpdateCoverPath(doc.ID, aiPath, "ai") //nolint:errcheck
			}
		}
	}()
}
