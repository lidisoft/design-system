# Consuming LDS

How a LiDiSoft application wires the design system in.

## Go services (the normal case)

Add the module and serve the embedded bundles:

```bash
go get github.com/lidisoft/design-system
```

```go
import lds "github.com/lidisoft/design-system"

mux.Handle("GET /lds/", lds.Handler("/lds/"))
```

With Gin, as in `tocsin`:

```go
router.StaticFS("/lds", http.FS(lds.FS()))
```

The prefix must match the mount point: `lds.css` resolves `fonts/…` relative to
its own URL, and `lds.js` resolves `icons.svg` relative to the script URL, so
mounting at `/lds/` and linking `/assets/lds.css` breaks both.

The bundles are compiled into the binary. No asset pipeline, no separate deploy,
no version skew between the app and its design system — the module version in
`go.mod` pins both.

### API

| Function | Use |
|----------|-----|
| `lds.Handler(prefix)` | `http.Handler` serving the bundles |
| `lds.FS()` | `fs.FS` rooted at `dist/` — `lds.css`, `lds.min.js`, `icons.svg`, `fonts/…` |
| `lds.Read(name)` | One file's bytes, e.g. to inline the CSS |

### In the document head

```html
<link rel="stylesheet" href="/lds/lds.css">
<script src="/lds/lds.js" defer></script>
```

Use `defer`, not `async`: it keeps execution after parsing without racing other
scripts. Custom elements upgrade whenever the definition lands, so markup can
appear before the script — see [Progressive enhancement](#progressive-enhancement).

`icons.svg` must sit next to `lds.js` under the same prefix. The runtime derives
its URL from the script's location and injects the sprite on first `<lds-icon>`.

```html
<lds-icon name="check"></lds-icon>
<lds-icon name="alert-triangle" label="Warning"></lds-icon>
```

For production, prefer the minified pair and preload the fonts you actually use
above the fold:

```html
<link rel="preload" href="/lds/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/lds/lds.min.css">
<script src="/lds/lds.min.js" defer></script>
```

## Static sites

Copy `dist/` into the site and link it. `lidisoft.github.io` is the case in
point: it currently inlines its own CSS and pulls fonts from Google. Migrating it
to LDS means deleting that `<style>` block and the `<link>` to Google Fonts.

## Server-rendered HTML

Components are ordinary tags in Go templates:

```html
{{range .Incidents}}
  <lds-card>
    <h3 slot="header">{{.Title}}</h3>
    <lds-badge intent="{{.Severity}}">{{.Severity}}</lds-badge>
    <lds-button variant="ghost" size="sm" data-id="{{.ID}}">Acknowledge</lds-button>
  </lds-card>
{{end}}
```

Nothing about LDS assumes client-side rendering. Attributes are strings, slots
are children — both are things a Go template already produces well.

## Progressive enhancement

Before `lds.js` executes, custom elements are unknown elements: they render, but
unstyled and inert. Slotted content is in the light DOM, so **text is present and
readable** — this is the main practical advantage of slots over rendering
everything from JS.

Two consequences worth designing for:

- Content in a slot survives a failed or slow script load. Content that only
  exists in the shadow template does not.
- There is a brief flash while definitions register. Mitigate the visible part
  with `:not(:defined)` when it matters:

  ```css
  lds-button:not(:defined) { visibility: hidden; }
  ```

  Use sparingly — hiding content that would otherwise be readable is usually a
  worse trade than the flash.

## Theming

```html
<html data-lds-theme="dark">
```

or at runtime:

```js
LDS.setTheme("dark");
LDS.setTheme(null);   // back to the base layer
```

Following the OS while allowing an override:

```js
const stored = localStorage.getItem("theme");
if (stored) {
  LDS.setTheme(stored);
} else if (matchMedia("(prefers-color-scheme: dark)").matches) {
  LDS.setTheme("dark");
}
```

Set the attribute in the server-rendered HTML when the preference is known —
applying it from JS after paint causes a visible flash.

## Customising

Three sanctioned levers, in ascending order of coupling.

**1. Override tokens.** Rethemes everything coherently:

```css
:root {
  --lds-color-accent-default: #7c5cff;
  --lds-radius-lg: 8px;
}
```

**2. Set a component's custom properties.** Documented per component in the
gallery:

```css
.hero lds-button { --lds-button-radius: 0; }
```

**3. Style a `::part()`.** For what the other two cannot reach:

```css
lds-button::part(button) { letter-spacing: 0.02em; }
```

What you **cannot** do is reach into a shadow root with a descendant selector.
That is the point of encapsulation. If none of the three levers suffices, the
component is missing a hook — open an issue rather than working around it.

## Listening to events

Component events are `composed: true`, so they cross the shadow boundary and
bubble normally:

```js
document.addEventListener("lds-dismiss", (event) => {
  console.log(event.target, event.detail);
});
```

Events are cancelable where cancellation is meaningful:

```js
button.addEventListener("lds-click", (event) => {
  if (!confirm("Close this incident?")) event.preventDefault();
});
```

## Versioning

`go.mod` pins the version, so bundles and application code move together.

- **Patch** — fixes with no API change.
- **Minor** — new components, new tokens, new attributes with defaults.
- **Major** — removed or renamed tokens, attributes, events or parts; changed
  default appearance.

Custom properties are part of the public API. A consuming app that sets
`--lds-button-radius` breaks if that property is renamed, and nothing will catch
it at compile time — hence the deprecation policy in
[design-tokens.md](design-tokens.md#renaming-and-removal).

## Browser support

See [conventions.md](conventions.md#browser-support). In short: evergreen
Chrome, Firefox, Safari and Edge. Constructable stylesheets and
`adoptedStyleSheets` are hard requirements with no fallback — Safari has
supported them since 16.4 (March 2023).
