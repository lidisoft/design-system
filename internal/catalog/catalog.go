// Package catalog discovers component sources on disk.
//
// Every component is a directory under components/ named after its tag without
// the "lds-" prefix, holding:
//
//	<name>.toml   required — metadata, public API and gallery stories
//	<name>.html   required — shadow DOM template
//	<name>.css    required — shadow DOM styles
//	<name>.js     optional — behaviour registered via LDS.behavior()
package catalog

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/BurntSushi/toml"
)

// CategoryOrder controls how components are grouped in the gallery sidebar.
var CategoryOrder = []string{
	"foundations",
	"primitives",
	"forms",
	"layout",
	"navigation",
	"data",
	"feedback",
	"overlays",
}

// Attribute documents one observed HTML attribute.
type Attribute struct {
	Name        string   `toml:"name"`
	Type        string   `toml:"type"` // string | boolean | number | enum
	Values      []string `toml:"values"`
	Default     string   `toml:"default"`
	Description string   `toml:"description"`
}

// Slot documents one shadow DOM slot.
type Slot struct {
	Name        string `toml:"name"` // empty means the default slot
	Description string `toml:"description"`
}

// Event documents one custom event the component dispatches.
type Event struct {
	Name        string `toml:"name"`
	Detail      string `toml:"detail"`
	Description string `toml:"description"`
}

// Part documents one ::part() exposed for external styling.
type Part struct {
	Name        string `toml:"name"`
	Description string `toml:"description"`
}

// CSSVar documents one custom property the component reads for theming.
type CSSVar struct {
	Name        string `toml:"name"`
	Default     string `toml:"default"`
	Description string `toml:"description"`
}

// Story is a gallery example.
type Story struct {
	Name        string `toml:"name"`
	Description string `toml:"description"`
	HTML        string `toml:"html"`
}

// Component is one entry in the design system.
type Component struct {
	Tag         string      `toml:"tag"`
	Name        string      `toml:"name"`
	Category    string      `toml:"category"`
	Status      string      `toml:"status"` // draft | beta | stable | deprecated
	Summary     string      `toml:"summary"`
	Description string      `toml:"description"`
	A11y        string      `toml:"a11y"`
	Attributes  []Attribute `toml:"attributes"`
	Slots       []Slot      `toml:"slots"`
	Events      []Event     `toml:"events"`
	Parts       []Part      `toml:"parts"`
	CSSVars     []CSSVar    `toml:"css_vars"`
	Stories     []Story     `toml:"stories"`

	Dir      string `toml:"-"`
	Template string `toml:"-"`
	Styles   string `toml:"-"`
	Behavior string `toml:"-"`
}

// ClassName derives the JS constructor name, e.g. lds-button -> LdsButton.
func (c Component) ClassName() string {
	var b strings.Builder
	for _, part := range strings.Split(c.Tag, "-") {
		if part == "" {
			continue
		}
		b.WriteString(strings.ToUpper(part[:1]))
		b.WriteString(part[1:])
	}
	return b.String()
}

// Observed lists the attribute names fed to observedAttributes.
func (c Component) Observed() []string {
	out := make([]string, 0, len(c.Attributes))
	for _, a := range c.Attributes {
		out = append(out, a.Name)
	}
	return out
}

// Load reads every component directory under dir.
func Load(dir string) ([]Component, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var out []Component
	for _, e := range entries {
		if !e.IsDir() || strings.HasPrefix(e.Name(), ".") || strings.HasPrefix(e.Name(), "_") {
			continue
		}
		c, err := loadOne(filepath.Join(dir, e.Name()), e.Name())
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}

	sort.Slice(out, func(i, j int) bool {
		ci, cj := categoryRank(out[i].Category), categoryRank(out[j].Category)
		if ci != cj {
			return ci < cj
		}
		return out[i].Name < out[j].Name
	})
	return out, nil
}

func loadOne(dir, name string) (Component, error) {
	var c Component
	c.Dir = dir

	metaPath := filepath.Join(dir, name+".toml")
	if _, err := toml.DecodeFile(metaPath, &c); err != nil {
		return c, fmt.Errorf("catalog: %s: %w", metaPath, err)
	}
	if c.Tag == "" {
		return c, fmt.Errorf("catalog: %s: missing required field \"tag\"", metaPath)
	}
	if !strings.HasPrefix(c.Tag, "lds-") {
		return c, fmt.Errorf("catalog: %s: tag %q must start with \"lds-\"", metaPath, c.Tag)
	}
	if c.Category == "" {
		c.Category = "primitives"
	}
	if c.Status == "" {
		c.Status = "draft"
	}

	tmpl, err := readRequired(filepath.Join(dir, name+".html"))
	if err != nil {
		return c, err
	}
	c.Template = tmpl

	styles, err := readRequired(filepath.Join(dir, name+".css"))
	if err != nil {
		return c, err
	}
	c.Styles = styles

	if b, err := os.ReadFile(filepath.Join(dir, name+".js")); err == nil {
		c.Behavior = string(b)
	} else if !os.IsNotExist(err) {
		return c, err
	}

	return c, nil
}

func readRequired(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("catalog: %w", err)
	}
	return string(b), nil
}

func categoryRank(category string) int {
	for i, c := range CategoryOrder {
		if c == category {
			return i
		}
	}
	return len(CategoryOrder)
}

// ByCategory groups components for sidebar rendering, preserving CategoryOrder.
func ByCategory(components []Component) []CategoryGroup {
	var groups []CategoryGroup
	index := map[string]int{}
	for _, c := range components {
		i, ok := index[c.Category]
		if !ok {
			index[c.Category] = len(groups)
			groups = append(groups, CategoryGroup{Name: c.Category})
			i = len(groups) - 1
		}
		groups[i].Components = append(groups[i].Components, c)
	}
	return groups
}

// CategoryGroup is a sidebar section.
type CategoryGroup struct {
	Name       string
	Components []Component
}
