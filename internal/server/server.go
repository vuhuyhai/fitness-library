package server

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"fitness-library/internal/db"
	"fitness-library/internal/repository"
	"fitness-library/internal/services"

	"golang.org/x/crypto/bcrypt"
)

// Server holds all dependencies for the HTTP web server.
type Server struct {
	docRepo      *repository.DocumentRepo
	catRepo      *repository.CategoryRepo
	queueRepo    *repository.QueueRepo
	settingsRepo *repository.SettingsRepo
	userRepo     *repository.UserRepo

	thumbSvc *services.ThumbnailService
	aiSvc    *services.AIService
	queueSvc *services.QueueService

	dataDir     string
	uploadDir   string
	frontendDir string
	jwtSecret   string
	ctx         context.Context
}

// New initialises the server and all its dependencies.
func New(frontendDir string) (*Server, error) {
	database, err := db.Open()
	if err != nil {
		return nil, fmt.Errorf("db: %w", err)
	}

	dataDir, err := db.DataDir()
	if err != nil {
		return nil, fmt.Errorf("dataDir: %w", err)
	}

	thumbDir, _ := db.ThumbnailDir()
	uploadDir := filepath.Join(dataDir, "uploads")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("upload dir: %w", err)
	}

	settingsRepo := repository.NewSettingsRepo(database)
	docRepo      := repository.NewDocumentRepo(database)
	catRepo      := repository.NewCategoryRepo(database)
	queueRepo    := repository.NewQueueRepo(database)
	userRepo     := repository.NewUserRepo(database)

	thumbSvc := services.NewThumbnailService(thumbDir, settingsRepo.Get("ffmpeg.path"))
	aiSvc    := services.NewAIService(settingsRepo.Get)
	ctx      := context.Background()

	queueSvc := services.NewQueueService(queueRepo, docRepo, thumbSvc, aiSvc, settingsRepo.Get)
	queueSvc.SetContext(ctx)
	// No event emitter needed — web clients poll for queue status

	// Set default admin password on first run
	if settingsRepo.Get("admin.password_hash") == "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte("fitnesslibrary@123"), bcrypt.DefaultCost)
		settingsRepo.Save(map[string]string{"admin.password_hash": string(hash)}) //nolint:errcheck
		log.Println("[!] Admin password: fitnesslibrary@123  — change it in Cài Đặt → Mật Khẩu Admin")
	}

	// Ensure JWT secret exists
	jwtSecret := settingsRepo.Get("jwt.secret")
	if jwtSecret == "" {
		b := make([]byte, 32)
		rand.Read(b) //nolint:errcheck
		jwtSecret = hex.EncodeToString(b)
		settingsRepo.Save(map[string]string{"jwt.secret": jwtSecret}) //nolint:errcheck
	}

	return &Server{
		docRepo:      docRepo,
		catRepo:      catRepo,
		queueRepo:    queueRepo,
		settingsRepo: settingsRepo,
		userRepo:     userRepo,
		thumbSvc:     thumbSvc,
		aiSvc:        aiSvc,
		queueSvc:     queueSvc,
		dataDir:      dataDir,
		uploadDir:    uploadDir,
		frontendDir:  frontendDir,
		jwtSecret:    jwtSecret,
		ctx:          ctx,
	}, nil
}

// Start binds and serves HTTP.
func (s *Server) Start(addr string) error {
	mux := s.setupRoutes()
	return http.ListenAndServe(addr, mux)
}
