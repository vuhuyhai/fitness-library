package services

import (
	"archive/zip"
	"encoding/xml"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// ExtractText extracts plain text from a file based on its type.
// Returns up to maxChars characters of text.
func ExtractText(filePath, fileType string, maxChars int) (string, error) {
	var text string
	var err error

	switch fileType {
	case "pdf":
		text, err = extractPDF(filePath)
	case "video":
		text = "Video: " + filepath.Base(filePath)
	case "article":
		ext := strings.ToLower(filepath.Ext(filePath))
		if ext == ".docx" || ext == ".doc" {
			text, err = extractDOCX(filePath)
		} else {
			text, err = readTextFile(filePath)
		}
	case "note":
		text, err = readTextFile(filePath)
	default:
		text, err = readTextFile(filePath)
	}

	if err != nil {
		return "", err
	}

	// Truncate to maxChars
	runes := []rune(text)
	if len(runes) > maxChars {
		runes = runes[:maxChars]
	}
	return strings.TrimSpace(string(runes)), nil
}

func extractPDF(filePath string) (string, error) {
	conf := model.NewDefaultConfiguration()

	// Extract content to a temp directory, then read all txt files
	tmpDir, err := os.MkdirTemp("", "pdfcpu-*")
	if err != nil {
		return "", err
	}
	defer os.RemoveAll(tmpDir)

	baseName := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))
	if err := api.ExtractContentFile(filePath, tmpDir, nil, conf); err != nil {
		// pdfcpu failed — return empty text (frontend will use filename)
		return baseName, nil
	}

	var sb strings.Builder
	fs.WalkDir(os.DirFS(tmpDir), ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		data, err := os.ReadFile(filepath.Join(tmpDir, path))
		if err == nil {
			sb.Write(data)
			sb.WriteString("\n")
		}
		return nil
	})
	return sb.String(), nil
}

func extractDOCX(filePath string) (string, error) {
	r, err := zip.OpenReader(filePath)
	if err != nil {
		return "", err
	}
	defer r.Close()

	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			defer rc.Close()
			return parseDocxXML(rc), nil
		}
	}
	return "", nil
}

func parseDocxXML(r io.Reader) string {
	type xmlText struct {
		XMLName xml.Name `xml:"body"`
		Text    []string `xml:",chardata"`
	}

	decoder := xml.NewDecoder(r)
	var sb strings.Builder
	for {
		tok, err := decoder.Token()
		if err != nil {
			break
		}
		if cd, ok := tok.(xml.CharData); ok {
			s := strings.TrimSpace(string(cd))
			if s != "" {
				sb.WriteString(s)
				sb.WriteString(" ")
			}
		}
	}
	return sb.String()
}

func readTextFile(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	text := string(data)

	// Strip HTML tags if HTML file
	ext := strings.ToLower(filepath.Ext(filePath))
	if ext == ".html" || ext == ".htm" {
		re := regexp.MustCompile(`<[^>]+>`)
		text = re.ReplaceAllString(text, " ")
	}

	// Collapse whitespace
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	return strings.TrimSpace(text), nil
}
