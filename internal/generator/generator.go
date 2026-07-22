// Package generator turns the token layer, the shared runtime and the component
// sources into the distributable artefacts: lds.css, lds.js and icons.svg.
//
// The split is deliberate:
//
//   - lds.css carries everything that must live in the light DOM — @font-face
//     declarations, the reset, the :root custom properties and theme blocks, and
//     the layout utilities. Custom properties inherit through shadow boundaries,
//     so this file is also what themes every component.
//   - lds.js carries the custom element definitions. Each component's styles are
//     embedded as a constructable stylesheet adopted into its shadow root, so
//     component CSS is encapsulated and never leaks.
//   - icons.svg is a build-time SVG symbol sprite assembled from assets/icons/.
//     The runtime injects it into the light DOM once so shadow-root <use>
//     references resolve reliably.
package generator

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/js"

	"github.com/lidisoft/design-system/internal/catalog"
	"github.com/lidisoft/design-system/internal/tokens"
)

// Version is stamped into the generated banners and exposed as LDS.version.
const Version = "0.1.0"

// Options configures a build.
type Options struct {
	Root    string // repository root
	OutDir  string // where dist artefacts are written
	Minify  bool   // also emit lds.min.css / lds.min.js
	Version string
}

// Sources is everything a build reads from disk.
type Sources struct {
	Tokens     *tokens.Set
	Components []catalog.Component
	Reset      string
	Utilities  string
	Runtime    string
}

// Result holds the generated artefacts in memory.
type Result struct {
	CSS       string
	JS        string
	Icons     string   // symbol sprite written to dist/icons.svg
	IconNames []string // sorted basenames from assets/icons/
}

// LoadSources reads the token layer, runtime files and component catalog.
func LoadSources(root string) (*Sources, error) {
	set, err := tokens.Load(filepath.Join(root, "tokens"))
	if err != nil {
		return nil, err
	}
	components, err := catalog.Load(filepath.Join(root, "components"))
	if err != nil {
		return nil, err
	}
	reset, err := os.ReadFile(filepath.Join(root, "runtime", "reset.css"))
	if err != nil {
		return nil, fmt.Errorf("generator: %w", err)
	}
	utilities, err := os.ReadFile(filepath.Join(root, "runtime", "utilities.css"))
	if err != nil {
		return nil, fmt.Errorf("generator: %w", err)
	}
	runtime, err := os.ReadFile(filepath.Join(root, "runtime", "base.js"))
	if err != nil {
		return nil, fmt.Errorf("generator: %w", err)
	}
	return &Sources{
		Tokens:     set,
		Components: components,
		Reset:      string(reset),
		Utilities:  string(utilities),
		Runtime:    string(runtime),
	}, nil
}

// Generate produces the CSS and JS bundles (and the icon sprite) without
// touching the filesystem.
func Generate(src *Sources, opts Options) (*Result, error) {
	version := opts.Version
	if version == "" {
		version = Version
	}
	sprite, names, err := BuildIcons(filepath.Join(opts.Root, "assets", "icons"))
	if err != nil {
		return nil, err
	}
	return &Result{
		CSS:       buildCSS(src, version),
		JS:        buildJS(src, version, names),
		Icons:     sprite,
		IconNames: names,
	}, nil
}

// Build generates the bundles and writes them into opts.OutDir, copying any
// vendored fonts alongside so dist/ is self-contained.
func Build(opts Options) (*Result, error) {
	src, err := LoadSources(opts.Root)
	if err != nil {
		return nil, err
	}
	res, err := Generate(src, opts)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(opts.OutDir, 0o755); err != nil {
		return nil, err
	}

	files := map[string]string{
		"lds.css":   res.CSS,
		"lds.js":    res.JS,
		"icons.svg": res.Icons,
	}
	if opts.Minify {
		m := minify.New()
		m.AddFunc("text/css", css.Minify)
		m.AddFunc("application/javascript", js.Minify)

		minCSS, err := m.String("text/css", res.CSS)
		if err != nil {
			return nil, fmt.Errorf("generator: minify css: %w", err)
		}
		minJS, err := m.String("application/javascript", res.JS)
		if err != nil {
			return nil, fmt.Errorf("generator: minify js: %w", err)
		}
		files["lds.min.css"] = minCSS
		files["lds.min.js"] = minJS
	}

	for name, content := range files {
		if err := os.WriteFile(filepath.Join(opts.OutDir, name), []byte(content), 0o644); err != nil {
			return nil, err
		}
	}

	if err := copyFonts(filepath.Join(opts.Root, "assets", "fonts"), filepath.Join(opts.OutDir, "fonts")); err != nil {
		return nil, err
	}
	return res, nil
}

func copyFonts(srcDir, dstDir string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".woff2") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(srcDir, e.Name()))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dstDir, e.Name()), b, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func buildCSS(src *Sources, version string) string {
	var b strings.Builder

	b.WriteString(banner("lds.css", version))
	b.WriteString(src.Reset)
	b.WriteString("\n\n")

	b.WriteString("/* ------------------------------------------------------------------\n")
	b.WriteString(" * Design tokens — generated from tokens/*.toml. Do not edit by hand.\n")
	b.WriteString(" * ------------------------------------------------------------------ */\n")
	b.WriteString(":root {\n")
	lastGroup := ""
	for _, t := range src.Tokens.Tokens {
		if t.Group != lastGroup {
			if lastGroup != "" {
				b.WriteString("\n")
			}
			fmt.Fprintf(&b, "  /* %s */\n", t.Group)
			lastGroup = t.Group
		}
		fmt.Fprintf(&b, "  %s: %s;\n", t.Var, t.Value)
	}
	b.WriteString("}\n")

	for _, theme := range src.Tokens.Themes {
		fmt.Fprintf(&b, "\n/* theme: %s */\n", theme.Name)
		fmt.Fprintf(&b, "%s {\n", theme.Selector)
		for _, t := range theme.Tokens {
			fmt.Fprintf(&b, "  %s: %s;\n", t.Var, t.Value)
		}
		b.WriteString("}\n")
	}

	b.WriteString("\n")
	b.WriteString(src.Utilities)
	return b.String()
}

func buildJS(src *Sources, version string, iconNames []string) string {
	var b strings.Builder

	b.WriteString(banner("lds.js", version))
	b.WriteString("(function (global) {\n")
	b.WriteString("  \"use strict\";\n\n")
	b.WriteString(indent(src.Runtime, "  "))
	b.WriteString("\n")

	// Name list for the build-time icon sprite. Emitted as data so consumers
	// (and lds-icon) can validate without generating per-icon classes.
	fmt.Fprintf(&b, "  LDS.icons = [%s];\n", quoteList(iconNames))

	// Behaviours register before definitions so an element upgrading synchronously
	// on customElements.define already sees its hooks.
	for _, c := range src.Components {
		if strings.TrimSpace(c.Behavior) == "" {
			continue
		}
		// Each behaviour gets its own closure so helper functions declared at the
		// top level of a component's .js file cannot collide across components.
		fmt.Fprintf(&b, "\n  /* behaviour: %s */\n", c.Tag)
		b.WriteString("  (function () {\n")
		b.WriteString(indent(c.Behavior, "    "))
		b.WriteString("  })();\n")
	}

	for _, c := range src.Components {
		fmt.Fprintf(&b, "\n  /* component: %s (%s) */\n", c.Tag, c.Status)
		b.WriteString("  LDS.define({\n")
		fmt.Fprintf(&b, "    tag: %q,\n", c.Tag)
		fmt.Fprintf(&b, "    className: %q,\n", c.ClassName())
		fmt.Fprintf(&b, "    observed: [%s],\n", quoteList(c.Observed()))
		fmt.Fprintf(&b, "    defaults: {%s},\n", defaultsLiteral(c))
		fmt.Fprintf(&b, "    template: `%s`,\n", backtick(strings.TrimSpace(c.Template)))
		fmt.Fprintf(&b, "    styles: `%s`,\n", backtick(strings.TrimSpace(c.Styles)))
		b.WriteString("  });\n")
	}

	fmt.Fprintf(&b, "\n  LDS.version = %q;\n", version)
	b.WriteString("  global.LDS = LDS;\n")
	b.WriteString("})(typeof globalThis !== \"undefined\" ? globalThis : window);\n")
	return b.String()
}

func banner(file, version string) string {
	return fmt.Sprintf(`/*!
 * LiDiSoft Design System — %s
 * version %s · generated %s
 *
 * GENERATED FILE — DO NOT EDIT.
 * Regenerate with: make build   (see docs/architecture.md)
 */
`, file, version, time.Now().UTC().Format("2006-01-02"))
}

func defaultsLiteral(c catalog.Component) string {
	var parts []string
	for _, a := range c.Attributes {
		if a.Default == "" {
			continue
		}
		parts = append(parts, fmt.Sprintf("%q: %q", a.Name, a.Default))
	}
	return strings.Join(parts, ", ")
}

func quoteList(items []string) string {
	out := make([]string, len(items))
	for i, s := range items {
		out[i] = fmt.Sprintf("%q", s)
	}
	return strings.Join(out, ", ")
}

// backtick escapes a string for embedding in a JS template literal.
func backtick(s string) string {
	r := strings.NewReplacer(
		"\\", "\\\\",
		"`", "\\`",
		"${", "\\${",
	)
	return r.Replace(s)
}

func indent(s, prefix string) string {
	lines := strings.Split(strings.TrimRight(s, "\n"), "\n")
	for i, l := range lines {
		if strings.TrimSpace(l) == "" {
			continue
		}
		lines[i] = prefix + l
	}
	return strings.Join(lines, "\n") + "\n"
}
