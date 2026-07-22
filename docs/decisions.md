# Decisions

Why the project is shaped the way it is. Each entry records the decision, the
reasoning, and what was given up — so a future change is an informed reversal
rather than an accident.

---

## 1. Go generates everything; npm is not used

**Decision.** The entire pipeline is Go. No Node, no npm, no bundler.

**Why.** Every other LiDiSoft service is Go. One toolchain means one set of
skills, one CI image, one dependency tree to audit. A design system is also the
longest-lived part of a UI stack, and the JavaScript build ecosystem is the
fastest-churning part — decoupling them removes a recurring maintenance tax.

**Cost.** No `tsc`, no ESLint, no Prettier, no established component-testing
tools. JavaScript is validated only for syntax, by the pure-Go minifier's parser
(`TestGeneratedBundlesParse`). Behaviour correctness relies on keeping behaviour
files small and exercising them in gallery stories. This is the single biggest
tradeoff in the project.

**Mitigation.** Behaviours stay small by convention. A component linter and
browser-based tests are on the roadmap.

---

## 2. Web Components rather than CSS classes

**Decision.** The public API is custom elements: `<lds-button variant="primary">`.

**Why.** Real encapsulation. Component styles cannot leak out and page styles
cannot leak in, which is what stops a design system decaying as consumers
accumulate overrides. The API is declarative, works from a Go template as
plainly as from JavaScript, and the boundary is enforced by the platform rather
than by discipline.

**Cost.** Harder than CSS classes on three specific fronts: form participation
across the shadow boundary, styling that requires explicit `::part` and custom
property hooks, and an unstyled flash before definitions register. All three are
addressed in [component-authoring.md](component-authoring.md) and
[consuming.md](consuming.md).

**Rejected alternatives.** CSS classes plus `data-` attribute enhancement —
simpler and zero-flash, but no encapsulation. A Go `html/template` partial
package — strongest typing, but couples every consumer to Go and to this
module's release cycle, and gives static sites nothing.

---

## 3. Component styles ship in the JS file

**Decision.** `lds.css` carries tokens, reset and utilities. `lds.js` carries
component styles, adopted per shadow root as constructable stylesheets.

**Why.** The shadow boundary decides this, not preference. Styles inside a
shadow root must be injected into that root; a stylesheet in the document cannot
reach in. Constructable stylesheets are shared across all instances of a
component, so a page with 500 buttons parses that CSS once.

**Cost.** `lds.css` alone does not style components — both files are required.
Component CSS is not visible to browser devtools' stylesheet list in the usual
way.

---

## 4. Tokens are TOML in three layers

**Decision.** `tokens/*.toml`, layered core → semantic → theme, with
`{dotted.path}` references resolved at build time.

**Why TOML.** It supports comments, which JSON does not. A token file is a
design document as much as data — the reasoning next to a value is worth more
than the value. It is also the least surprising format to hand-edit.

**Why three layers.** The semantic layer is what makes theming tractable: dark
mode overrides roles, not values, so it stays a ~60-line diff instead of a
parallel stylesheet. It also means a palette change propagates without touching
a single component.

**Why resolve at build time.** `dist/lds.css` contains final values, not
`var()` chains. Simpler to read, fewer runtime lookups, and cycles fail the
build instead of silently producing an empty string.

**Cost.** Not the emerging DTCG standard, so Figma interop would need an export
step (on the roadmap). Three layers is more indirection than a flat file.

---

## 5. The generator emits data, not code

**Decision.** Go emits `LDS.define({...})` descriptors; `runtime/base.js` builds
the constructors.

**Why.** String-building JavaScript source in Go is unpleasant to write, worse
to read, and error-prone around escaping. Keeping the runtime as ordinary
JavaScript means it is debuggable in a browser, editable without touching Go,
and fixable in one place rather than regenerated into every component.

**Cost.** One extra indirection between the descriptor and the class. Class
names are restored via `Object.defineProperty` so devtools stay readable.

---

## 6. `dist/` is committed

**Decision.** Generated bundles are in version control.

**Why.** Go consumers embed them with `//go:embed`. `go get` must yield working
bundles with no build step, which is what makes adoption in a Go service a
two-line change.

**Cost.** Merge conflicts in generated files, and the risk of drift between
sources and output.

**Mitigation.** `make verify` rebuilds and fails if `git diff -- dist` is
non-empty. On conflict, regenerate rather than resolving by hand.

---

## 7. Fonts are vendored

**Decision.** Variable woff2 files committed to `assets/fonts/`, copied into
`dist/fonts/` at build time.

**Why.** No CDN dependency at runtime, no third-party request from a user's
browser (a GDPR consideration with Google Fonts), works offline and in
air-gapped deployments, and no flash of fallback text caused by a slow CDN.
Variable fonts mean one file per family covers every weight — 48 KiB and 22 KiB
for the latin subsets.

**Cost.** ~70 KiB of binaries in the repository, and refreshing them is manual
(`make fonts`). The fetch pulls from jsDelivr's mirror of the Fontsource
packages, which uses npm as a *CDN origin* — no npm binary runs, and after the
first fetch the build is fully offline.

---

## 8. The gallery is a Go server, not a static site

**Decision.** `lds serve` runs a live workbench; there is no static export.

**Why.** A full build takes single-digit milliseconds, so the server can
regenerate everything per request. That makes the edit loop a browser refresh
for every source type except Go, and eliminates staleness bugs entirely. Build
errors can be rendered into the browser rather than hiding in a terminal.

**Cost.** Not publishable as a static design-system site. That is a separate job
with different requirements, kept on the roadmap.

---

## 9. Layout stays in the light DOM

**Decision.** `lds-stack`, `lds-cluster` and friends are CSS classes, not
elements.

**Why.** A layout component would need to arrange elements the consuming page
created, which is exactly what shadow DOM prevents. Slotting everything through
a wrapper element to arrange it works, but adds a DOM layer and a styling
boundary for no benefit over a class that does the same thing.

**Cost.** Two idioms in one system — elements for components, classes for
layout. The line is clear enough to hold: if it arranges *your* content, it is a
class.

---

## 10. Utilities stay minimal

**Decision.** Layout primitives, typography helpers and a11y helpers only. No
spacing, colour or sizing utilities.

**Why.** A utility framework and a component library solve the same problem
twice, and the utilities always win because they are easier to reach for. That
ends with components nobody uses and a design system that is a palette with
extra steps.

**Cost.** One-off adjustments need inline styles or a consumer-side class.
Acceptable — and inline `style` using `--lds-*` tokens is fine.

---

## 12. Icons are a build-time SVG sprite

**Decision.** Drop Lucide SVGs in `assets/icons/`. The generator emits
`dist/icons.svg` (a `<symbol>` sprite) and `LDS.icons` (the name list).
`<lds-icon>` fetches the sprite once, injects it into the light DOM, and
references symbols with same-document `#lds-icon-{name}` fragments.

**Why.** One cacheable request, no FOUC from per-icon fetches, and unknown names
fail validation against the generated list. Icon fonts are rejected for
accessibility and rendering quality. Slot-only icons need no machinery but give
no consistency guarantee across LiDiSoft apps.

**Why light-DOM injection + clone.** External `<use href="icons.svg#…">` from
inside a shadow root is unreliable, and same-document `<use href="#…">` from a
shadow root only resolves IDs *inside that shadow tree*. The runtime therefore
injects the sprite into the document once, then each `<lds-icon>` clones the
matching `<symbol>`'s children into its own shadow SVG.

**Cost.** Every shipped icon grows `dist/icons.svg` and the embed. No per-app
tree-shaking. Adding an icon means editing the Makefile list, `make icons`, and
`make build`.

**Rejected alternatives.** Icon fonts; inline slot-only with no `lds-icon`;
embedding the sprite string inside `lds.js` (duplicates the artefact and bloats
the script).

---

## 13. Port 8081

**Decision.** The gallery defaults to 8081.

**Why.** `tocsin` already owns 8080 locally, and both will often run together.

Override with `PORT=… make dev`, `LDS_ADDR`, or `LDS_PORT` for compose.
