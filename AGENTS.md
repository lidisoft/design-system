# Agent guide

Orientation for AI assistants working in this repository. Read
[docs/component-authoring.md](docs/component-authoring.md) before writing any
component; read [docs/decisions.md](docs/decisions.md) before changing anything
architectural.

## What this is

A design system for the LiDiSoft ecosystem. It generates **CSS, JS and an icon
sprite** from declarative sources using a **Go** toolchain. Components are
**Web Components** (custom elements with shadow DOM).

**There is no npm, no Node and no bundler in this project.** Do not add one. Do
not suggest one. If a task seems to need one, the answer is a Go-side change or
a different approach — see [docs/decisions.md](docs/decisions.md#1-go-generates-everything-npm-is-not-used).

## Commands

```bash
make dev                    # gallery on :8081 — the main dev loop
make build                  # regenerate dist/
make check                  # fmt + vet + test + dist freshness — run before finishing
make new name=x category=y  # scaffold a component
make icons                  # refetch vendored Lucide SVGs into assets/icons/
make up                     # gallery under Docker + Air
go run ./cmd/lds tokens     # dump resolved tokens
```

## Where things live

| Path | Contents |
|------|----------|
| `tokens/00-core.toml` | Raw palette and scales |
| `tokens/10-semantic.toml` | Semantic roles — **the only layer components reference** |
| `tokens/themes/*.toml` | Theme overrides of the semantic layer |
| `runtime/base.js` | The `LDS` runtime: `define`, `behavior`, icon helpers |
| `runtime/overlay.js` | `LDS.overlay.bind` — dismiss, focus trap, restore focus |
| `runtime/position.js` | `LDS.position` — anchored floating layout |
| `runtime/reset.css` | `@font-face`, reset, theme wiring |
| `runtime/utilities.css` | Layout, typography and a11y classes |
| `runtime/table.css` | Light-DOM cell styles for `lds-table` (shadow cannot reach `td`/`th`) |
| `assets/icons/` | Vendored Lucide SVGs → `dist/icons.svg` |
| `components/<name>/` | `<name>.toml`, `.html`, `.css`, optional `.js` |
| `internal/tokens/` | TOML loading, alias resolution, cycle detection |
| `internal/catalog/` | Component discovery |
| `internal/generator/` | Bundle emission |
| `internal/gallery/` | Development workbench |
| `dist/` | **Generated. Never edit by hand.** Committed on purpose |

`components/button/` is the worked reference for every pattern.

## Rules that are not negotiable

1. **Never hand-edit `dist/`.** Change the source, run `make build`, commit both.
2. **No hex values, no magic numbers in component CSS.** Semantic tokens only:
   `var(--lds-color-fg-muted)`, never `#4a5364` and never
   `var(--lds-color-gray-600)`.
3. **Components reference the semantic layer, never core tokens.**
4. **Themes override the semantic layer only.** Needing a core override means an
   alias is missing — add it.
5. **No npm, no Node, no new JavaScript dependencies.** The runtime is
   dependency-free.
6. **Always set `display` on `:host`**, plus `:host([hidden]) { display: none }`.
7. **Shared control geometry comes from `control.*` tokens** so buttons and
   inputs align.
8. **Behaviours are registered before definitions.** The generator guarantees
   this; do not reorder emission in `internal/generator`.
9. **Run `make check` before declaring work done.**

## Adding a component

```bash
make new name=alert category=feedback
```

Discovery is automatic — no registry to update. Fill in the four files, refresh
the gallery (sources are re-read per request in dev mode). Follow the checklist
at the end of [docs/component-authoring.md](docs/component-authoring.md).

Categories: `foundations`, `primitives`, `forms`, `layout`, `navigation`,
`data`, `feedback`, `overlays`. Statuses: `draft`, `beta`, `stable`,
`deprecated`.

## Three shadow-DOM traps

These will come up, and the intuitive answers are wrong.

- **Forms do not cross the boundary.** A shadow `<button type="submit">` will
  not submit the outer form. Find `el.closest("form")` and call
  `requestSubmit()` — not `submit()`, which skips validation.
- **CSS cannot detect an empty slot.** `:empty` inspects fallback children, not
  assigned nodes. Set an attribute from JS on `slotchange` instead.
- **A disabled host still receives clicks.** Only the inner control is disabled.
  Stop them on the host with a capture-phase listener.

All three are solved in `components/button/button.js`.

## Where to pick up work

[docs/roadmap.md](docs/roadmap.md). Two items there are ordering-critical and
expensive to retrofit:

- **`lds-field` before any other form component.**
- **Form-associated custom elements in the runtime before `lds-select`,
  `lds-checkbox` and the rest of Phase 2.**

## Honest limitations

Do not paper over these when reporting on work:

- JavaScript is checked for **syntax only** (by the Go minifier's parser). There
  is no type checking and no component test suite.
- Colour contrast is **not** automated; it must be checked by eye in both
  themes.
- Form components cannot yet participate in real forms.

## Documentation map

| Document | Covers |
|----------|--------|
| [architecture.md](docs/architecture.md) | Pipeline, generation model, emission order |
| [design-tokens.md](docs/design-tokens.md) | Token layers, aliases, theming, deprecation |
| [component-authoring.md](docs/component-authoring.md) | How to build a component |
| [components.md](docs/components.md) | Inventory and per-component specs |
| [consuming.md](docs/consuming.md) | Wiring LDS into an app |
| [conventions.md](docs/conventions.md) | Naming, CSS/JS/Go style, a11y, browser support |
| [gallery.md](docs/gallery.md) | The workbench |
| [roadmap.md](docs/roadmap.md) | Sequenced work and known limitations |
| [decisions.md](docs/decisions.md) | Why things are the way they are |
