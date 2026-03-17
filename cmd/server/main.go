package main

import (
	"flag"
	"fmt"
	"log"

	"fitness-library/internal/server"
)

func main() {
	host     := flag.String("host", "0.0.0.0", "Listen host")
	port     := flag.Int("port", 8080, "Listen port")
	frontend := flag.String("frontend", "./frontend/dist", "Path to React build output")
	flag.Parse()

	srv, err := server.New(*frontend)
	if err != nil {
		log.Fatalf("init: %v", err)
	}

	addr := fmt.Sprintf("%s:%d", *host, *port)
	log.Printf("Fitness Library — web server on http://%s", addr)
	if err := srv.Start(addr); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
