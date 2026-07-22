// Package tokens loads, merges and resolves the design token layer.
//
// Tokens live in TOML files under tokens/. Files in the root of that directory
// form the base layer (core primitives first, then semantic aliases). Files
// under tokens/themes/ each contribute a theme that overrides the base layer.
//
// A token value may reference another token with {dotted.path} syntax; those
// references are resolved transitively, with cycle detection.
package tokens

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/BurntSushi/toml"
)

// VarPrefix is prepended to every generated CSS custom property.
const VarPrefix = "--lds-"

var refPattern = regexp.MustCompile(`\{([a-zA-Z0-9_.\-]+)\}`)

// Token is a single design token after reference resolution.
type Token struct {
	Path  string // dotted path, e.g. "color.accent.default"
	Group string // first path segment, e.g. "color"
	Var   string // CSS custom property, e.g. "--lds-color-accent-default"
	Raw   string // authored value, may contain {references}
	Value string // fully resolved value
}

// IsAlias reports whether the authored value pointed at another token.
func (t Token) IsAlias() bool { return refPattern.MatchString(t.Raw) }

// Theme is a set of overrides applied under a CSS selector.
type Theme struct {
	Name     string
	Selector string
	Tokens   []Token
}

// Set is the fully resolved token layer.
type Set struct {
	Tokens []Token
	Themes []Theme

	index map[string]Token
}

// Get returns the resolved token at path.
func (s *Set) Get(path string) (Token, bool) {
	t, ok := s.index[path]
	return t, ok
}

// Groups returns the token groups in the order they first appear.
func (s *Set) Groups() []string {
	seen := map[string]bool{}
	var out []string
	for _, t := range s.Tokens {
		if !seen[t.Group] {
			seen[t.Group] = true
			out = append(out, t.Group)
		}
	}
	return out
}

// InGroup returns every token belonging to group.
func (s *Set) InGroup(group string) []Token {
	var out []Token
	for _, t := range s.Tokens {
		if t.Group == group {
			out = append(out, t)
		}
	}
	return out
}

// Load reads the token layer rooted at dir.
func Load(dir string) (*Set, error) {
	baseFiles, err := filepath.Glob(filepath.Join(dir, "*.toml"))
	if err != nil {
		return nil, err
	}
	if len(baseFiles) == 0 {
		return nil, fmt.Errorf("tokens: no .toml files in %s", dir)
	}
	sort.Strings(baseFiles)

	base := map[string]string{}
	for _, f := range baseFiles {
		if err := mergeFile(f, base); err != nil {
			return nil, err
		}
	}

	resolved, err := resolve(base, base)
	if err != nil {
		return nil, err
	}

	set := &Set{Tokens: toTokens(base, resolved), index: map[string]Token{}}
	for _, t := range set.Tokens {
		set.index[t.Path] = t
	}

	themeFiles, err := filepath.Glob(filepath.Join(dir, "themes", "*.toml"))
	if err != nil {
		return nil, err
	}
	sort.Strings(themeFiles)
	for _, f := range themeFiles {
		theme, err := loadTheme(f, base)
		if err != nil {
			return nil, err
		}
		set.Themes = append(set.Themes, theme)
	}

	return set, nil
}

func loadTheme(path string, base map[string]string) (Theme, error) {
	name := strings.TrimSuffix(filepath.Base(path), ".toml")

	raw := map[string]any{}
	if _, err := toml.DecodeFile(path, &raw); err != nil {
		return Theme{}, fmt.Errorf("tokens: %s: %w", path, err)
	}

	// A theme file may declare its own selector under [meta].
	selector := fmt.Sprintf("[data-lds-theme=%q]", name)
	if meta, ok := raw["meta"].(map[string]any); ok {
		if s, ok := meta["selector"].(string); ok && s != "" {
			selector = s
		}
		delete(raw, "meta")
	}

	overrides := map[string]string{}
	flatten("", raw, overrides)

	// Theme values resolve against the base layer plus the theme's own overrides,
	// so a theme can alias another theme token.
	scope := map[string]string{}
	for k, v := range base {
		scope[k] = v
	}
	for k, v := range overrides {
		scope[k] = v
	}

	resolved, err := resolve(overrides, scope)
	if err != nil {
		return Theme{}, fmt.Errorf("tokens: theme %s: %w", name, err)
	}

	return Theme{Name: name, Selector: selector, Tokens: toTokens(overrides, resolved)}, nil
}

func mergeFile(path string, dst map[string]string) error {
	raw := map[string]any{}
	if _, err := toml.DecodeFile(path, &raw); err != nil {
		return fmt.Errorf("tokens: %s: %w", path, err)
	}
	delete(raw, "meta")
	flatten("", raw, dst)
	return nil
}

// flatten walks a decoded TOML tree into dotted-path leaves.
func flatten(prefix string, node map[string]any, dst map[string]string) {
	for k, v := range node {
		path := k
		if prefix != "" {
			path = prefix + "." + k
		}
		switch val := v.(type) {
		case map[string]any:
			flatten(path, val, dst)
		default:
			dst[path] = fmt.Sprint(val)
		}
	}
}

// resolve expands {references} in every entry of subject, looking values up in scope.
func resolve(subject, scope map[string]string) (map[string]string, error) {
	out := make(map[string]string, len(subject))
	for path := range subject {
		v, err := resolveOne(path, scope, map[string]bool{}, out)
		if err != nil {
			return nil, err
		}
		out[path] = v
	}
	return out, nil
}

func resolveOne(path string, scope map[string]string, seen map[string]bool, memo map[string]string) (string, error) {
	if v, ok := memo[path]; ok {
		return v, nil
	}
	if seen[path] {
		return "", fmt.Errorf("reference cycle at %q", path)
	}
	seen[path] = true
	defer delete(seen, path)

	raw, ok := scope[path]
	if !ok {
		return "", fmt.Errorf("unknown token %q", path)
	}

	var resolveErr error
	value := refPattern.ReplaceAllStringFunc(raw, func(match string) string {
		target := match[1 : len(match)-1]
		v, err := resolveOne(target, scope, seen, memo)
		if err != nil {
			resolveErr = fmt.Errorf("%q -> %w", path, err)
			return match
		}
		return v
	})
	if resolveErr != nil {
		return "", resolveErr
	}
	return value, nil
}

func toTokens(raw, resolved map[string]string) []Token {
	paths := make([]string, 0, len(raw))
	for p := range raw {
		paths = append(paths, p)
	}
	sort.Slice(paths, func(i, j int) bool { return naturalLess(paths[i], paths[j]) })

	out := make([]Token, 0, len(paths))
	for _, p := range paths {
		group := p
		if i := strings.Index(p, "."); i >= 0 {
			group = p[:i]
		}
		out = append(out, Token{
			Path:  p,
			Group: group,
			Var:   VarPrefix + strings.ReplaceAll(p, ".", "-"),
			Raw:   raw[p],
			Value: resolved[p],
		})
	}
	return out
}

// naturalLess orders paths so numeric segments sort numerically: a.50 before a.100.
func naturalLess(a, b string) bool {
	as, bs := strings.Split(a, "."), strings.Split(b, ".")
	for i := 0; i < len(as) && i < len(bs); i++ {
		if as[i] == bs[i] {
			continue
		}
		an, aok := allDigits(as[i])
		bn, bok := allDigits(bs[i])
		if aok && bok {
			return an < bn
		}
		return as[i] < bs[i]
	}
	return len(as) < len(bs)
}

func allDigits(s string) (int, bool) {
	if s == "" {
		return 0, false
	}
	n := 0
	for _, r := range s {
		if r < '0' || r > '9' {
			return 0, false
		}
		n = n*10 + int(r-'0')
	}
	return n, true
}

// EnsureDir is a small helper shared by callers writing generated output.
func EnsureDir(path string) error { return os.MkdirAll(path, 0o755) }
