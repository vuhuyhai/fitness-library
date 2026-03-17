package services

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ThumbnailService struct {
	thumbDir   string
	ffmpegPath string
}

func NewThumbnailService(thumbDir, ffmpegPath string) *ThumbnailService {
	return &ThumbnailService{thumbDir: thumbDir, ffmpegPath: ffmpegPath}
}

// GenerateThumbnail generates a thumbnail for the given file.
// Returns the absolute path to the generated thumbnail, or "" if not possible.
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

// GenerateAIThumbnail generates a thumbnail using Pollinations.ai (free, no API key).
func (s *ThumbnailService) GenerateAIThumbnail(docID, title, catID string) (string, error) {
	outPath := filepath.Join(s.thumbDir, docID+".jpg")

	prompt := buildAIPrompt(title, catID)
	encoded := url.QueryEscape(prompt)
	seed := rand.Intn(999999) //nolint:gosec
	apiURL := fmt.Sprintf(
		"https://image.pollinations.ai/prompt/%s?width=520&height=292&seed=%d&nologo=true&model=flux",
		encoded, seed,
	)

	client := &http.Client{Timeout: 45 * time.Second}
	var resp *http.Response
	var err error
	for attempt := 0; attempt < 2; attempt++ {
		resp, err = client.Get(apiURL)
		if err == nil && resp.StatusCode == 200 {
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return "", fmt.Errorf("pollinations: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("pollinations: status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if len(data) < 1024 {
		return "", fmt.Errorf("pollinations: response too small (%d bytes)", len(data))
	}

	if err := os.WriteFile(outPath, data, 0644); err != nil {
		return "", err
	}
	return outPath, nil
}

// SaveUploadedThumbnail saves raw image bytes as the thumbnail for a document.
func (s *ThumbnailService) SaveUploadedThumbnail(docID string, data []byte) (string, error) {
	outPath := filepath.Join(s.thumbDir, docID+".jpg")
	if err := os.WriteFile(outPath, data, 0644); err != nil {
		return "", err
	}
	return outPath, nil
}

// DeleteThumbnail removes the thumbnail file for a document.
func (s *ThumbnailService) DeleteThumbnail(docID string) error {
	path := filepath.Join(s.thumbDir, docID+".jpg")
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ThumbPath returns the expected thumbnail path for a document.
func (s *ThumbnailService) ThumbPath(docID string) string {
	return filepath.Join(s.thumbDir, docID+".jpg")
}

func (s *ThumbnailService) videoThumbnail(docID, filePath string) (string, error) {
	ffmpeg := s.findFFmpeg()
	if ffmpeg == "" {
		return "", nil
	}
	outPath := filepath.Join(s.thumbDir, docID+".jpg")
	if _, err := os.Stat(outPath); err == nil {
		return outPath, nil
	}
	cmd := exec.Command(ffmpeg,
		"-ss", "00:00:03",
		"-i", filePath,
		"-frames:v", "1",
		"-vf", "scale=520:292:force_original_aspect_ratio=increase,crop=520:292",
		"-q:v", "3",
		"-y", outPath,
	)
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("ffmpeg: %w", err)
	}
	return outPath, nil
}

func (s *ThumbnailService) pdfThumbnail(docID, filePath string) (string, error) {
	// PDF rendering requires a renderer (MuPDF/poppler) which needs CGO or external binary.
	// Not available in CGO_ENABLED=0 build. Falls through to AI thumbnail.
	_ = filePath
	_ = docID
	return "", nil
}

func (s *ThumbnailService) findFFmpeg() string {
	if s.ffmpegPath != "" {
		if _, err := os.Stat(s.ffmpegPath); err == nil {
			return s.ffmpegPath
		}
	}
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
			os.Remove(filepath.Join(s.thumbDir, name)) //nolint:errcheck
		}
	}
	return nil
}

func buildAIPrompt(title, catID string) string {
	catThemes := map[string]string{
		"cat-workout":   "dynamic fitness gym workout, athletic person exercising, energetic movement, sports",
		"cat-nutrition": "healthy food nutrition, fresh vegetables protein, clean eating lifestyle, colorful produce",
		"cat-recovery":  "rest recovery yoga stretching, calm peaceful wellness, serene atmosphere",
		"cat-mindset":   "motivation mindset success, mental strength focus, determined athlete, inspirational",
		"cat-science":   "sport science research, anatomy biology, professional analytical, medical illustration",
	}
	theme := catThemes[catID]
	if theme == "" {
		theme = "fitness health wellness, active lifestyle, professional photography"
	}
	safeTitle := title
	runes := []rune(safeTitle)
	if len(runes) > 40 {
		safeTitle = string(runes[:40])
	}
	return fmt.Sprintf(
		"professional fitness book cover thumbnail, %s, inspired by '%s', "+
			"modern minimalist design, cinematic lighting, no text, 16:9 widescreen",
		theme, safeTitle,
	)
}
