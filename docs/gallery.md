# The gallery

The development workbench: LDS's answer to Storybook, in Go, with no npm.

```bash
make dev      # http://localhost:8081
make up       # same, under Docker with Air hot reload
```

Port 8081 by default — 8080 belongs to `tocsin` in the local ecosystem.
Override with `PORT=9000 make dev`, `LDS_ADDR`, or `LDS_PORT` for compose.

## Pages

| Route | Contents |
|-------|----------|
| `/` | Overview, pipeline summary, full catalog |
| `/tokens` | Every resolved token with swatches, plus a table per theme |
| `/components/{tag}` | Stories, API tables, accessibility notes, source |
| `/dist/lds.css`, `/dist/lds.js` | The live bundles |
| `/dist/fonts/…` | Vendored fonts |
| `/_gallery/gallery.css` | The workbench's own chrome |

Every page carries a theme toggle, persisted in `localStorage` under
`lds-gallery-theme`. It is gallery-local; consuming apps handle their own.

## It eats its own cooking

The gallery loads the real `dist/lds.css` and `dist/lds.js`, and its chrome
(`internal/gallery/static/gallery.css`) is written entirely against `--lds-*`
tokens. Delete a token and the workbench visibly breaks.

That is deliberate. The workbench is the design system's first consumer, so
"looks fine in the gallery" means "works for consumers".

## Stories

Stories come from `[[stories]]` in a component's TOML and are rendered live,
inline, with a **Source** toggle per story.

They are rendered inline rather than in iframes. Shadow DOM already isolates
component styles, so the usual reason for iframes does not apply, and inline
rendering avoids iframe height juggling entirely. The tradeoff: a story can see
the gallery's own page-level styles, so avoid depending on the surrounding
context in a story.

## The edit loop

In dev mode the gallery regenerates the bundles **on every request**. A full
build is single-digit milliseconds, so this costs nothing and removes an entire
class of staleness bug.

| You changed | What you do |
|-------------|-------------|
| `components/**/*.toml`, `.html`, `.css`, `.js` | Refresh the browser |
| `tokens/**/*.toml` | Refresh the browser |
| `runtime/*.css`, `runtime/base.js` | Refresh the browser |
| `internal/**/*.go` | Air restarts (`make up`), or restart `make dev` |
| `internal/gallery/templates/*.html` | Restart — templates are embedded at compile time |

Build errors — an unresolvable token reference, malformed TOML, a missing
required file — render as a readable page in the browser rather than only
appearing in the terminal.

## Under Docker

`make up` runs the gallery under [Air](https://github.com/air-verse/air),
matching `tocsin`'s setup. The tree is bind-mounted so Air sees edits; Go module
and build caches live in named volumes so container recreation stays cheap.

```bash
make up        # start
make logs      # follow
make down      # stop
make rebuild   # force recreate
```

There is no database and no external service, so unlike `tocsin` the compose
file has a single service.

## Working on the gallery itself

```
internal/gallery/
  server.go              routing, page data, dev-mode regeneration
  templates/
    layout.html          shell, sidebar, theme toggle, source-toggle script
    index.html           overview
    tokens.html          token tables
    component.html       stories and API tables
  static/gallery.css     chrome, written against --lds-* tokens
```

Templates and static files are embedded with `go:embed`, so changing them needs
a rebuild.

Each page template defines a `content` block and is parsed together with
`layout.html`. To add a page:

1. Add the template with `{{define "content"}}…{{end}}`.
2. Register its filename in the page list in `gallery.New`.
3. Add a handler and a route in `Handler()`.
4. Add a sidebar link in `layout.html`.

Template helpers available: `title`, `isColor`, `inGroup`, `slotName`,
`defaultOr`, `joinValues`.

## Deliberate non-features

- **No visual regression testing.** Would need a headless browser and an image
  toolchain — a large dependency for the current size of the system.
- **No interactive controls (knobs).** Stories are authored HTML; if you want to
  see a variant, write it. This keeps stories greppable and diffable.
- **No search.** The sidebar fits on one screen. Revisit past ~40 components.
- **No static export.** The gallery is a dev tool. Publishing it would mean
  choosing what a public design-system site should say, which is a separate job
  — see [roadmap.md](roadmap.md).
