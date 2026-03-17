package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

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

var DB *sql.DB

// DataDir returns the app data directory for the app.
func DataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "FitnessLibrary")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

// Open initializes the SQLite database and runs migrations.
func Open() (*sql.DB, error) {
	dataDir, err := DataDir()
	if err != nil {
		return nil, fmt.Errorf("data dir: %w", err)
	}

	dbPath := filepath.Join(dataDir, "fitness.db")
	db, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// SQLite supports one writer at a time; WAL allows concurrent readers.
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	DB = db
	return db, nil
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
	}
	return nil
}

// ThumbnailDir returns the thumbnails directory path (inside data dir).
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
