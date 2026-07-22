# Architecture

How declarative sources become `dist/lds.css` and `dist/lds.js`.

## The pipeline

```
tokens/*.toml ─────┐
tokens/themes/*.toml ├──► internal/tokens ──► resolved token set ──┐
                   │                                              │
runtime/reset.css ─┤                                              ├──► dist/lds.css
runtime/utilities.css ────────────────────────────────────────────┘

runtime/base.js ───┐
                   ├──► internal/generator ──────────────────────────► dist/lds.js
components/*/ ─────┴──► internal/catalog ──► component descriptors ──┘

assets/icons/*.svg ──► internal/generator ──► dist/icons.svg
                                              (+ LDS.icons in lds.js)
```

Every stage is pure Go. There is no watch process, no transpiler and no
dependency graph to invalidate — a full build takes single-digit milliseconds,
which is why the gallery can afford to regenerate everything on each request.

| Package | Responsibility |
|---------|----------------|
| `internal/tokens` | Parse TOML, flatten to dotted paths, resolve `{aliases}`, detect cycles, build theme overrides |
| `internal/catalog` | Discover `components/*/`, parse metadata, load template/styles/behaviour |
| `internal/generator` | Emit CSS/JS/icon sprite; minify; copy fonts into `dist/` |
| `internal/gallery` | Serve the workbench, regenerating in dev mode |
| `internal/cli` | `build`, `serve`, `tokens`, `new` |

## Why the CSS / JS / icons split falls where it does

The artefacts are not an arbitrary packaging choice — the shadow DOM boundary
decides what can live where.

**`lds.css` holds everything that must be in the light DOM.** Fonts must be
declared in the document (`@font-face` inside a shadow root is ignored). The
reset styles elements the consuming page owns. Layout utilities arrange elements
the page created, which a component can never reach. And crucially, custom
properties **inherit through shadow boundaries** — so `:root { --lds-* }` in
this file is what themes every component from outside.

**`icons.svg` is also a light-DOM artefact.** The symbol sprite is fetched once
and injected into the document. Each `<lds-icon>` then clones the matching
symbol into its shadow SVG — `<use href="#…">` from a shadow root cannot see
document-level IDs.

**`lds.js` holds everything that must be encapsulated.** Each component's CSS is
embedded as a string, turned into a `CSSStyleSheet` at runtime and adopted into
its shadow root. Component styles therefore cannot leak out, and page styles
cannot leak in. The only sanctioned channels across the boundary are:

| Direction | Mechanism |
|-----------|-----------|
| Page → component | `--lds-*` custom properties |
| Page → component | HTML attributes |
| Page → component | Slotted content |
| Component → page | `::part()` |
| Component → page | Custom events |

If you find yourself wanting a sixth channel, that is a design smell — see
[conventions.md](conventions.md).

## Code generation emits data, not code

The generator never writes JavaScript class syntax. It emits descriptor objects:

```js
LDS.define({
  tag: "lds-button",
  className: "LdsButton",
  observed: ["variant", "size", "disabled", ...],
  defaults: {"variant": "primary", "size": "md", "type": "button"},
  template: `<button class="btn" ...>...</button>`,
  styles: `:host { ... }`,
});
```

`runtime/base.js` builds the constructor from that descriptor. This keeps string
building in Go to a minimum, keeps the runtime readable and debuggable as
ordinary JavaScript, and means a bug in element behaviour is fixed in one place
rather than regenerated into every component.

### Emission order

`dist/lds.js` is a single IIFE assembled in this order:

1. Banner
2. `runtime/base.js` — the `LDS` object, `LDS.define`, `LDS.behavior`, helpers
3. Every component's behaviour, **each wrapped in its own closure**
4. Every component's `LDS.define({...})` call
5. `LDS.version`, then `global.LDS = LDS`

Behaviours must precede definitions: `customElements.define()` upgrades matching
elements synchronously, so a `connectedCallback` can fire before the next line
of the bundle runs. If the hooks were not registered yet, that first element
would connect without them. `TestBehaviorsPrecedeDefinitions` guards this.

The per-behaviour closure matters too: all behaviour files share one IIFE scope,
so a top-level `function forwardToForm()` in `button.js` would collide with the
same name in another component. Wrapping each one keeps helpers private.

### Escaping

Templates and styles are embedded in JS template literals, so the generator
escapes `\`, `` ` `` and `${` (see `backtick()`). `TestBacktickEscaping` covers
this. Get it wrong and the bundle breaks in ways that are painful to trace back
to a stray backtick in a CSS comment.

## No Node, and how JavaScript still gets validated

The project ships JavaScript without a Node toolchain. Validation comes from
`github.com/tdewolff/minify/v2`, a pure-Go minifier whose JS and CSS parsers run
over both bundles on every `make build`. A syntax error fails the build.

`TestGeneratedBundlesParse` makes this an explicit guarantee rather than a side
effect of minification, so it holds even if minification is later disabled.

This is a real limitation to be honest about: the parsers catch **syntax**
errors, not type or reference errors. There is no equivalent of `tsc` or ESLint
here. Runtime correctness is covered by keeping component behaviour small and by
exercising it in gallery stories.

## `dist/` is committed

Generated output is normally kept out of version control. It is committed here
because Go consumers embed it:

```go
//go:embed dist
var embedded embed.FS
```

`go get github.com/lidisoft/design-system` must yield working bundles without
running a build step. The tradeoff is drift, which `make verify` closes — it
rebuilds and fails if `git diff -- dist` is non-empty. Wire that into CI.

## Dev mode

`lds serve --dev` (the default) reloads sources on every request. Editing a
`.toml`, `.html` or `.css` file needs only a browser refresh; Air restarts the
process solely for `.go` changes. Build errors — an unresolvable token
reference, malformed TOML — render into the browser as a readable page instead
of only appearing in the terminal.

In non-dev mode the bundle is generated once at startup and cached.

## Extending the pipeline

Common changes and where they land:

| Goal | Change |
|------|--------|
| New token group | `tokens/00-core.toml` and/or `tokens/10-semantic.toml` — no Go changes |
| New theme | Add `tokens/themes/<name>.toml` — picked up automatically |
| New component | `make new name=x` — picked up automatically |
| New metadata field on components | `catalog.Component`, then the gallery template |
| New output artefact | `generator.Build` |
| New gallery page | `gallery.Server.Handler` + a template + `New`'s page list |
