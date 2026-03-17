package main

import (
	"embed"

	"fitness-library/internal/services"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "Fitness Library by Vũ Hải",
		Width:            1280,
		Height:           800,
		MinWidth:         900,
		MinHeight:        600,
		Frameless:        true,
		BackgroundColour: &options.RGBA{R: 13, G: 26, B: 15, A: 255}, // #0D1A0F
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: services.NewLocalFileHandler(),
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			IsZoomControlEnabled:              false,
			EnableSwipeGestures:               false,
			WebviewUserDataPath:               "",
			WebviewBrowserPath:                "",
			Theme:                             windows.Dark,
			CustomTheme:                       nil,
			ResizeDebounceMS:                  0,
			OnSuspend:                         nil,
			OnResume:                          nil,
			DisablePinchZoom:                  true,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
