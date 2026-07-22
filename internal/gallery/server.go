// Package gallery serves the development workbench: a browsable catalog of every
// component, its stories, its public API and the resolved token layer.
//
// In dev mode the bundles are regenerated on every request. That means editing a
// .css, .html or .toml file needs nothing more than a browser refresh — Air only
// has to restart the process when Go code changes.
package gallery

import (
	"embed"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
	"sync"

	"github.com/lidisoft/design-system/internal/catalog"
	"github.com/lidisoft/design-system/internal/generator"
	"github.com/lidisoft/design-system/internal/tokens"
)

//go:embed templates/*.html static/*
var assets embed.FS

// Server renders the gallery.
type Server struct {
	root string
	dev  bool

	mu     sync.RWMutex
	cached *build

	pages map[string]*template.Template
}

type build struct {
	sources *generator.Sources
	result  *generator.Result
}

// New constructs a gallery server rooted at the repository directory.
func New(root string, dev bool) (*Server, error) {
	s := &Server{root: root, dev: dev, pages: map[string]*template.Template{}}
	for _, page := range []string{"index.html", "tokens.html", "component.html"} {
		tpl, err := template.New("layout.html").Funcs(funcMap).ParseFS(assets, "templates/layout.html", "templates/"+page)
		if err != nil {
			return nil, fmt.Errorf("gallery: parse %s: %w", page, err)
		}
		s.pages[page] = tpl
	}
	if _, err := s.build(); err != nil {
		return nil, err
	}
	return s, nil
}

// build returns the current bundle, regenerating it when in dev mode.
func (s *Server) build() (*build, error) {
	s.mu.RLock()
	cached := s.cached
	s.mu.RUnlock()
	if cached != nil && !s.dev {
		return cached, nil
	}

	src, err := generator.LoadSources(s.root)
	if err != nil {
		return nil, err
	}
	res, err := generator.Generate(src, generator.Options{Root: s.root})
	if err != nil {
		return nil, err
	}
	b := &build{sources: src, result: res}

	s.mu.Lock()
	s.cached = b
	s.mu.Unlock()
	return b, nil
}

// Handler returns the routed gallery.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /{$}", s.handleIndex)
	mux.HandleFunc("GET /tokens", s.handleTokens)
	mux.HandleFunc("GET /components/{tag}", s.handleComponent)
	mux.HandleFunc("GET /dist/lds.css", s.serveBundle("text/css; charset=utf-8", func(r *generator.Result) string { return r.CSS }))
	mux.HandleFunc("GET /dist/lds.js", s.serveBundle("application/javascript; charset=utf-8", func(r *generator.Result) string { return r.JS }))
	mux.HandleFunc("GET /dist/icons.svg", s.serveBundle("image/svg+xml; charset=utf-8", func(r *generator.Result) string { return r.Icons }))
	mux.Handle("GET /dist/fonts/", http.StripPrefix("/dist/fonts/", http.FileServer(http.Dir(filepath.Join(s.root, "assets", "fonts")))))
	mux.Handle("GET /_gallery/", http.StripPrefix("/_gallery/", http.FileServer(http.FS(mustSub()))))

	return mux
}

type pageData struct {
	Title     string
	Active    string
	Version   string
	Dev       bool
	Nav       []catalog.CategoryGroup
	Tokens    *tokens.Set
	Component *catalog.Component
	Stories   []storyView
	Sources   map[string]string
}

type storyView struct {
	Name        string
	Description string
	Markup      template.HTML
	Source      string
}

func (s *Server) page(w http.ResponseWriter, name string, data pageData) {
	tpl, ok := s.pages[name]
	if !ok {
		http.Error(w, "unknown page", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if s.dev {
		w.Header().Set("Cache-Control", "no-store")
	}
	if err := tpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *Server) base(b *build) pageData {
	return pageData{
		Version: generator.Version,
		Dev:     s.dev,
		Nav:     catalog.ByCategory(b.sources.Components),
		Tokens:  b.sources.Tokens,
	}
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	b, err := s.build()
	if err != nil {
		s.fail(w, err)
		return
	}
	data := s.base(b)
	data.Title = "Overview"
	data.Active = "overview"
	s.page(w, "index.html", data)
}

func (s *Server) handleTokens(w http.ResponseWriter, r *http.Request) {
	b, err := s.build()
	if err != nil {
		s.fail(w, err)
		return
	}
	data := s.base(b)
	data.Title = "Tokens"
	data.Active = "tokens"
	s.page(w, "tokens.html", data)
}

func (s *Server) handleComponent(w http.ResponseWriter, r *http.Request) {
	b, err := s.build()
	if err != nil {
		s.fail(w, err)
		return
	}
	tag := r.PathValue("tag")

	var found *catalog.Component
	for i := range b.sources.Components {
		if b.sources.Components[i].Tag == tag {
			found = &b.sources.Components[i]
			break
		}
	}
	if found == nil {
		http.NotFound(w, r)
		return
	}

	data := s.base(b)
	data.Title = found.Name
	data.Active = tag
	data.Component = found
	for _, st := range found.Stories {
		markup := strings.TrimSpace(st.HTML)
		data.Stories = append(data.Stories, storyView{
			Name:        st.Name,
			Description: st.Description,
			Markup:      template.HTML(markup), //nolint:gosec // authored in-repo, not user input
			Source:      markup,
		})
	}
	data.Sources = map[string]string{
		"template": strings.TrimSpace(found.Template),
		"styles":   strings.TrimSpace(found.Styles),
		"behavior": strings.TrimSpace(found.Behavior),
	}
	s.page(w, "component.html", data)
}

func (s *Server) serveBundle(contentType string, pick func(*generator.Result) string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		b, err := s.build()
		if err != nil {
			s.fail(w, err)
			return
		}
		w.Header().Set("Content-Type", contentType)
		if s.dev {
			w.Header().Set("Cache-Control", "no-store")
		}
		fmt.Fprint(w, pick(b.result))
	}
}

// fail renders build errors into the browser so a broken token reference shows
// up on refresh instead of only in the terminal.
func (s *Server) fail(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, `<!doctype html><meta charset="utf-8">
<title>LDS build error</title>
<body style="font:14px/1.6 ui-monospace,monospace;padding:2rem;background:#12151d;color:#f56f5c">
<h1 style="font-size:1rem;letter-spacing:.14em;text-transform:uppercase">Build error</h1>
<pre style="white-space:pre-wrap">%s</pre>
</body>`, template.HTMLEscapeString(err.Error()))
}

// mustSub exposes static/ at the root of the /_gallery/ route.
func mustSub() fs.FS {
	sub, err := fs.Sub(assets, "static")
	if err != nil {
		panic(err)
	}
	return sub
}

var funcMap = template.FuncMap{
	"title": func(s string) string {
		if s == "" {
			return s
		}
		return strings.ToUpper(s[:1]) + s[1:]
	},
	"isColor": func(t tokens.Token) bool {
		v := strings.TrimSpace(t.Value)
		return strings.HasPrefix(v, "#") || strings.HasPrefix(v, "rgb") || strings.HasPrefix(v, "hsl")
	},
	"inGroup": func(set *tokens.Set, group string) []tokens.Token { return set.InGroup(group) },
	"slotName": func(name string) string {
		if name == "" {
			return "(default)"
		}
		return name
	},
	"defaultOr": func(s string) string {
		if s == "" {
			return "—"
		}
		return s
	},
	"joinValues": func(values []string) string {
		if len(values) == 0 {
			return "—"
		}
		return strings.Join(values, " · ")
	},
}
