package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// isBenignMigrationError returns true for errors that are safe to ignore,
// such as "duplicate column name" from idempotent ALTER TABLE statements.
func isBenignMigrationError(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate column name") ||
		strings.Contains(msg, "already exists")
}

//go:embed migrations/*.sql
var migrationsFS embed.FS

// DB is the global database handle, set by Open().
var DB *sql.DB

// currentDBPath is set in Open() so BackupNow() can reference it.
var currentDBPath string

// DataDir returns the app data directory.
//
// Priority order:
//  1. FITNESS_LIBRARY_DATA_DIR environment variable (use this for Railway Volume mounts)
//  2. OS user config dir + "FitnessLibrary"  (standard for desktop apps)
//
// Railway usage:
//
//	Set env var FITNESS_LIBRARY_DATA_DIR=/data and mount a Volume at /data.
//	All data (SQLite, thumbnails, uploads) will survive container restarts.
func DataDir() (string, error) {
	if envDir := os.Getenv("FITNESS_LIBRARY_DATA_DIR"); envDir != "" {
		if err := os.MkdirAll(envDir, 0o755); err != nil {
			return "", fmt.Errorf("create data dir from env: %w", err)
		}
		return envDir, nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		// Fallback to home dir
		configDir, err = os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("cannot determine config dir: %w", err)
		}
	}
	dir := filepath.Join(configDir, "FitnessLibrary")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

// Open initializes the SQLite database and runs migrations.
// It automatically backs up the database before applying new migrations.
func Open() (*sql.DB, error) {
	dataDir, err := DataDir()
	if err != nil {
		return nil, fmt.Errorf("data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "fitness.db")
	currentDBPath = dbPath

	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// SQLite supports one writer at a time; WAL allows concurrent readers.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	// Back up before running new migrations (non-fatal if backup fails)
	if pending, _ := countPendingMigrations(db); pending > 0 {
		log.Printf("[db] %d new migration(s) pending — creating backup first", pending)
		backupPath, err := backupDB(db, dbPath, dataDir)
		if err != nil {
			log.Printf("[db] backup warning (non-fatal): %v", err)
		} else {
			log.Printf("[db] backup created: %s", backupPath)
		}
	}

	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	DB = db
	return db, nil
}

// countPendingMigrations returns how many migrations have not yet been applied.
func countPendingMigrations(db *sql.DB) (int, error) {
	// Ensure tracking table exists before querying it
	db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations ( //nolint:errcheck
		name TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`)

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return 0, err
	}

	var pending int
	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		var count int
		db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE name = ?", name).Scan(&count) //nolint:errcheck
		if count == 0 {
			pending++
		}
	}
	return pending, nil
}

// backupDB creates a timestamped copy of the SQLite database.
// Returns the path of the created backup file.
func backupDB(db *sql.DB, dbPath, dataDir string) (string, error) {
	backupDir := filepath.Join(dataDir, "backups")
	if err := os.MkdirAll(backupDir, 0o755); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	backupPath := filepath.Join(backupDir, fmt.Sprintf("fitness_backup_%s.db", timestamp))

	// Try SQLite VACUUM INTO (creates a clean, defragmented backup)
	if _, err := db.Exec(fmt.Sprintf("VACUUM INTO '%s'", backupPath)); err == nil {
		cleanOldBackups(backupDir, 5)
		return backupPath, nil
	}

	// Fallback: raw file copy
	if err := copyFileTo(dbPath, backupPath); err != nil {
		return "", fmt.Errorf("backup copy: %w", err)
	}
	cleanOldBackups(backupDir, 5)
	return backupPath, nil
}

// BackupNow creates a manual backup of the current database.
// Called by the admin settings page.
func BackupNow() (string, error) {
	if DB == nil || currentDBPath == "" {
		return "", fmt.Errorf("database not initialised")
	}
	dataDir := filepath.Dir(currentDBPath)
	return backupDB(DB, currentDBPath, dataDir)
}

// cleanOldBackups deletes the oldest backup files, keeping at most maxKeep.
func cleanOldBackups(backupDir string, maxKeep int) {
	files, err := filepath.Glob(filepath.Join(backupDir, "fitness_backup_*.db"))
	if err != nil || len(files) <= maxKeep {
		return
	}
	sort.Strings(files) // lexicographic = chronological (YYYYMMDD_HHMMSS)
	for _, f := range files[:len(files)-maxKeep] {
		os.Remove(f) //nolint:errcheck
	}
}

// copyFileTo copies src to dst using io.Copy.
func copyFileTo(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

// runMigrations reads *.up.sql files from the embedded FS and runs each only once,
// tracked by a schema_migrations table.
func runMigrations(db *sql.DB) error {
	// Ensure migration tracking table exists
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return err
	}

	// Sort by filename for deterministic order
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}

		// Skip if already applied
		var count int
		db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE name = ?", name).Scan(&count) //nolint:errcheck
		if count > 0 {
			continue
		}

		data, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if _, err := db.Exec(string(data)); err != nil {
			// Tolerate benign errors (duplicate column, already exists)
			// but still mark migration as applied so it won't retry.
			if !isBenignMigrationError(err) {
				return fmt.Errorf("migration %s: %w", name, err)
			}
		}

		// Mark as applied
		db.Exec("INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)", name) //nolint:errcheck
		log.Printf("[db] applied migration: %s", name)
	}
	return nil
}

// ThumbnailDir returns (and creates) the thumbnails directory inside the data dir.
func ThumbnailDir() (string, error) {
	dataDir, err := DataDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(dataDir, "thumbnails")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

// UploadDir returns (and creates) the uploads directory inside the data dir.
func UploadDir() (string, error) {
	dataDir, err := DataDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(dataDir, "uploads")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

// DirStats returns the number of files and total byte size under root.
func DirStats(root string) (count int, bytes int64) {
	filepath.Walk(root, func(_ string, info os.FileInfo, err error) error { //nolint:errcheck
		if err != nil || info.IsDir() {
			return nil
		}
		count++
		bytes += info.Size()
		return nil
	})
	return
}

// SchemaVersion returns the highest applied migration number.
func SchemaVersion() int {
	if DB == nil {
		return 0
	}
	var n int
	DB.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&n) //nolint:errcheck
	return n
}
