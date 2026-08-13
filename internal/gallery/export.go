package gallery

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
)

// Export renders every gallery route to static files under outDir, suitable
// for serving from a static host such as GitHub Pages.
//
// base is a URL path prefix applied to every internal link and asset
// reference, e.g. "/design-system" when the site is published as a project
// page under a subpath. Pass "" to serve from the root of its own domain.
func Export(root, outDir, base string) error {
	s, err := New(root, false)
	if err != nil {
		return err
	}
	s.basePath = base

	b, err := s.build()
	if err != nil {
		return err
	}

	if err := os.RemoveAll(outDir); err != nil {
		return err
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	type route struct{ path, file string }
	routes := []route{
		{"/", "index.html"},
		{"/tokens", filepath.Join("tokens", "index.html")},
		{"/dist/lds.css", filepath.Join("dist", "lds.css")},
		{"/dist/lds.js", filepath.Join("dist", "lds.js")},
		{"/dist/icons.svg", filepath.Join("dist", "icons.svg")},
		{"/_gallery/gallery.css", filepath.Join("_gallery", "gallery.css")},
	}
	for _, c := range b.sources.Components {
		routes = append(routes, route{
			path: "/components/" + c.Tag,
			file: filepath.Join("components", c.Tag, "index.html"),
		})
	}

	handler := s.Handler()
	for _, r := range routes {
		if err := writeRoute(handler, outDir, r.path, r.file); err != nil {
			return fmt.Errorf("gallery: export %s: %w", r.path, err)
		}
	}

	if err := copyFonts(root, outDir); err != nil {
		return fmt.Errorf("gallery: export fonts: %w", err)
	}

	return nil
}

func writeRoute(handler http.Handler, outDir, path, file string) error {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		return fmt.Errorf("status %d", rec.Code)
	}

	dest := filepath.Join(outDir, file)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dest, rec.Body.Bytes(), 0o644)
}

// copyFonts mirrors assets/fonts into outDir/dist/fonts, matching the
// /dist/fonts/ route the dev server serves straight off disk.
func copyFonts(root, outDir string) error {
	src := filepath.Join(root, "assets", "fonts")
	entries, err := os.ReadDir(src)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	dst := filepath.Join(outDir, "dist", "fonts")
	if err := os.MkdirAll(dst, 0o755); err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(src, e.Name()))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dst, e.Name()), data, 0o644); err != nil {
			return err
		}
	}
	return nil
}
