# Component inventory

Everything LDS needs to cover the LiDiSoft UI. Sequencing is in
[roadmap.md](roadmap.md); this document is the specification of *what* each
component is and where its edges are.

Scope is driven by the real consumers: `tocsin` (incident alerting and on-call —
tables, timelines, forms, modals, status), plus the general application chrome
every LiDiSoft service needs.

## Status

| Component | Status |
|-----------|--------|
| `lds-button` | **stable** — the reference implementation |
| `lds-icon` | **beta** — build-time Lucide sprite |
| `lds-navbar` | **draft** — top bar with compact toggle |
| `lds-nav` | **draft** — sidebar with item + group |
| `lds-nav-item` | **draft** — sidebar destination |
| `lds-nav-group` | **draft** — collapsible sidebar section |
| `lds-breadcrumb` | **draft** — hierarchy trail with middle collapse |
| `lds-breadcrumb-item` | **draft** — breadcrumb step |
| `lds-toast` | **draft** — transient notification card |
| `lds-toast-region` | **draft** — toast stack + `LDS.toast()` |
| `lds-avatar` | **draft** — image / initials / icon identity |
| `lds-avatar-group` | **draft** — overlapping stack + max overflow |
| `lds-menu` | **draft** — action menu from a trigger |
| `lds-menu-item` | **draft** — menu action or link |
| `lds-table` | **draft** — light-DOM table, density, sticky, sort |
| `lds-pagination` | **draft** — page controls for lists and tables |
| `lds-badge` | **draft** — intent status label |
| `lds-tag` | **draft** — dismissible chip |
| `lds-spinner` | **draft** — indeterminate progress |
| `lds-divider` | **draft** — visual separator |
| `lds-command` | **draft** — global search / command palette |
| `lds-command-item` | **draft** — command palette option |
| `lds-command-group` | **draft** — labelled command section |
| `lds-card` | **draft** — grouped content surface |
| `lds-code` | **draft** — code block with copy |
| `lds-tabs` | **draft** — tablist + panels |
| `lds-tab-panel` | **draft** — one tab view |
| `lds-timeline` | **draft** — chronological event list |
| `lds-timeline-item` | **draft** — timeline event |
| `lds-modal` | **draft** — blocking dialog |
| `lds-progress` | **draft** — linear / circular progress |
| `lds-banner` | **draft** — full-bleed page announcement |
| `lds-alert` | **draft** — inline persistent message |
| `lds-field` | **draft** — label, help, error wrapper |
| `lds-input` | **draft** — form-associated text |
| `lds-textarea` | **draft** — form-associated multi-line |
| `lds-select` | **draft** — form-associated native select |
| `lds-checkbox` | **draft** — form-associated boolean |
| `lds-radio-group` | **draft** — form-associated one-of-many |
| `lds-switch` | **draft** — form-associated immediate toggle |
| everything else | not started |

## Foundations (not components)

Shipped in `dist/lds.css`, no custom element involved.

| Thing | Where | Notes |
|-------|-------|-------|
| Tokens | `tokens/*.toml` | Complete |
| Reset | `runtime/reset.css` | Complete |
| Fonts | `assets/fonts/` | Complete — Inter + Space Grotesk, vendored |
| Icons | `assets/icons/` | Complete — Lucide subset → `dist/icons.svg` |
| Layout utilities | `runtime/utilities.css` | `lds-container`, `lds-stack`, `lds-cluster`, `lds-split`, `lds-grid`, `lds-prose` |
| Typography helpers | `runtime/utilities.css` | `lds-display`, `lds-title`, `lds-eyebrow`, `lds-lead`, `lds-muted`, `lds-subtle` |
| A11y helpers | `runtime/utilities.css` | `lds-visually-hidden`, `lds-skip-link` |
| Table (light DOM) | `runtime/table.css` | Cell/header styles for `<lds-table>` descendants |

Layout stays in the light DOM deliberately: a component cannot arrange elements
the page created. Resist any urge to add `<lds-stack>`.

## Primitives

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-button` | Actions | **Done.** variant, size, type, disabled, loading, full-width, pill, label |
| `lds-icon` | Inline iconography | **Done.** `name`, `size`, `label`; sprite from `assets/icons/` |
| `lds-badge` | Short status labels | **Done (draft).** intent, variant (subtle/solid/outline), size |
| `lds-tag` | Removable chips, filters | **Done (draft).** Badge-shaped; dismissible + `lds-remove` |
| `lds-avatar` | User/team identity | **Done (draft).** image, initials, icon fallback, size, shape; `lds-avatar-group` for stacks |
| `lds-spinner` | Indeterminate progress | **Done (draft).** size, label; `aria-busy` on the region, not the spinner |
| `lds-divider` | Visual separation | **Done (draft).** orientation; optional inline label slot |
| `lds-kbd` | Keyboard shortcuts | Trivial, but recurring in help and command surfaces |

### Icons

Icons ship as a **build-time SVG symbol sprite**. Drop Lucide SVGs in
`assets/icons/`, run `make build`, and reference them with:

```html
<lds-icon name="check"></lds-icon>
<lds-icon name="alert-triangle" label="Warning"></lds-icon>
```

The generator emits `dist/icons.svg` and `LDS.icons`. The runtime injects the
sprite into the light DOM once; each `<lds-icon>` clones the matching symbol
into its shadow root. See
[decisions.md §12](decisions.md#12-icons-are-a-build-time-svg-sprite).

Icon fonts were rejected. Slot-only icons (no `lds-icon`) remain valid for
one-off adornments that are not part of the system set.

## Forms

The largest and most delicate group. Every one of these must participate in real
forms — see the form-association note in
[component-authoring.md](component-authoring.md#shadow-dom-what-actually-bites).

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-field` | Label, help text, error, required marker | **Done (draft).** Owns `aria-describedby` / `aria-invalid` wiring |
| `lds-input` | Single-line text | **Done (draft).** FACE; type, size, prefix/suffix, invalid |
| `lds-textarea` | Multi-line | **Done (draft).** FACE; auto-grow, rows, maxlength counter |
| `lds-select` | Single choice | **Done (draft).** FACE; clones light-DOM `<option>`s into native `<select>` |
| `lds-checkbox` | Boolean | **Done (draft).** FACE; indeterminate supported |
| `lds-radio-group` | One of several | **Done (draft).** FACE; roving tabindex + arrows |
| `lds-switch` | Immediate toggle | **Done (draft).** FACE; distinct from checkbox |
| `lds-combobox` | Filterable choice | Hardest in the set; needs `lds-listbox` and full `aria-activedescendant` |
| `lds-date-picker` | Dates | Consider native `<input type="date">` first |

**Build `lds-field` first.** Doing it last means retrofitting label and error
wiring into every control. Form controls use `form_associated = true` in TOML
so the runtime attaches `ElementInternals`.

## Layout and containers

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-card` | Grouped content | **Done (draft).** header/media/footer slots, interactive variant |
| `lds-panel` | Page section with a heading | Card without the elevation |
| `lds-tabs` | Sibling views | **Done (draft).** `lds-tab-panel` children; arrow keys, roving tabindex |
| `lds-accordion` | Progressive disclosure | Built on `<details>`; single or multi expand |
| `lds-scroll-area` | Constrained scrolling | Only if native scrollbars prove insufficient |

## Navigation

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-navbar` | Top bar | Brand / links / actions slots; auto or forced compact with an inline toggle panel. Active page via `aria-current="page"` on slotted links |
| `lds-nav` | App sidebar | Brand / items / footer; `collapsed` icon rail via inherited CSS variables |
| `lds-nav-item` | Sidebar destination | `href`, `active`, `disabled`; start/end slots for icons |
| `lds-nav-group` | Collapsible section | `label`, `open`; trigger hides in a collapsed parent nav |
| `lds-breadcrumb` | Hierarchy trail | Collapses middle steps behind an ellipsis when narrow; `expanded`, `max-items` |
| `lds-breadcrumb-item` | Breadcrumb step | `href`, `current`; leading separator hides on the first item |
| `lds-menu` | Dropdown actions | **Done (draft).** `lds-menu-item`, `<hr>` separators; keyboard arrows; account-menu composition |
| `lds-tooltip` | Supplementary hints | Never the only source of information |
| `lds-command` | Command palette | **Done (draft).** Filterable modal search; `lds-command-item` / `lds-command-group`; `LDS.command()` + optional ⌘/Ctrl+K |
| `lds-command-item` | Palette option | value, keywords, href, disabled; start/end slots |
| `lds-command-group` | Palette section | heading; hides when all children filtered out |

`lds-menu`, `lds-tooltip`, `lds-select` and `lds-combobox` share anchored
floating-layer logic via `LDS.position` / `LDS.overlay` in the runtime (started
with `lds-menu`). CSS anchor positioning is not yet safe across the support
matrix.

## Data display

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-table` | Tabular data | **Done (draft).** Light-DOM `<table>`; density, sticky header, striped, sortable columns |
| `lds-pagination` | Paging | **Done (draft).** Summary, page-size select, ellipsis page list; `lds-page-change` / `lds-page-size-change` |
| `lds-empty-state` | Nothing to show | Icon, title, description, action slots |
| `lds-stat` | Single metric | Value, label, delta with direction |
| `lds-timeline` | Chronological events | **Done (draft).** `lds-timeline-item`; rail + intent markers |
| `lds-code` | Code and payloads | **Done (draft).** Copy button; no syntax highlighting |
| `lds-skeleton` | Loading placeholder | Shape variants; respects reduced motion |

`lds-table` is the one to think hardest about. Putting rows in a shadow root
breaks text selection across cells, browser find-in-page and screen-reader table
semantics. Keep the `<table>` in the light DOM and have the component supply
chrome and behaviour around it.

## Feedback

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-alert` | Inline, persistent messages | **Done (draft).** intent, dismissible; title/description/actions/icon slots |
| `lds-toast` | Transient notifications | intent, duration, dismissible; compose in `lds-toast-region` or call `LDS.toast()` |
| `lds-toast-region` | Toast stack host | placement corners; auto-created by `LDS.toast()`; Escape dismisses newest |
| `lds-progress` | Determinate progress | **Done (draft).** Linear and circular; `value`/`max`, indeterminate mode |
| `lds-banner` | Page-level announcements | **Done (draft).** Full-bleed; intent, dismissible, sticky; title/action/icon slots |

## Overlays

All four share focus trapping, scroll locking, `Escape` handling and focus
restoration. Write that once in the runtime.

| Tag | Purpose | Notes |
|-----|---------|-------|
| `lds-modal` | Blocking dialog | **Done (draft).** Native `<dialog>`; size, dismissible, header/body/footer |
| `lds-drawer` | Side panel | Modal by another name plus placement; share the implementation |
| `lds-popover` | Non-modal floating panel | Anchored; needs the positioning helper |
| `lds-confirm` | Destructive confirmation | Thin promise-returning wrapper over modal — `LDS.confirm()` |

## What LDS will not ship

Saying no keeps the surface honest.

- **A grid system.** `lds-grid` and CSS Grid are enough.
- **A utility framework.** Utilities stay layout- and typography-only.
- **Charts.** Out of scope; a consuming app owns its visualisations.
- **A rich text editor.** Far too large; use a dedicated library.
- **Page templates.** Composition belongs to the consuming app.
- **`<lds-stack>` and friends as elements.** Layout stays in the light DOM.
