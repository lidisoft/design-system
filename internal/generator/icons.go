package generator

import (
	"encoding/xml"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// BuildIcons scans dir for *.svg files and assembles a symbol sprite plus a
// sorted name list. Missing or empty directories yield an empty sprite (no error)
// so tests and fresh checkouts without assets still build.
func BuildIcons(dir string) (sprite string, names []string, err error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return emptySprite(), nil, nil
		}
		return "", nil, err
	}

	type icon struct {
		name    string
		viewBox string
		attrs   map[string]string
		inner   string
	}
	var icons []icon
	seen := map[string]struct{}{}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".svg") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".svg")
		if name == "" {
			return "", nil, fmt.Errorf("generator: icons: empty basename in %s", e.Name())
		}
		if _, ok := seen[name]; ok {
			return "", nil, fmt.Errorf("generator: icons: duplicate name %q", name)
		}
		seen[name] = struct{}{}

		raw, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			return "", nil, err
		}
		viewBox, attrs, inner, err := parseIconSVG(e.Name(), raw)
		if err != nil {
			return "", nil, err
		}
		icons = append(icons, icon{name: name, viewBox: viewBox, attrs: attrs, inner: inner})
	}

	sort.Slice(icons, func(i, j int) bool { return icons[i].name < icons[j].name })
	names = make([]string, len(icons))
	for i, ic := range icons {
		names[i] = ic.name
	}

	var b strings.Builder
	b.WriteString(`<svg xmlns="http://www.w3.org/2000/svg" style="display:none">`)
	b.WriteByte('\n')
	for _, ic := range icons {
		b.WriteString(`  <symbol id="lds-icon-`)
		b.WriteString(ic.name)
		b.WriteString(`" viewBox="`)
		b.WriteString(xmlEscapeAttr(ic.viewBox))
		b.WriteByte('"')
		for _, key := range []string{"fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"} {
			if v, ok := ic.attrs[key]; ok && v != "" {
				fmt.Fprintf(&b, ` %s="%s"`, key, xmlEscapeAttr(v))
			}
		}
		b.WriteByte('>')
		b.WriteString(strings.TrimSpace(ic.inner))
		b.WriteString("</symbol>\n")
	}
	b.WriteString("</svg>\n")
	return b.String(), names, nil
}

func emptySprite() string {
	return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"></svg>` + "\n"
}

// lucideSVG captures the root <svg> and its children. Presentation attributes
// are lifted onto each <symbol> so <use> inherits Lucide stroke styling.
type lucideSVG struct {
	XMLName        xml.Name
	ViewBox        string `xml:"viewBox,attr"`
	Fill           string `xml:"fill,attr"`
	Stroke         string `xml:"stroke,attr"`
	StrokeWidth    string `xml:"stroke-width,attr"`
	StrokeLinecap  string `xml:"stroke-linecap,attr"`
	StrokeLinejoin string `xml:"stroke-linejoin,attr"`
	Inner          string `xml:",innerxml"`
}

func parseIconSVG(filename string, raw []byte) (viewBox string, attrs map[string]string, inner string, err error) {
	// Strip leading HTML comments (Lucide license banners).
	trimmed := string(raw)
	for {
		trimmed = strings.TrimSpace(trimmed)
		if !strings.HasPrefix(trimmed, "<!--") {
			break
		}
		end := strings.Index(trimmed, "-->")
		if end < 0 {
			return "", nil, "", fmt.Errorf("generator: icons: %s: unclosed comment", filename)
		}
		trimmed = trimmed[end+3:]
	}

	var root lucideSVG
	if err := xml.Unmarshal([]byte(trimmed), &root); err != nil {
		return "", nil, "", fmt.Errorf("generator: icons: %s: %w", filename, err)
	}
	if root.ViewBox == "" {
		return "", nil, "", fmt.Errorf("generator: icons: %s: missing viewBox", filename)
	}

	attrs = map[string]string{}
	if root.Fill != "" {
		attrs["fill"] = root.Fill
	}
	if root.Stroke != "" {
		attrs["stroke"] = root.Stroke
	}
	if root.StrokeWidth != "" {
		attrs["stroke-width"] = root.StrokeWidth
	}
	if root.StrokeLinecap != "" {
		attrs["stroke-linecap"] = root.StrokeLinecap
	}
	if root.StrokeLinejoin != "" {
		attrs["stroke-linejoin"] = root.StrokeLinejoin
	}

	return root.ViewBox, attrs, root.Inner, nil
}

func xmlEscapeAttr(s string) string {
	r := strings.NewReplacer(
		`&`, `&amp;`,
		`"`, `&quot;`,
		`<`, `&lt;`,
		`>`, `&gt;`,
	)
	return r.Replace(s)
}
