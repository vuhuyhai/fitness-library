package main

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"

	"fitness-library/internal/db"
	"fitness-library/internal/models"
	"fitness-library/internal/repository"
	"fitness-library/internal/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// AppVersion is exposed to the frontend.
const AppVersion = "1.0.0"

// App struct is the main application struct that holds all services.
type App struct {
	ctx context.Context

	docRepo      *repository.DocumentRepo
	catRepo      *repository.CategoryRepo
	queueRepo    *repository.QueueRepo
	settingsRepo *repository.SettingsRepo
	userRepo     *repository.UserRepo

	thumbSvc *services.ThumbnailService
	aiSvc    *services.AIService
	queueSvc *services.QueueService

	dataDir string
	dbPath  string
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. It sets up all services.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Open database
	database, err := db.Open()
	if err != nil {
		runtime.LogError(ctx, "Failed to open database: "+err.Error())
		return
	}

	// Repair FTS5 update trigger
	database.Exec("DROP TRIGGER IF EXISTS docs_au")
	database.Exec(`CREATE TRIGGER IF NOT EXISTS docs_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, id, title, content, summary, tags)
    VALUES('delete', old.rowid, old.id, old.title, old.content, old.summary, old.tags);
  INSERT INTO documents_fts(rowid, id, title, content, summary, tags)
    VALUES(new.rowid, new.id, new.title, new.content, new.summary, new.tags);
END`)

	// Init repos
	a.docRepo = repository.NewDocumentRepo(database)
	a.catRepo = repository.NewCategoryRepo(database)
	a.queueRepo = repository.NewQueueRepo(database)
	a.settingsRepo = repository.NewSettingsRepo(database)
	a.userRepo = repository.NewUserRepo(database)

	// Data dir
	dataDir, _ := db.DataDir()
	a.dataDir = dataDir
	a.dbPath = filepath.Join(dataDir, "fitness.db")

	// Thumbnail dir
	thumbDir, _ := db.ThumbnailDir()

	// Init services
	a.thumbSvc = services.NewThumbnailService(thumbDir, a.settingsRepo.Get("ffmpeg.path"))
	a.aiSvc = services.NewAIService(a.settingsRepo.Get)

	a.queueSvc = services.NewQueueService(
		a.queueRepo,
		a.docRepo,
		a.thumbSvc,
		a.aiSvc,
		a.settingsRepo.Get,
	)
	a.queueSvc.SetContext(ctx)
	// Wire Wails event emitter so the queue can push progress to the frontend.
	a.queueSvc.SetEventEmitter(func(event string, data interface{}) {
		runtime.EventsEmit(a.ctx, event, data)
	})

	runtime.LogInfo(ctx, "Fitness Library started. DB: "+a.dbPath)
}

// ─────────────────────────────────────────
// Document API
// ─────────────────────────────────────────

func (a *App) GetDocuments(filter models.DocumentFilter) ([]models.Document, error) {
	return a.docRepo.GetDocuments(filter)
}

func (a *App) GetDocument(id string) (models.Document, error) {
	return a.docRepo.GetDocument(id)
}

func (a *App) CreateDocument(input models.CreateDocumentInput) (models.Document, error) {
	return a.docRepo.CreateDocument(input)
}

func (a *App) UpdateDocument(id string, updates models.UpdateDocumentInput) error {
	return a.docRepo.UpdateDocument(id, updates)
}

func (a *App) DeleteDocument(id string) error {
	return a.docRepo.DeleteDocument(id)
}

func (a *App) SearchDocuments(query string) ([]models.SearchResult, error) {
	if len([]rune(query)) < 2 {
		return []models.SearchResult{}, nil
	}
	return a.docRepo.SearchDocuments(query)
}

func (a *App) IncrementViews(id string) error {
	return a.docRepo.IncrementViews(id)
}

func (a *App) GetDashboardStats() (models.DashboardStats, error) {
	return a.docRepo.GetDashboardStats()
}

func (a *App) RebuildFTS() error {
	return a.docRepo.RebuildFTS()
}

// ─────────────────────────────────────────
// Category API
// ─────────────────────────────────────────

func (a *App) GetCategories() ([]models.Category, error) {
	return a.catRepo.GetCategories()
}

func (a *App) CreateCategory(name, icon, color, parentID string) (models.Category, error) {
	return a.catRepo.CreateCategory(name, icon, color, parentID)
}

func (a *App) DeleteCategory(id string) error {
	return a.catRepo.DeleteCategory(id)
}

// ─────────────────────────────────────────
// Queue API
// ─────────────────────────────────────────

func (a *App) QueueFiles(paths []string) ([]models.ImportQueueItem, error) {
	return a.queueRepo.AddFiles(paths)
}

func (a *App) StartQueue() error {
	return a.queueSvc.Start()
}

func (a *App) PauseQueue() error {
	if a.queueSvc.IsPaused() {
		return a.queueSvc.Resume()
	}
	return a.queueSvc.Pause()
}

func (a *App) GetQueueStatus() (models.QueueStatus, error) {
	items, err := a.queueRepo.GetAllItems()
	if err != nil {
		return models.QueueStatus{}, err
	}

	status := models.QueueStatus{
		Items:   items,
		Running: a.queueSvc.IsRunning(),
		Paused:  a.queueSvc.IsPaused(),
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
	return status, nil
}

func (a *App) ClearDoneQueue() error {
	return a.queueRepo.ClearDone()
}

// ─────────────────────────────────────────
// Settings API
// ─────────────────────────────────────────

func (a *App) GetSettings() (map[string]string, error) {
	return a.settingsRepo.GetAll()
}

func (a *App) SaveSettings(settings map[string]string) error {
	err := a.settingsRepo.Save(settings)
	if err != nil {
		return err
	}
	if ffmpegPath, ok := settings["ffmpeg.path"]; ok {
		thumbDir, _ := db.ThumbnailDir()
		a.thumbSvc = services.NewThumbnailService(thumbDir, ffmpegPath)
	}
	return nil
}

func (a *App) TestAIConnection() error {
	return a.aiSvc.TestConnection(a.ctx)
}

// ─────────────────────────────────────────
// File System API
// ─────────────────────────────────────────

func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Chọn thư mục",
	})
}

func (a *App) SelectFiles() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Chọn tài liệu để import",
		Filters: []runtime.FileFilter{
			{DisplayName: "Tài liệu (PDF, DOCX, Markdown, Video)", Pattern: "*.pdf;*.docx;*.doc;*.md;*.markdown;*.html;*.htm;*.txt;*.mp4;*.mkv;*.avi"},
			{DisplayName: "PDF", Pattern: "*.pdf"},
			{DisplayName: "Video", Pattern: "*.mp4;*.mkv;*.avi;*.mov"},
			{DisplayName: "Văn bản", Pattern: "*.md;*.txt;*.docx;*.html"},
		},
	})
}

func (a *App) OpenFileInExplorer(path string) error {
	cmd := exec.Command("explorer", "/select,", filepath.FromSlash(path))
	return cmd.Start()
}

func (a *App) GetDataDir() (string, error) {
	if a.dataDir != "" {
		return a.dataDir, nil
	}
	return db.DataDir()
}

func (a *App) GetDBStats() (map[string]interface{}, error) {
	stats := a.catRepo.GetDBStats(a.dbPath)
	stats["ffmpeg_available"] = a.thumbSvc.HasFFmpeg()
	return stats, nil
}

func (a *App) RunAIPipeline(docID string) error {
	doc, err := a.docRepo.GetDocument(docID)
	if err != nil {
		return err
	}
	go func() {
		result, err := a.aiSvc.ProcessDocument(a.ctx, doc.ID, doc.Title, doc.Content)
		if err != nil {
			runtime.EventsEmit(a.ctx, "ai:error:"+docID, err.Error())
			return
		}
		if result != nil {
			a.docRepo.UpdateAIFields(docID, result.Tags, result.Summary, result.ReadTime)
			runtime.EventsEmit(a.ctx, "ai:done:"+docID, result)
		}
	}()
	return nil
}

func (a *App) ClearThumbnailCache() error {
	return a.thumbSvc.ClearCache()
}

// GetAppVersion returns the application version string.
func (a *App) GetAppVersion() string {
	return AppVersion
}

func (a *App) GetLocalFileURL(absPath string) (string, error) {
	if absPath == "" {
		return "", fmt.Errorf("empty path")
	}
	return services.LocalFileURL(absPath), nil
}

// ─────────────────────────────────────────
// Unlock / Lock API (Feature 1: Share-to-unlock)
// ─────────────────────────────────────────

// UnlockDocument marks a document as unlocked on this device (after Facebook share).
func (a *App) UnlockDocument(docID string) error {
	return a.userRepo.UnlockDocument(docID)
}

// GetUnlockedDocuments returns all doc IDs unlocked on this device.
// Called on app startup to seed localStorage.
func (a *App) GetUnlockedDocuments() ([]string, error) {
	return a.userRepo.GetUnlockedDocuments()
}

// IsDocumentUnlocked checks whether a specific doc is unlocked on this device.
func (a *App) IsDocumentUnlocked(docID string) (bool, error) {
	return a.userRepo.IsDocumentUnlocked(docID)
}

// SetDocumentLock sets admin-controlled lock status for a document.
func (a *App) SetDocumentLock(docID string, isLocked bool, previewLines int) error {
	return a.userRepo.SetDocumentLock(docID, isLocked, previewLines)
}

// OpenBrowserURL opens a URL in the default system browser (for Facebook share dialog).
func (a *App) OpenBrowserURL(url string) {
	runtime.BrowserOpenURL(a.ctx, url)
}

// ─────────────────────────────────────────
// Reading Progress API (Feature 3)
// ─────────────────────────────────────────

// SaveReadingProgress upserts reading progress for a document in SQLite.
func (a *App) SaveReadingProgress(progress models.ReadingProgressDTO) error {
	return a.userRepo.SaveReadingProgress(progress)
}

// GetReadingProgress retrieves stored reading progress for a document.
func (a *App) GetReadingProgress(docID string) (models.ReadingProgressDTO, error) {
	return a.userRepo.GetReadingProgress(docID)
}

// ─────────────────────────────────────────
// Facebook Caption AI (Feature 4)
// ─────────────────────────────────────────

// GenerateFacebookCaption generates AI-powered Facebook captions for a document.
// It looks up the document title/summary and calls the configured AI provider.
func (a *App) GenerateFacebookCaption(docID string) (models.CaptionResult, error) {
	doc, err := a.docRepo.GetDocument(docID)
	if err != nil {
		return models.CaptionResult{}, err
	}
	result, err := a.aiSvc.GenerateFacebookCaption(a.ctx, doc.Title, doc.Summary)
	if err != nil {
		return models.CaptionResult{}, err
	}
	return *result, nil
}

// LogShareEvent records that the user shared a document on Facebook.
// visibility should be "public" when user confirmed the post is public, "unknown" otherwise.
func (a *App) LogShareEvent(docID, tone, visibility string) error {
	doc, err := a.docRepo.GetDocument(docID)
	if err != nil {
		return err
	}
	return a.userRepo.SaveShareEvent(docID, doc.Title, tone, visibility)
}

// GetRecentShareEvents returns recent share analytics (admin use).
func (a *App) GetRecentShareEvents(limit int) ([]models.ShareEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return a.userRepo.GetRecentShareEvents(limit)
}

// ─────────────────────────────────────────
// Chat with Document AI (Feature 5)
// ─────────────────────────────────────────

// ChatWithDocument answers a question about a document using AI.
// history contains the prior turns (trimmed to last 6 by the service).
func (a *App) ChatWithDocument(docID string, question string, history []models.ChatMessage) (models.ChatResponse, error) {
	doc, err := a.docRepo.GetDocument(docID)
	if err != nil {
		return models.ChatResponse{}, err
	}
	resp, err := a.aiSvc.ChatWithDocument(a.ctx, doc.Content, question, history)
	if err != nil {
		return models.ChatResponse{}, err
	}
	return *resp, nil
}

// ─────────────────────────────────────────
// Term Explanation AI (Feature 6)
// ─────────────────────────────────────────

// ExplainTerm returns an AI explanation of a fitness term.
// It checks the SQLite cache and pre-built dictionary before calling the AI.
func (a *App) ExplainTerm(term string, context string, catID string) (models.TermExplanation, error) {
	// 1. Check pre-built offline dictionary first
	if offline := services.LookupFitnessTerm(term); offline != nil {
		// Cache it so future calls also hit SQLite (fast path)
		_ = a.userRepo.SaveTermCache(offline, catID)
		return *offline, nil
	}

	// 2. Check SQLite cache
	if cached, ok := a.userRepo.GetTermCache(term); ok {
		return *cached, nil
	}

	// 3. Call AI
	exp, err := a.aiSvc.ExplainTerm(a.ctx, term, context, catID)
	if err != nil {
		return models.TermExplanation{}, err
	}

	// 4. Persist in cache for next time
	_ = a.userRepo.SaveTermCache(exp, catID)
	return *exp, nil
}
