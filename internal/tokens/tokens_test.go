package tokens

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func writeTokens(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, body := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestLoadResolvesAliasesTransitively(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"00-core.toml": "[color.blue]\n500 = \"#4a9fe3\"\n",
		"10-semantic.toml": "[color.accent]\ndefault = \"{color.blue.500}\"\n" +
			"[color.focus]\nring = \"{color.accent.default}\"\n",
	})

	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}

	ring, ok := set.Get("color.focus.ring")
	if !ok {
		t.Fatal("color.focus.ring missing")
	}
	if ring.Value != "#4a9fe3" {
		t.Errorf("value = %q, want %q", ring.Value, "#4a9fe3")
	}
	if ring.Var != "--lds-color-focus-ring" {
		t.Errorf("var = %q", ring.Var)
	}
	if !ring.IsAlias() {
		t.Error("expected IsAlias to report true for an aliased token")
	}
}

func TestLoadRejectsReferenceCycle(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"core.toml": "[a]\nx = \"{a.y}\"\ny = \"{a.x}\"\n",
	})

	_, err := Load(dir)
	if err == nil {
		t.Fatal("expected a cycle error")
	}
	if !strings.Contains(err.Error(), "cycle") {
		t.Errorf("error = %v, want it to mention a cycle", err)
	}
}

func TestLoadRejectsUnknownReference(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"core.toml": "[a]\nx = \"{does.not.exist}\"\n",
	})

	if _, err := Load(dir); err == nil {
		t.Fatal("expected an unknown-token error")
	}
}

func TestThemeOverridesResolveAgainstCore(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"00-core.toml":     "[color.gray]\n0 = \"#ffffff\"\n900 = \"#12151d\"\n",
		"10-semantic.toml": "[color.bg]\ncanvas = \"{color.gray.0}\"\n",
		"themes/dark.toml": "[color.bg]\ncanvas = \"{color.gray.900}\"\n",
	})

	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}

	if got := len(set.Themes); got != 1 {
		t.Fatalf("themes = %d, want 1", got)
	}
	theme := set.Themes[0]
	if theme.Name != "dark" {
		t.Errorf("name = %q", theme.Name)
	}
	if theme.Selector != `[data-lds-theme="dark"]` {
		t.Errorf("selector = %q", theme.Selector)
	}
	if len(theme.Tokens) != 1 || theme.Tokens[0].Value != "#12151d" {
		t.Errorf("tokens = %+v", theme.Tokens)
	}

	// The base layer must be untouched by the theme.
	base, _ := set.Get("color.bg.canvas")
	if base.Value != "#ffffff" {
		t.Errorf("base canvas = %q, want #ffffff", base.Value)
	}
}

func TestThemeHonoursCustomSelector(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"core.toml":            "[a]\nx = \"1\"\n",
		"themes/contrast.toml": "[meta]\nselector = \"[data-contrast]\"\n[a]\nx = \"2\"\n",
	})

	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if set.Themes[0].Selector != "[data-contrast]" {
		t.Errorf("selector = %q", set.Themes[0].Selector)
	}
}

func TestNumericSegmentsSortNumerically(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"core.toml": "[space]\n2 = \"a\"\n10 = \"b\"\n100 = \"c\"\n1 = \"d\"\n",
	})

	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}

	var got []string
	for _, tok := range set.Tokens {
		got = append(got, tok.Path)
	}
	want := []string{"space.1", "space.2", "space.10", "space.100"}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("order = %v, want %v", got, want)
		}
	}
}

func TestMetaTableIsNotEmittedAsToken(t *testing.T) {
	dir := writeTokens(t, map[string]string{
		"core.toml": "[meta]\nlayer = \"core\"\n[a]\nx = \"1\"\n",
	})

	set, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := set.Get("meta.layer"); ok {
		t.Error("meta table leaked into the token set")
	}
}
