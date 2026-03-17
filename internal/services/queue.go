package services

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"fitness-library/internal/models"
	"fitness-library/internal/repository"
)

// EventEmitter is a function that broadcasts a named event with optional data.
// In Wails desktop mode this wraps runtime.EventsEmit; in web-server mode it is a no-op.
type EventEmitter func(event string, data interface{})

type QueueService struct {
	ctx         context.Context
	queueRepo   *repository.QueueRepo
	docRepo     *repository.DocumentRepo
	thumbSvc    *ThumbnailService
	aiSvc       *AIService
	settingsGet func(key string) string
	emit        EventEmitter

	mu      sync.Mutex
	running bool
	paused  bool

	pauseCh  chan struct{}
	resumeCh chan struct{}
	stopCh   chan struct{}
}

func NewQueueService(
	queueRepo *repository.QueueRepo,
	docRepo *repository.DocumentRepo,
	thumbSvc *ThumbnailService,
	aiSvc *AIService,
	settingsGet func(key string) string,
) *QueueService {
	return &QueueService{
		queueRepo:   queueRepo,
		docRepo:     docRepo,
		thumbSvc:    thumbSvc,
		aiSvc:       aiSvc,
		settingsGet: settingsGet,
		emit:        func(string, interface{}) {}, // no-op default
		pauseCh:     make(chan struct{}, 1),
		resumeCh:    make(chan struct{}, 1),
		stopCh:      make(chan struct{}, 1),
	}
}

// SetEventEmitter injects the event emitter.  Called by Wails startup to wire
// in runtime.EventsEmit; the web server leaves the default no-op in place.
func (qs *QueueService) SetEventEmitter(fn EventEmitter) {
	qs.emit = fn
}

func (qs *QueueService) SetContext(ctx context.Context) {
	qs.ctx = ctx
}

func (qs *QueueService) Start() error {
	qs.mu.Lock()
	if qs.running {
		qs.mu.Unlock()
		return nil
	}
	qs.running = true
	qs.paused = false
	qs.stopCh = make(chan struct{}, 1)
	qs.mu.Unlock()

	go qs.worker()
	return nil
}

func (qs *QueueService) Pause() error {
	qs.mu.Lock()
	defer qs.mu.Unlock()
	if !qs.running || qs.paused {
		return nil
	}
	qs.paused = true
	select {
	case qs.pauseCh <- struct{}{}:
	default:
	}
	return nil
}

func (qs *QueueService) Resume() error {
	qs.mu.Lock()
	defer qs.mu.Unlock()
	if !qs.paused {
		return nil
	}
	qs.paused = false
	select {
	case qs.resumeCh <- struct{}{}:
	default:
	}
	return nil
}

func (qs *QueueService) IsRunning() bool {
	qs.mu.Lock()
	defer qs.mu.Unlock()
	return qs.running
}

func (qs *QueueService) IsPaused() bool {
	qs.mu.Lock()
	defer qs.mu.Unlock()
	return qs.paused
}

func (qs *QueueService) worker() {
	defer func() {
		qs.mu.Lock()
		qs.running = false
		qs.mu.Unlock()
	}()

	items, err := qs.queueRepo.GetPendingItems()
	if err != nil || len(items) == 0 {
		qs.emitEvent("queue:complete", nil)
		return
	}

	for _, item := range items {
		// Check stop
		select {
		case <-qs.stopCh:
			return
		default:
		}

		// Check pause
		qs.mu.Lock()
		paused := qs.paused
		qs.mu.Unlock()
		if paused {
			<-qs.resumeCh
		}

		qs.processItem(item)
	}

	qs.emitEvent("queue:complete", nil)
}

func (qs *QueueService) processItem(item models.ImportQueueItem) {
	ctx := qs.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	// Mark processing
	qs.queueRepo.UpdateStatus(item.ID, "processing", "")
	qs.emitEvent("queue:progress", models.QueueProgressPayload{
		ID: item.ID, Status: "processing", Progress: 10,
	})

	fileType := inferDocType(item.FilePath)

	// Extract text
	text, _ := ExtractText(item.FilePath, fileType, 4000)
	qs.emitEvent("queue:progress", models.QueueProgressPayload{
		ID: item.ID, Status: "processing", Progress: 30,
	})

	// Create document
	title := strings.TrimSuffix(filepath.Base(item.FilePath), filepath.Ext(item.FilePath))
	catID := item.CatID
	if catID == "" {
		catID = "cat-workout" // fallback default
	}
	input := models.CreateDocumentInput{
		Title:    title,
		Type:     fileType,
		CatID:    catID,
		FilePath: item.FilePath,
		Content:  text,
		Tags:     []string{},
	}

	doc, err := qs.docRepo.CreateDocument(input)
	if err != nil {
		qs.queueRepo.UpdateStatus(item.ID, "error", err.Error())
		qs.emitEvent("queue:progress", models.QueueProgressPayload{
			ID: item.ID, Status: "error", Error: err.Error(),
		})
		return
	}
	qs.emitEvent("queue:progress", models.QueueProgressPayload{
		ID: item.ID, Status: "processing", Progress: 60,
	})

	// Generate thumbnail
	thumbPath, _ := qs.thumbSvc.GenerateThumbnail(doc.ID, item.FilePath, fileType)
	if thumbPath != "" {
		qs.docRepo.UpdateDocument(doc.ID, models.UpdateDocumentInput{CoverPath: &thumbPath})
	}
	qs.emitEvent("queue:progress", models.QueueProgressPayload{
		ID: item.ID, Status: "processing", Progress: 80,
	})

	// Run AI pipeline (async, non-blocking) if enabled
	autoTag := qs.settingsGet("ai.auto_tag")
	if autoTag == "true" && text != "" {
		go func(docID, docTitle, docText string) {
			result, err := qs.aiSvc.ProcessDocument(ctx, docID, docTitle, docText)
			if err == nil && result != nil {
				qs.docRepo.UpdateAIFields(docID, result.Tags, result.Summary, result.ReadTime)
				qs.emitEvent("ai:done:"+docID, result)
			}
		}(doc.ID, doc.Title, text)
	}

	// Mark done
	qs.queueRepo.UpdateStatus(item.ID, "done", "")
	qs.emitEvent("queue:done", models.QueueProgressPayload{
		ID: item.ID, Status: "done", Progress: 100, DocID: doc.ID,
	})

	// Small delay to not overwhelm the system
	time.Sleep(100 * time.Millisecond)
}

func (qs *QueueService) emitEvent(name string, data interface{}) {
	if qs.emit != nil {
		qs.emit(name, data)
	}
}

func inferDocType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".pdf":
		return "pdf"
	case ".mp4", ".mkv", ".avi", ".mov":
		return "video"
	case ".md", ".markdown", ".html", ".htm", ".docx", ".doc":
		return "article"
	case ".txt":
		return "note"
	default:
		return "note"
	}
}
