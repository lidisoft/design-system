# Authoring a component

The guide to follow when building anything in `components/`. Read
`components/button/` alongside it — that component is deliberately the worked
example for every pattern described here.

## Scaffold

```bash
make new name=alert category=feedback
```

Creates `components/alert/` with four files. The directory name is the tag
without the `lds-` prefix, and all four files share that basename.

| File | Required | Purpose |
|------|----------|---------|
| `alert.toml` | yes | Metadata, public API, gallery stories |
| `alert.html` | yes | Shadow DOM template |
| `alert.css` | yes | Shadow DOM styles |
| `alert.js` | no | Behaviour — **delete it if the component needs none** |

Discovery is automatic. There is no registry file to update, no import to add.
Directories starting with `.` or `_` are skipped.

Then run `make dev` and open the component's page. In dev mode sources are
re-read per request, so a browser refresh is the whole edit loop.

## 1. Metadata — `alert.toml`

```toml
tag = "lds-alert"           # required, must start with "lds-"
name = "Alert"              # display name in the gallery
category = "feedback"       # sidebar grouping
status = "draft"            # draft | beta | stable | deprecated
summary = "One sentence on what this is for."

description = """
Longer prose. When to reach for it, when to reach for something else.
"""

a11y = """
Keyboard interaction, roles, and what the caller is responsible for.
"""
```

Categories, in sidebar order: `foundations`, `primitives`, `forms`, `layout`,
`navigation`, `data`, `feedback`, `overlays`.

Start at `draft`. Promote to `beta` when the API has settled, `stable` when it
is in production and you are prepared to treat changes as breaking.

### Attributes

Each entry becomes an entry in `observedAttributes`, a row in the gallery's API
table, and — if it has a `default` — an attribute reflected onto the host at
first connect.

```toml
[[attributes]]
name = "intent"
type = "enum"                                   # string | boolean | number | enum
values = ["info", "success", "warning", "danger"]
default = "info"
description = "Severity. Drives colour only; it is not announced."
```

**Declaring a `default` matters.** The runtime writes it onto the host so
`:host([intent="info"])` matches a bare `<lds-alert>`. Without it you would need
`:host(:not([intent]))` fallbacks in every rule.

Boolean attributes take no `default` — absence is false. Read them with
`el.boolAttr("dismissible")`, which treats a literal `"false"` as false so
server-rendered `dismissible="false"` behaves sanely.

### Slots, events, parts, custom properties

```toml
[[slots]]
name = ""                   # empty string is the default slot
description = "Alert body."

[[events]]
name = "lds-dismiss"        # always prefixed lds-, always kebab-case
detail = "{ reason: string }"
description = "Fired when the alert is dismissed. Cancel to keep it open."

[[parts]]
name = "close"
description = "The dismiss button."

[[css_vars]]
name = "--lds-alert-bg"
default = "per intent"
description = "Background. Set for a one-off colour without adding an intent."
```

These four tables *are* the public API. If it is not listed here, consumers must
not depend on it — and the gallery is what tells them.

### Stories

Stories are the component's test surface. The gallery renders each one live and
can reveal its source.

```toml
[[stories]]
name = "Intents"
description = "Why a reader would pick one over another."
html = """
<div class="lds-stack">
  <lds-alert intent="info">Deploy queued.</lds-alert>
  <lds-alert intent="danger">Rollback failed.</lds-alert>
</div>
"""
```

Cover, at minimum:

- every variant/intent
- every size
- every state (disabled, loading, error, empty, selected)
- long content and overflow — the case that breaks layouts
- composition with other LDS components
- an interactive story for anything with behaviour

Use the layout utilities (`lds-stack`, `lds-cluster`, `lds-grid`) to arrange
stories. Inline `style` is acceptable inside a story where it demonstrates
something; it is not acceptable in component CSS.

## 2. Template — `alert.html`

A plain fragment. No `<template>` wrapper — the runtime supplies it.

```html
<div class="root" part="root" role="status">
  <span class="icon" part="icon" aria-hidden="true"></span>
  <div class="body" part="body"><slot></slot></div>
  <slot name="actions"></slot>
</div>
```

- **Use real elements.** A `<button>` inside the shadow root brings keyboard
  activation, focus and the right role for free. Never `<div role="button">`.
- **Expose `part` on anything a consumer might reasonably restyle** — and then
  document it. A part is a commitment.
- **Static ARIA belongs in the template**; anything that changes is set by
  behaviour.

## 3. Styles — `alert.css`

Adopted into the shadow root, so selectors are scoped and can stay short.

### The variant pattern

Do not write a rule block per variant. Assign custom properties on `:host` and
apply them once:

```css
:host {
  --lds-alert-bg: var(--lds-color-accent-subtle);
  --lds-alert-fg: var(--lds-color-accent-fg);
  display: block;
}

:host([intent="danger"]) {
  --lds-alert-bg: var(--lds-color-danger-subtle);
  --lds-alert-fg: var(--lds-color-danger-fg);
}

.root {
  background: var(--lds-alert-bg);
  color: var(--lds-alert-fg);
  padding: var(--lds-space-4);
  border-radius: var(--lds-radius-md);
}
```

Adding an intent becomes two lines, and consumers get a documented override hook
for free. This works because the intent roles are uniform across every intent —
see [design-tokens.md](design-tokens.md#intent-roles-are-uniform).

### Non-negotiables

- **Semantic tokens only.** No hex, no `px` outside `1px` hairlines, no raw
  durations. Reach for `--lds-space-*`, `--lds-color-*`, `--lds-control-*`.
- **Always set `display` on `:host`.** Custom elements default to `inline`,
  which is almost never what you want. Include `:host([hidden]) { display: none }`
  — otherwise `hidden` does nothing, because your `:host` rule overrides it.
- **Shared geometry comes from `control.*`.** A component with a control height
  that is not `var(--lds-control-height-md)` will not line up with a button.
- **Focus uses the shared ring:** `outline: var(--lds-focus-width) solid
  var(--lds-color-focus-ring); outline-offset: var(--lds-focus-offset);` on
  `:focus-visible`. Never `outline: none` without a replacement.
- **Transitions use `--lds-transition-control` or `--lds-transition-surface`.**
  Reduced motion is handled globally in the reset; do not re-handle it.
- **Style slotted content with `::slotted()` sparingly.** It matches only
  top-level assigned nodes and loses to the page's own styles. Layout of slotted
  content is fine; typography and colour usually are not.

## 4. Behaviour — `alert.js`

Only when the platform does not already do the job. A component that just needs
styling gets no `.js` file.

```js
LDS.behavior("lds-alert", {
  connected(el) { ... },
  disconnected(el) { ... },
  attributeChanged(el, name, prev, next) { ... },
});
```

Every hook receives the host element. All are optional.

### Element helpers

| Helper | Returns |
|--------|---------|
| `el.$(sel)` | First match in the shadow root |
| `el.$$(sel)` | All matches, as an array |
| `el.boolAttr(name)` | Boolean attribute, treating `"false"` as false |
| `el.emit(name, detail)` | Dispatches a composed, bubbling, cancelable event; returns it |

### Ordering

`attributeChanged` can fire **before** `connected` — `attributeChangedCallback`
runs during parsing, `connectedCallback` after the shadow root is populated.
Guard accordingly:

```js
attributeChanged(el, name) {
  const button = el.$(".btn");
  if (!button) return;   // changed before first connect
  ...
}
```

### Cleanup

Listeners on the host or on shadow children die with the element. Listeners on
`document`, `window` or a `ResizeObserver` do not — remove them in
`disconnected`, or a page that adds and removes components leaks.

### Events

Prefix `lds-`, kebab-case, past or present tense consistently. `emit` returns
the event so you can honour cancellation:

```js
const event = el.emit("lds-dismiss", { reason: "user" });
if (event.defaultPrevented) return;
el.remove();
```

Helper functions declared at the top level of the file are private — the
generator wraps each behaviour in its own closure.

## Shadow DOM: what actually bites

Three problems that will come up and have non-obvious answers.

**Forms do not cross the boundary.** A `<button type="submit">` in a shadow root
will not submit the surrounding form. `lds-button` solves this by finding
`el.closest("form")` and calling `requestSubmit()` — `requestSubmit()`, not
`submit()`, because only the former runs validation and fires the `submit`
event. Form-*input* components have the harder version of this problem and
should use form-associated custom elements (`static formAssociated = true`,
`ElementInternals`); this is not yet wired into the runtime and is tracked in
[roadmap.md](roadmap.md).

**CSS cannot tell whether a slot has content.** `:empty` looks at a slot's
fallback children, not its assigned nodes. When styling depends on it, set an
attribute from JS on `slotchange` and key off that — see `watchDefaultSlot` in
`button.js`.

**A disabled host still receives clicks.** Only the inner control is disabled;
the host is not, so clicks bubble to page listeners. Stop them on the host with
a capture-phase listener, as `button.js` does.

## Accessibility checklist

Before promoting past `draft`:

- [ ] Reachable and operable by keyboard alone; focus order is sensible
- [ ] Focus is always visible, using the shared ring tokens
- [ ] Native elements used where one exists
- [ ] Accessible name for every control; icon-only variants take a `label`
      attribute applied as `aria-label`
- [ ] State changes reflected in ARIA (`aria-expanded`, `aria-busy`,
      `aria-selected`)
- [ ] Colour is never the only carrier of meaning
- [ ] Contrast meets WCAG 2.2 AA in **both** themes
- [ ] Overlays trap focus, restore it on close, and close on `Escape`
- [ ] The `a11y` field in the TOML documents what the caller must provide

## Definition of done

- [ ] Four (or three) files, all named after the directory
- [ ] `make build` succeeds
- [ ] Stories cover variants, sizes, states, overflow and composition
- [ ] Renders correctly in light and dark, checked in the gallery
- [ ] No hex values, no magic numbers, no `px` beyond hairlines
- [ ] Attributes, slots, events, parts and custom properties all documented
- [ ] Accessibility checklist passed
- [ ] `make check` is green
- [ ] `dist/` rebuilt and committed in the same change
