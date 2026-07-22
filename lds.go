// Package lds embeds the generated design system bundles so Go services can
// serve them without a separate asset pipeline or a CDN.
//
//	import lds "github.com/lidisoft/design-system"
//
//	mux.Handle("GET /lds/", lds.Handler("/lds/"))
//
// The embedded files are the committed contents of dist/. They are regenerated
// by `make build`; CI fails if the committed output is stale, so importing this
// package always gets bundles that match the sources in the same commit.
package lds

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed dist
var embedded embed.FS

// FS returns the dist directory rooted at its contents, so paths look like
// "lds.css", "lds.min.js", "icons.svg" and "fonts/Inter-Variable.woff2".
func FS() fs.FS {
	sub, err := fs.Sub(embedded, "dist")
	if err != nil {
		// Unreachable: the embed directive guarantees dist/ exists.
		panic(err)
	}
	return sub
}

// Handler serves the bundles under prefix, which must match the pattern the
// handler is mounted on so lds.css resolves fonts/ and lds.js resolves
// icons.svg relative to themselves.
func Handler(prefix string) http.Handler {
	return http.StripPrefix(prefix, http.FileServer(http.FS(FS())))
}

// Read returns one embedded file, e.g. Read("lds.css"). Useful for inlining the
// stylesheet into a server-rendered document to avoid a second round trip.
func Read(name string) ([]byte, error) {
	return fs.ReadFile(FS(), name)
}
