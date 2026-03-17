# Fitness Library — Build Makefile
# Requires GNU Make (install: choco install make  OR use Git Bash)
#
# Usage:
#   make build-windows          Windows .exe + NSIS installer
#   make build-windows-quick    Windows .exe only (no installer, faster)
#   make build-linux            Linux ELF binary
#   make build-all              Windows + Linux (macOS requires a Mac)
#   make clean                  Remove build/bin and frontend/dist

WAILS   := C:/Users/ASUS/go/bin/wails.exe
GO      := C:/Program Files/Go/bin/go.exe
LDFLAGS := -s -w

.PHONY: check-env build-windows build-windows-quick build-mac build-linux build-all release clean

check-env:
	@echo "--- Go ---"
	@"$(GO)" version
	@echo "--- Wails ---"
	@"$(WAILS)" version
	@echo "--- Node ---"
	@node --version

# ── Windows (amd64) ─────────────────────────────────────────────────────────
# Output: build/bin/FitnessLibrary.exe + build/bin/FitnessLibrary-amd64-installer.exe
build-windows:
	"$(WAILS)" build -platform windows/amd64 -ldflags "$(LDFLAGS)" -nsis -clean

# Output: build/bin/FitnessLibrary.exe (no installer)
build-windows-quick:
	"$(WAILS)" build -platform windows/amd64 -ldflags "$(LDFLAGS)" -clean

# ── macOS universal (Intel + Apple Silicon) ─────────────────────────────────
# MUST be run on a macOS machine (requires Xcode Command Line Tools + CGO)
# Output: build/bin/FitnessLibrary.app
build-mac:
	"$(WAILS)" build -platform darwin/universal -ldflags "$(LDFLAGS)" -clean

# ── Linux (amd64) ───────────────────────────────────────────────────────────
# Output: build/bin/FitnessLibrary
build-linux:
	"$(WAILS)" build -platform linux/amd64 -ldflags "$(LDFLAGS)" -clean

# ── All supported from Windows ───────────────────────────────────────────────
build-all: build-windows build-linux
	@echo "==> macOS must be built separately on a Mac"

release: build-all
	@echo "==> Release artifacts in build/bin/"

clean:
	-rmdir /s /q "build\bin"
	-rmdir /s /q "frontend\dist"

# ── Web server (deploy to VPS) ───────────────────────────────────────────────
# Builds the React SPA + Go HTTP server binary for Linux amd64.
# Output: fitness-server  (copy together with frontend/dist/ to the VPS)

build-web-frontend:
	cd frontend && npm ci && npm run build

build-web-server:
	set GOOS=linux&& set GOARCH=amd64&& "$(GO)" build -ldflags "$(LDFLAGS)" -o fitness-server ./cmd/server

## Full web build (frontend + server)
build-web: build-web-frontend build-web-server
	@echo "==> Web build ready: fitness-server + frontend/dist/"
	@echo "==> Upload both to your VPS and run:"
	@echo "    ./fitness-server --frontend ./frontend/dist --port 8080"
