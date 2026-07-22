# LDS — LiDiSoft Design System

The shared UI layer for the LiDiSoft ecosystem. It ships **one CSS file and one
JS file**, generated from declarative sources by a Go toolchain.

```html
<link rel="stylesheet" href="/lds/lds.css">
<script src="/lds/lds.js" defer></script>

<lds-button variant="primary">Acknowledge</lds-button>
```

No npm, no Node, no bundler. `go run ./cmd/lds build` is the entire pipeline.

## What is in the box

| Artefact | Contents |
|----------|----------|
| `dist/lds.css` | `@font-face`, reset, every design token as a custom property, theme blocks, layout utilities |
| `dist/lds.js` | The component runtime and every custom element, each with its styles adopted into its own shadow root |
| `dist/lds.min.*` | Minified variants |
| `dist/fonts/` | Vendored Inter and Space Grotesk variable woff2 |

Go services can skip HTTP asset plumbing entirely and embed the bundles:

```go
import lds "github.com/lidisoft/design-system"

mux.Handle("GET /lds/", lds.Handler("/lds/"))
```

## Quick start

```bash
make dev          # gallery on http://localhost:8081
make build        # regenerate dist/
make check        # fmt + vet + test + dist freshness
```

Or under Docker with hot reload, matching the rest of the ecosystem:

```bash
make up           # http://localhost:8081
```

The gallery is the development workbench — a Storybook equivalent that renders
every component's stories, its public API, the resolved token layer and the
component source. It consumes the real generated bundle, so anything broken
there is broken for consumers too.

## Adding a component

```bash
make new name=alert category=feedback
```

That scaffolds `components/alert/` with four files. Fill them in and refresh the
gallery — no restart needed, sources are re-read per request in dev mode.

```
components/alert/
  alert.toml    metadata, public API, gallery stories
  alert.html    shadow DOM template
  alert.css     shadow DOM styles
  alert.js      behaviour (optional — delete if unused)
```

`components/button/` is the worked reference. Read it alongside
[docs/component-authoring.md](docs/component-authoring.md).

## Layout

```
cmd/lds/            CLI entry point
internal/
  tokens/           TOML token loading, alias resolution, theming
  catalog/          component discovery
  generator/        CSS + JS emission
  gallery/          development workbench (server, templates, styles)
  cli/              command wiring
tokens/             00-core.toml, 10-semantic.toml, themes/*.toml
runtime/            base.js, reset.css, utilities.css
components/         one directory per component
assets/fonts/       vendored woff2
dist/               generated bundles — committed, verified by `make verify`
docs/               specifications and guides
```

## Documentation

| Document | Read it when |
|----------|--------------|
| [architecture.md](docs/architecture.md) | You want to know how sources become bundles |
| [design-tokens.md](docs/design-tokens.md) | You are adding, renaming or theming a token |
| [component-authoring.md](docs/component-authoring.md) | You are writing a component — **start here** |
| [components.md](docs/components.md) | You want the inventory and what exists so far |
| [consuming.md](docs/consuming.md) | You are wiring LDS into an app |
| [conventions.md](docs/conventions.md) | You need naming, a11y or browser-support rules |
| [gallery.md](docs/gallery.md) | You are working on the workbench itself |
| [roadmap.md](docs/roadmap.md) | You are picking up the next chunk of work |
| [decisions.md](docs/decisions.md) | You are wondering *why* something is the way it is |

## Status

Bootstrapped. The pipeline, token layer, runtime, gallery and one reference
component (`lds-button`) are complete and tested. The remaining inventory is
specified in [docs/components.md](docs/components.md) and sequenced in
[docs/roadmap.md](docs/roadmap.md).
