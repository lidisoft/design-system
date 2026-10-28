# Design tokens

Every colour, dimension, duration and font decision in LDS is a token. No
component may contain a raw hex value, a pixel measurement or a timing figure.

## The three layers

```
core        tokens/00-core.toml      raw values      color.blue.500 = "#4a9fe3"
semantic    tokens/10-semantic.toml  roles           color.accent.default = "{color.blue.500}"
theme       tokens/themes/*.toml     overrides       color.accent.default = "{color.blue.400}"
```

**Core** is the palette and the scales. It answers *what values exist*.

**Semantic** is the only layer components reference. It answers *what values
mean*. `color.danger.default` says something a component can reason about;
`color.coral.500` does not.

**Themes** override the semantic layer and nothing else. A theme that needs to
override a core token is a signal that the semantic layer is missing an alias —
add the alias instead.

This is what makes dark mode a ~60-line diff rather than a second stylesheet.

## Rules

1. **Components reference semantic tokens only.** `var(--lds-color-fg-muted)`,
   never `var(--lds-color-gray-600)` and never `#4a5364`.
2. **Semantic tokens are always aliases.** A literal in `10-semantic.toml` means
   a value is missing from the core palette.
3. **Themes touch the semantic layer only.**
4. **Never delete or repurpose a token in place** — consumers may reference it.
   See [Renaming](#renaming-and-removal).

## File format

TOML, nested tables, arbitrary depth. Table paths and keys concatenate into a
dotted path, which becomes the custom property name.

```toml
[color.accent]
default = "{color.blue.500}"
```

| | |
|---|---|
| Path | `color.accent.default` |
| Custom property | `--lds-color-accent-default` |
| Group (gallery section) | `color` — the first segment |

The transformation is mechanical: prefix `--lds-`, replace `.` with `-`.

### References

`{dotted.path}` resolves at build time, transitively:

```toml
[color.blue]
500 = "#4a9fe3"

[color.accent]
default = "{color.blue.500}"       # -> #4a9fe3

[color.focus]
ring = "{color.accent.default}"    # -> #4a9fe3
```

Resolution happens in Go, so `dist/lds.css` contains final values — no
`var(--x, var(--y))` chains at runtime. Cycles and unknown paths fail the build
with the offending path named.

References may be embedded in a larger value:

```toml
[shadow]
focus = "0 0 0 3px {color.accent.muted}"
```

### The `[meta]` table

Stripped before flattening, so it never becomes a token. Use it for
documentation, and in a theme file to override the selector:

```toml
[meta]
layer = "theme"
selector = "[data-lds-theme=\"dark\"]"
```

### File ordering

Base files are read in **alphabetical order** and merged, later files winning.
Hence the numeric prefixes: `00-core.toml` before `10-semantic.toml`. Leave room
between numbers when inserting a layer.

### Numeric keys sort naturally

`space.2` comes before `space.10`, not after. Ordering is numeric-aware per
path segment, so scales read correctly in the generated CSS and the gallery.

## Themes

One file per theme in `tokens/themes/`. The filename is the theme name and, by
default, the selector:

```
tokens/themes/dark.toml  ->  [data-lds-theme="dark"] { ... }
```

Theme values resolve against the base layer plus the theme's own overrides, so a
theme can alias its own tokens.

Switching at runtime:

```js
LDS.setTheme("dark");   // sets data-lds-theme on <html>
LDS.setTheme(null);     // back to the base layer
```

`runtime/reset.css` also maps `prefers-color-scheme` onto `color-scheme`, and an
explicit `data-lds-theme="light"` always wins over the OS preference.

Because custom properties inherit through shadow boundaries, setting the
attribute on `<html>` re-themes every component instantly. No component code is
involved and nothing re-renders.

### Scoped themes

Theme selectors are ordinary CSS, so a theme can be scoped to a subtree:

```toml
[meta]
selector = ".marketing-hero, [data-lds-theme=\"inverse\"]"
```

## Token groups

| Group | Contents |
|-------|----------|
| `color` | Palette (core) and roles (semantic) |
| `space` | 4px-based scale, rem units |
| `font` | `family`, `size`, `weight`, `leading`, `tracking` |
| `radius` | Corner radii, `none` → `full` |
| `shadow` | Elevation |
| `duration`, `easing` | Motion |
| `transition` | Composed motion shorthands, e.g. `transition.control` |
| `z` | Stacking order |
| `breakpoint` | Media query widths |
| `size` | `container`, `prose` |
| `control` | Shared geometry for buttons, inputs, selects, switches |
| `card`, `overlay` | Composed surface treatments |
| `focus` | Ring width and offset |

### The `control` group earns its place

`control.height.{sm,md,lg}`, `control.padding-x.*`, `control.radius.*`,
`control.font-size.*` and `control.gap.*` are shared by every form-adjacent
component. This is why a `<lds-button size="md">` and a `<lds-input size="md">`
have identical heights and align on a row — they read the same token rather than
each defining `40px`.

Never hard-code a control dimension inside a component.

### Intent roles are uniform

`accent`, `success`, `warning`, `danger` and `neutral` each expose the same
seven roles:

| Role | Use |
|------|-----|
| `subtle` | Tinted background |
| `muted` | Stronger tinted background, hover on subtle |
| `default` | Solid fill |
| `hover` | Solid fill, hover |
| `active` | Solid fill, pressed |
| `border` | Border on tinted surfaces |
| `fg` | Text on a subtle/muted background |

That uniformity is what lets a component switch intent with one attribute
selector instead of a block per intent:

```css
:host([intent="danger"]) {
  --lds-alert-bg: var(--lds-color-danger-subtle);
  --lds-alert-fg: var(--lds-color-danger-fg);
}
```

Adding an intent means adding seven aliases — and every component that follows
this pattern supports it immediately.

## Inspecting tokens

```bash
go run ./cmd/lds tokens                 # all, resolved
go run ./cmd/lds tokens --group color   # one group
```

Aliases print a third column with the authored value. The gallery's **Tokens**
page shows the same data with colour swatches, plus a table per theme.

At runtime:

```js
LDS.token("color.accent.default");        // "#4a9fe3"
LDS.token("color.accent.default", node);  // resolved in node's scope
```

## Adding a token

1. If it is a new raw value, add it to `00-core.toml` in the right scale.
2. Add the semantic alias to `10-semantic.toml`. **Do this even if there is
   exactly one consumer** — the alias is the contract.
3. If it is colour-bearing, add a dark-theme override in `themes/dark.toml`.
   Every colour token needs a dark counterpart or the theme is incomplete.
4. `make build`, then check the Tokens page.

## Renaming and removal

Custom properties are a public API. Consuming apps reference `--lds-*` directly.

To rename, keep both for one release:

```toml
[color.fg]
subtle = "{color.gray.500}"
faint = "{color.fg.subtle}"   # deprecated alias, remove in vNext
```

Note it in the release notes, then remove in the following version. Removing a
token silently is a breaking change with no compile-time signal — the consuming
app just renders wrong.

## Contrast

Text/background pairings must meet WCAG 2.2 AA: 4.5:1 for body text, 3:1 for
large text and UI boundaries.

`TestContrastMeetsWCAG` in `internal/tokens/contrast_test.go` checks this in
every theme, so `make check` fails when a token change breaks a pairing.
Translucent tints are blended over `color.bg.canvas` before measuring. The test
only knows the pairs in `contrastPairs()`: when a component puts a role on a new
surface, add the pair there.

Pairs deliberately kept below AA go in the test's `accepted` map with the floor
they must still hold, and need a reason in [contrast-audit.md](contrast-audit.md).
Today that is white (`fg.on-accent`) on the solid accent, success and danger
fills, kept for the bright look. Warning fills are too light for white and use
`fg.on-warning` instead.
