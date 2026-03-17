# ── Stage 1: Build React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build Go web server ──────────────────────────────────────────
FROM golang:1.25-alpine AS server
WORKDIR /app
COPY go.mod go.sum ./
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o fitness-server ./cmd/server

# ── Stage 3: Runtime image ─────────────────────────────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata ffmpeg
WORKDIR /app

COPY --from=server   /app/fitness-server   ./fitness-server
COPY --from=frontend /app/frontend/dist    ./frontend/dist

EXPOSE 8080

CMD ["./fitness-server", "--host=0.0.0.0", "--port=8080", "--frontend=./frontend/dist"]
