package tokens

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"testing"
)

// WCAG 2.2 AA thresholds.
const (
	textMin = 4.5 // body text
	uiMin   = 3.0 // focus indicators and UI boundaries
)

type pair struct {
	fg, bg string
	min    float64
}

// contrastPairs lists every foreground/background pairing components rely on.
// Add to it when a component puts a new role on a new surface.
func contrastPairs() []pair {
	var pairs []pair

	surfaces := []string{"color.bg.canvas", "color.bg.subtle", "color.bg.muted", "color.bg.raised"}
	for _, fg := range []string{"color.fg.default", "color.fg.muted", "color.fg.subtle", "color.fg.link"} {
		for _, bg := range surfaces {
			pairs = append(pairs, pair{fg, bg, textMin})
		}
	}
	for _, bg := range surfaces {
		pairs = append(pairs, pair{"color.focus.ring", bg, uiMin})
	}
	pairs = append(pairs, pair{"color.fg.inverse", "color.bg.inverse", textMin})

	// Intent text on its own tints: badges, alerts, banners, tags.
	for _, intent := range []string{"accent", "success", "warning", "danger", "neutral"} {
		fg := "color." + intent + ".fg"
		pairs = append(pairs,
			pair{fg, "color." + intent + ".subtle", textMin},
			pair{fg, "color." + intent + ".muted", textMin},
		)
	}

	// Labels on solid fills.
	for _, intent := range []string{"accent", "success", "danger"} {
		pairs = append(pairs, pair{"color.fg.on-accent", "color." + intent + ".default", textMin})
	}
	pairs = append(pairs, pair{"color.fg.on-warning", "color.warning.default", textMin})

	// Chart marks and reference lines are graphical objects.
	for _, role := range []string{"completed", "started", "unstarted", "abandoned", "reference", "marker", "annotation"} {
		for _, bg := range []string{"color.bg.canvas", "color.bg.raised"} {
			pairs = append(pairs, pair{"color.chart." + role, bg, uiMin})
		}
	}

	return pairs
}

// accepted records pairings deliberately kept below AA, with the floor they
// must still hold. Anything listed here needs a reason in docs/contrast-audit.md.
var accepted = map[string]float64{
	// White on the brand fills keeps the bright look; see docs/contrast-audit.md.
	"color.fg.on-accent on color.accent.default":  2,
	"color.fg.on-accent on color.success.default": 2,
	"color.fg.on-accent on color.danger.default":  2,

	// Unstarted work recedes on purpose; charts must label it or offer a table.
	"color.chart.unstarted on color.bg.canvas": 2,
	"color.chart.unstarted on color.bg.raised": 2,
}

func TestContrastMeetsWCAG(t *testing.T) {
	set, err := Load("../../tokens")
	if err != nil {
		t.Fatal(err)
	}

	themes := []struct {
		name      string
		overrides map[string]string
	}{{name: "light"}}
	for _, th := range set.Themes {
		overrides := map[string]string{}
		for _, tok := range th.Tokens {
			overrides[tok.Path] = tok.Value
		}
		themes = append(themes, struct {
			name      string
			overrides map[string]string
		}{th.Name, overrides})
	}

	for _, th := range themes {
		lookup := func(path string) (rgba, error) {
			value, ok := th.overrides[path]
			if !ok {
				tok, found := set.Get(path)
				if !found {
					return rgba{}, fmt.Errorf("token %s missing", path)
				}
				value = tok.Value
			}
			return parseColor(value)
		}

		canvas, err := lookup("color.bg.canvas")
		if err != nil {
			t.Fatal(err)
		}

		for _, p := range contrastPairs() {
			name := p.fg + " on " + p.bg
			t.Run(th.name+"/"+name, func(t *testing.T) {
				fg, err := lookup(p.fg)
				if err != nil {
					t.Fatal(err)
				}
				bg, err := lookup(p.bg)
				if err != nil {
					t.Fatal(err)
				}

				// Translucent tints are painted over the canvas.
				bg = bg.over(canvas)
				ratio := contrast(fg.over(bg), bg)

				min := p.min
				if floor, ok := accepted[name]; ok {
					min = floor
				}
				if ratio < min {
					t.Errorf("%.2f:1, want at least %.1f:1", ratio, min)
				}
			})
		}
	}
}

type rgba struct{ r, g, b, a float64 }

// over composites c onto an opaque background.
func (c rgba) over(bg rgba) rgba {
	mix := func(f, b float64) float64 { return f*c.a + b*(1-c.a) }
	return rgba{mix(c.r, bg.r), mix(c.g, bg.g), mix(c.b, bg.b), 1}
}

func (c rgba) luminance() float64 {
	channel := func(v float64) float64 {
		v /= 255
		if v <= 0.04045 {
			return v / 12.92
		}
		return math.Pow((v+0.055)/1.055, 2.4)
	}
	return 0.2126*channel(c.r) + 0.7152*channel(c.g) + 0.0722*channel(c.b)
}

func contrast(a, b rgba) float64 {
	la, lb := a.luminance(), b.luminance()
	if la < lb {
		la, lb = lb, la
	}
	return (la + 0.05) / (lb + 0.05)
}

// parseColor accepts the two forms the token files use: #rrggbb and rgba().
func parseColor(s string) (rgba, error) {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "#") && len(s) == 7 {
		n, err := strconv.ParseUint(s[1:], 16, 32)
		if err != nil {
			return rgba{}, fmt.Errorf("color %q: %w", s, err)
		}
		return rgba{float64(n >> 16), float64(n >> 8 & 0xff), float64(n & 0xff), 1}, nil
	}
	if inner, ok := strings.CutPrefix(s, "rgba("); ok {
		parts := strings.Split(strings.TrimSuffix(inner, ")"), ",")
		if len(parts) == 4 {
			var v [4]float64
			for i, p := range parts {
				f, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
				if err != nil {
					return rgba{}, fmt.Errorf("color %q: %w", s, err)
				}
				v[i] = f
			}
			return rgba{v[0], v[1], v[2], v[3]}, nil
		}
	}
	return rgba{}, fmt.Errorf("color %q: unsupported format", s)
}
