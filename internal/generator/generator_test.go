package generator

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/tdewolff/minify/v2"
	"github.com/tdewolff/minify/v2/css"
	"github.com/tdewolff/minify/v2/js"
)

// repoRoot walks up from this file to the module root.
func repoRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate test file")
	}
	return filepath.Join(filepath.Dir(file), "..", "..")
}

func generate(t *testing.T) *Result {
	t.Helper()
	src, err := LoadSources(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	res, err := Generate(src, Options{Root: repoRoot(t)})
	if err != nil {
		t.Fatal(err)
	}
	return res
}

// The real repository must always generate parseable output. Running the
// bundles through the minifier's parsers is a genuine syntax check, which is
// what lets this project ship JavaScript without a Node toolchain.
func TestGeneratedBundlesParse(t *testing.T) {
	res := generate(t)

	m := minify.New()
	m.AddFunc("text/css", css.Minify)
	m.AddFunc("application/javascript", js.Minify)

	if _, err := m.String("text/css", res.CSS); err != nil {
		t.Errorf("generated CSS does not parse: %v", err)
	}
	if _, err := m.String("application/javascript", res.JS); err != nil {
		t.Errorf("generated JS does not parse: %v", err)
	}
}

func TestCSSContainsTokensAndThemes(t *testing.T) {
	res := generate(t)

	for _, want := range []string{
		":root {",
		"--lds-color-accent-default:",
		"--lds-control-height-md:",
		`[data-lds-theme="dark"] {`,
		".lds-stack",
		"@font-face",
	} {
		if !strings.Contains(res.CSS, want) {
			t.Errorf("CSS missing %q", want)
		}
	}
}

func TestJSDefinesEveryComponent(t *testing.T) {
	src, err := LoadSources(repoRoot(t))
	if err != nil {
		t.Fatal(err)
	}
	res, err := Generate(src, Options{Root: repoRoot(t)})
	if err != nil {
		t.Fatal(err)
	}

	if len(src.Components) == 0 {
		t.Fatal("no components discovered")
	}
	for _, c := range src.Components {
		if !strings.Contains(res.JS, `tag: "`+c.Tag+`"`) {
			t.Errorf("JS missing definition for %s", c.Tag)
		}
	}
}

// Behaviours must be registered before the matching define(), otherwise an
// element upgrading synchronously would connect without its hooks.
func TestBehaviorsPrecedeDefinitions(t *testing.T) {
	res := generate(t)

	// Anchor on the section markers the generator emits, not on the call syntax:
	// the runtime's own doc comments mention both APIs.
	firstBehavior := strings.Index(res.JS, "/* behaviour: ")
	firstDefine := strings.Index(res.JS, "/* component: ")
	if firstBehavior == -1 {
		t.Skip("no component ships a behaviour")
	}
	if firstDefine == -1 {
		t.Fatal("no component definitions emitted")
	}
	if firstBehavior > firstDefine {
		t.Error("a behaviour is registered after the first definition")
	}
}

// Component sources are embedded in template literals; anything that could
// terminate one early has to be escaped or the bundle breaks silently.
func TestBacktickEscaping(t *testing.T) {
	cases := map[string]string{
		"plain":            "plain",
		"a `tick` b":       "a \\`tick\\` b",
		"${expr}":          "\\${expr}",
		`back\slash`:       `back\\slash`,
		"mixed `${x}` \\y": "mixed \\`\\${x}\\` \\\\y",
	}
	for in, want := range cases {
		if got := backtick(in); got != want {
			t.Errorf("backtick(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestBannerMarksFilesGenerated(t *testing.T) {
	res := generate(t)
	for name, body := range map[string]string{"CSS": res.CSS, "JS": res.JS} {
		if !strings.Contains(body, "DO NOT EDIT") {
			t.Errorf("%s banner missing the do-not-edit marker", name)
		}
	}
}

func TestRuntimeHelpersEmitted(t *testing.T) {
	res := generate(t)
	for _, want := range []string{
		"LDS.overlay",
		"LDS.position",
	} {
		if !strings.Contains(res.JS, want) {
			t.Errorf("JS missing %q", want)
		}
	}
	base := strings.Index(res.JS, "const LDS = {")
	overlay := strings.Index(res.JS, "LDS.overlay = {")
	position := strings.Index(res.JS, "LDS.position = function")
	firstBehavior := strings.Index(res.JS, "/* behaviour: ")
	if base < 0 || overlay < 0 || position < 0 {
		t.Fatal("runtime markers missing")
	}
	if !(base < overlay && overlay < position) {
		t.Error("expected base.js before overlay.js before position.js")
	}
	if firstBehavior >= 0 && position > firstBehavior {
		t.Error("position helper must precede component behaviours")
	}
}

func TestIconSpriteAndNames(t *testing.T) {
	res := generate(t)

	if len(res.IconNames) == 0 {
		t.Fatal("expected vendored icons, got none")
	}
	for _, name := range res.IconNames {
		id := `id="lds-icon-` + name + `"`
		if !strings.Contains(res.Icons, id) {
			t.Errorf("sprite missing symbol for %q", name)
		}
	}
	if !strings.Contains(res.Icons, `xmlns="http://www.w3.org/2000/svg"`) {
		t.Error("sprite missing svg xmlns")
	}
	if !strings.Contains(res.JS, `LDS.icons = [`) {
		t.Error("JS missing LDS.icons")
	}
	// First and last names appear in the emitted list (sorted).
	first := res.IconNames[0]
	last := res.IconNames[len(res.IconNames)-1]
	if !strings.Contains(res.JS, `"`+first+`"`) || !strings.Contains(res.JS, `"`+last+`"`) {
		t.Errorf("JS LDS.icons missing expected names %q / %q", first, last)
	}
}

func TestBuildIconsRejectsMissingViewBox(t *testing.T) {
	dir := t.TempDir()
	bad := []byte(`<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`)
	if err := os.WriteFile(filepath.Join(dir, "broken.svg"), bad, 0o644); err != nil {
		t.Fatal(err)
	}
	_, _, err := BuildIcons(dir)
	if err == nil {
		t.Fatal("expected error for missing viewBox")
	}
	if !strings.Contains(err.Error(), "viewBox") {
		t.Errorf("error = %v, want viewBox mention", err)
	}
}

func TestBuildIconsEmptyDir(t *testing.T) {
	sprite, names, err := BuildIcons(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if len(names) != 0 {
		t.Errorf("names = %v, want empty", names)
	}
	if !strings.Contains(sprite, "<svg") {
		t.Errorf("empty sprite = %q", sprite)
	}
}
