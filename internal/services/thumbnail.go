package services

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type ThumbnailService struct {
	thumbDir   string
	ffmpegPath string
}

func NewThumbnailService(thumbDir, ffmpegPath string) *ThumbnailService {
	return &ThumbnailService{thumbDir: thumbDir, ffmpegPath: ffmpegPath}
}

// GenerateThumbnail generates a thumbnail for the given file.
// Returns the absolute path to the generated thumbnail, or "" if none.
func (s *ThumbnailService) GenerateThumbnail(docID, filePath, fileType string) (string, error) {
	switch fileType {
	case "video":
		return s.videoThumbnail(docID, filePath)
	case "pdf":
		return s.pdfThumbnail(docID, filePath)
	default:
		return "", nil
	}
}

func (s *ThumbnailService) videoThumbnail(docID, filePath string) (string, error) {
	ffmpeg := s.findFFmpeg()
	if ffmpeg == "" {
		return "", nil // No ffmpeg — frontend will use SVG
	}

	outPath := filepath.Join(s.thumbDir, docID+".jpg")
	if _, err := os.Stat(outPath); err == nil {
		return outPath, nil // Already exists
	}

	cmd := exec.Command(ffmpeg,
		"-ss", "00:00:03",
		"-i", filePath,
		"-frames:v", "1",
		"-y",
		outPath,
	)
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("ffmpeg: %w", err)
	}
	return outPath, nil
}

func (s *ThumbnailService) pdfThumbnail(docID, filePath string) (string, error) {
	// pdfcpu extract first page as image
	outPath := filepath.Join(s.thumbDir, docID+".png")
	if _, err := os.Stat(outPath); err == nil {
		return outPath, nil // Already exists
	}

	// Use pdfcpu to render page 1 as image
	// We'll shell out to pdfcpu CLI if available, or skip
	// For now, return empty — frontend will use procedural SVG
	// A full implementation would use pdfcpu Go API to extract image
	return "", nil
}

func (s *ThumbnailService) findFFmpeg() string {
	if s.ffmpegPath != "" {
		if _, err := os.Stat(s.ffmpegPath); err == nil {
			return s.ffmpegPath
		}
	}
	// Check PATH
	candidates := []string{"ffmpeg", "ffmpeg.exe"}
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			return path
		}
	}
	return ""
}

// HasFFmpeg returns true if ffmpeg is available.
func (s *ThumbnailService) HasFFmpeg() bool {
	return s.findFFmpeg() != ""
}

// ClearCache removes all cached thumbnails.
func (s *ThumbnailService) ClearCache() error {
	entries, err := os.ReadDir(s.thumbDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		name := e.Name()
		if strings.HasSuffix(name, ".jpg") || strings.HasSuffix(name, ".png") {
			os.Remove(filepath.Join(s.thumbDir, name))
		}
	}
	return nil
}
