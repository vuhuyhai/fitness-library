package repository

import (
	"database/sql"
)

type SettingsRepo struct {
	db *sql.DB
}

func NewSettingsRepo(db *sql.DB) *SettingsRepo {
	return &SettingsRepo{db: db}
}

func (r *SettingsRepo) GetAll() (map[string]string, error) {
	rows, err := r.db.Query("SELECT key, COALESCE(value,'') FROM settings")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := map[string]string{}
	for rows.Next() {
		var k, v string
		rows.Scan(&k, &v)
		result[k] = v
	}
	return result, rows.Err()
}

func (r *SettingsRepo) Save(settings map[string]string) error {
	for k, v := range settings {
		_, err := r.db.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", k, v)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *SettingsRepo) Get(key string) string {
	var v string
	r.db.QueryRow("SELECT COALESCE(value,'') FROM settings WHERE key=?", key).Scan(&v)
	return v
}

func (r *SettingsRepo) Set(key, value string) error {
	_, err := r.db.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", key, value)
	return err
}
