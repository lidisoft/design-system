# Conventions

Naming, style and support rules. Where this document and a habit disagree, this
document wins.

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Tag | `lds-` + kebab-case noun | `lds-button`, `lds-radio-group` |
| Directory | tag without the prefix | `components/radio-group/` |
| Files | directory basename | `radio-group.toml`, `.html`, `.css`, `.js` |
| Attribute | kebab-case | `full-width`, `max-length` |
| Event | `lds-` + kebab-case | `lds-dismiss`, `lds-change` |
| CSS part | kebab-case, no prefix | `part="close-button"` |
| Custom property | `--lds-<component>-<role>` | `--lds-button-bg` |
| Token path | dotted, lowercase | `color.accent.default` |
| Utility class | `lds-` + kebab-case | `lds-stack` |
| Shadow-internal class | plain BEM, no prefix | `.btn`, `.btn__label` |

Shadow-internal class names are scoped by the shadow root, so prefixing them
adds noise for no benefit. Anything *outside* a shadow root — utilities,
custom properties — must be prefixed, because it shares the page's namespace.

### Attribute vocabulary

Reuse these names rather than inventing synonyms:

| Attribute | Values | Meaning |
|-----------|--------|---------|
| `variant` | component-specific | Visual treatment |
| `intent` | `info` `success` `warning` `danger` `neutral` | Semantic severity |
| `size` | `sm` `md` `lg` | Scale, from `control.*` tokens |
| `disabled` | boolean | Inoperable, out of the tab order |
| `loading` | boolean | Operation in flight, still focusable |
| `invalid` | boolean | Failed validation |
| `readonly` | boolean | Visible, not editable |
| `open` | boolean | Expanded or shown |
| `label` | string | Accessible name when there is no visible text |

`variant` and `intent` are different axes. A button's `variant` is
primary/secondary/ghost; an alert's `intent` is info/danger. Do not overload one
to mean the other.

## CSS

- Semantic tokens only. No hex values, no raw durations, no magic numbers.
- `px` is acceptable only for hairlines (`1px` borders).
- Always set `display` on `:host`, and always include
  `:host([hidden]) { display: none }`.
- Variants assign custom properties; a single rule applies them.
- Logical properties (`padding-inline`, `margin-block`) over physical ones.
- `:focus-visible`, never `:focus`, for focus rings.
- No `!important` in component CSS. In utilities it is occasionally justified;
  comment why.
- Nesting: keep it shallow. Shadow scoping means you rarely need more than one
  level.
- Motion via `--lds-transition-*`. Reduced motion is handled globally in the
  reset — do not re-handle it per component.

## JavaScript

- ES2022, no transpilation. Everything in the support matrix handles it.
- No dependencies. The runtime is dependency-free and stays that way.
- `const` by default, `let` when reassigned, never `var`.
- Behaviour files stay small. Anything over ~100 lines is a hint that logic
  belongs in the shared runtime.
- No `innerHTML` with anything but generator-controlled strings. Use
  `textContent` for dynamic values.
- Remove document- and window-level listeners in `disconnected`.
- Guard `attributeChanged` against firing before `connected`.

## Go

Follows the ecosystem conventions already set by `tocsin`:

- `cmd/<binary>/` for entry points, `internal/` for everything else.
- `gofmt` and `go vet` clean — `make check` enforces both.
- Errors wrapped with context: `fmt.Errorf("tokens: %s: %w", path, err)`.
- Exported identifiers documented; package doc comments on every package.
- Tests alongside the code they test.

## Comments

Comment the *why*, not the *what*. `// increment i` is noise; `// Behaviours
must precede definitions because customElements.define upgrades synchronously`
is the reason someone does not break it next month.

Every non-obvious workaround gets a comment explaining the constraint that
forced it. The shadow-DOM form-submission code in `button.js` is the model.

## Accessibility

WCAG 2.2 level AA is the floor, not the goal.

- Native elements first. `<button>`, `<dialog>`, `<details>`, `<table>`.
- Everything operable by keyboard; visible focus at all times.
- Colour is never the sole carrier of meaning.
- Contrast: 4.5:1 body text, 3:1 large text and UI boundaries, **in both themes**.
- Every control has an accessible name.
- Live regions for async updates; `aria-busy` on the region, not the spinner.
- Overlays trap focus, restore it on close, respond to `Escape`.
- Respect `prefers-reduced-motion` — handled globally, do not undo it.

The per-component checklist is in
[component-authoring.md](component-authoring.md#accessibility-checklist).

## Browser support

Evergreen Chrome, Firefox, Safari and Edge — current and previous major.

Hard requirements with no fallback:

| Feature | Floor |
|---------|-------|
| Custom elements v1 | Chrome 54, Firefox 63, Safari 10.1 |
| Shadow DOM v1 | Chrome 53, Firefox 63, Safari 10.1 |
| Constructable stylesheets / `adoptedStyleSheets` | Chrome 73, Firefox 101, **Safari 16.4** |
| CSS custom properties | Universal |
| `::part()` | Chrome 73, Firefox 72, Safari 13.1 |
| `woff2` | Universal |
| ES2022 | Chrome 94, Firefox 93, Safari 15.4 |

Safari 16.4 (March 2023) is the binding constraint. No polyfills, no legacy
build. If a floor ever needs to move down, it is a project-level decision, not a
per-component one.

## Commits

Matching the ecosystem's existing style (`doc:`, `feat:` in `tocsin`):

```
feat: add lds-alert
fix: keep loading buttons focusable
doc: document the token deprecation policy
refactor: extract the floating layer helper
```

Regenerate and commit `dist/` in the same commit as the source change. `make
verify` fails otherwise.
