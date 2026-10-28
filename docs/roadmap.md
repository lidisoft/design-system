# Roadmap

Sequenced work, ordered by what unblocks the most downstream. Specifications for
each component are in [components.md](components.md); how to build one is in
[component-authoring.md](component-authoring.md).

## Phase 0 — Bootstrap ✅

- [x] Go toolchain: token loader with alias resolution and cycle detection,
      component catalog, CSS/JS generator, minification, font vendoring
- [x] CLI: `build`, `serve`, `tokens`, `new`
- [x] Token layers: core palette, semantic roles, dark theme
- [x] Runtime: `LDS.define`, `LDS.behavior`, `LDS.setTheme`, `LDS.token`,
      element helpers
- [x] Reset, layout utilities, typography and a11y helpers
- [x] Vendored Inter and Space Grotesk variable woff2
- [x] Development gallery with stories, token tables and API documentation
- [x] `lds-button` as the reference component
- [x] Go consumer package with `//go:embed`
- [x] Docker + Air dev environment matching `tocsin`
- [x] Tests for token resolution and bundle generation
- [x] Documentation set

## Phase 1 — Make it usable

Enough to build a real screen. Everything here is unblocked today.

- [x] **`lds-field`** — label, help text, error, required marker, and the
      `aria-describedby` wiring the whole form group depends on.
- [x] **Icon strategy** — build-time Lucide SVG sprite (`assets/icons/` →
      `dist/icons.svg` + `LDS.icons`) and `<lds-icon>`. Unblocks anything that
      wants an icon.
- [x] **`lds-input`** — the second-most-used component after button.
- [x] **`lds-card`** — header/media/footer slots.
- [x] **`lds-badge`** — exercises the intent-role pattern end to end.
- [x] **`lds-alert`** — inline messaging.
- [x] **`lds-spinner`** — extract from the button's inline spinner.

At the end of this phase, rebuild one `tocsin` screen with LDS. That is the
honest test of whether the API works, and it will surface gaps faster than more
components will.

## Phase 2 — Forms and structure

- [x] **Form-associated custom elements in the runtime** —
      `form_associated` in component TOML → `static formAssociated` /
      `ElementInternals` / `delegatesFocus` in `LDS.define`.
- [x] `lds-textarea`, `lds-select`, `lds-checkbox`, `lds-radio-group`,
      `lds-switch`
- [x] `lds-table` — light-DOM `<table>`, sorting, sticky header, density
- [x] `lds-tabs` + `lds-tab-panel`
- [ ] `lds-empty-state`, `lds-stat`, `lds-skeleton`
- [x] **`lds-avatar` + `lds-avatar-group`** — image / initials / icon; stack + max
- [x] **`lds-tag`** — dismissible chip + `lds-remove`
- [x] `lds-divider`

## Phase 3 — Overlays and navigation

- [x] **Shared overlay helper in the runtime** — `LDS.overlay.bind` (Escape,
      outside click, light focus trap, focus restoration, optional `scrollLock`).
- [x] **Shared anchored-positioning helper** — `LDS.position` (placement, flip,
      clamp, matchWidth). Used by `lds-menu`; tooltip/popover/select next.
- [x] **`lds-modal`** — native `<dialog>` + scroll lock; drawer/confirm later
- [ ] `lds-drawer`, `lds-confirm` with `LDS.confirm()`
- [x] **`lds-toast` + `lds-toast-region` + `LDS.toast()`** — transient
      notifications; no overlay helper required
- [x] **`lds-menu`** — action list + `lds-menu-item`; account-menu composition
- [ ] `lds-tooltip`, `lds-popover`
- [ ] **`lds-navbar`** — top bar with brand/links/actions and compact toggle
      (first nav deliverable; no drawer dependency)
- [ ] **`lds-nav` + `lds-nav-item` + `lds-nav-group`** — sidebar with active
      items, collapsible groups and a collapsed icon rail
- [ ] **`lds-breadcrumb` + `lds-breadcrumb-item`** — hierarchy trail; collapses
      middle steps when narrow
- [x] **`lds-timeline`** — `lds-timeline-item` event rail
- [x] **`lds-progress`**, [x] **`lds-banner`**
- [x] **`lds-code`** — monospace block with copy
- [x] **`lds-pagination`** — summary, page-size select, ellipsis page buttons

## Phase 4 — Adoption

- [ ] Migrate `tocsin` fully onto LDS
- [ ] Migrate `lidisoft.github.io` — delete its inline `<style>` block and the
      Google Fonts `<link>`
- [ ] Tag `v1.0.0` once the API has survived both migrations

## Phase 5 — Later

Genuinely optional; none of it blocks shipping.

- [x] **`lds-command` + `lds-command-item` + `lds-command-group`** — global
      search palette (dedicated surface; general `lds-combobox` still later)
- [ ] `lds-combobox` — form filterable select (hardest remaining form control)
- [x] **`lds-date-picker`** — native `<input type="date">` (plus time /
      datetime-local / month / week); sufficient until a product needs a custom
      calendar grid
- [x] **Static export of the gallery as a public design-system site** —
      `make site` / `lds export`, deployed to GitHub Pages on tag push; see
      [gallery.md](gallery.md#static-export)
- [ ] Additional themes (high contrast; a marketing/inverse theme)

## Toolchain work

Independent of components, ordered by value.

- [x] **Automated contrast checking.** `TestContrastMeetsWCAG` in
      `internal/tokens` asserts WCAG AA on every listed `fg`/`bg` pairing in
      both themes; see [design-tokens.md](design-tokens.md#contrast).
- [ ] **CI pipeline.** Release automation on pushed `v*` tags is in place:
      releases now run a quality gate, generate notes from commits since the
      previous tag, and publish `dist/` archives on GitHub. Still missing:
      `make check` on every push. `make verify` is the load bearing part — it
      fails when `dist/` drifts from the sources.
- [ ] **A component linter.** Fail the build on a hex value in component CSS, a
      missing `display` on `:host`, an undocumented `part`, or an attribute in
      the template that is not declared in the TOML. Mechanically enforces most
      of [conventions.md](conventions.md).
- [ ] **Token diffing.** `lds tokens --diff <ref>` to show what changed between
      versions, so deprecations are visible at release time.
- [ ] **DTCG export.** Emit the token set in the Design Tokens Community Group
      format for Figma interoperability. Worth doing only if design tooling
      actually needs it.
- [ ] **Browser-based component tests.** The real gap: the JS parsers catch
      syntax errors only, so component behaviour has no automated coverage.
      Would need a headless browser — weigh that dependency against the risk.

## Known limitations

Recorded honestly rather than discovered later.

| Limitation | Consequence | Mitigation |
|-----------|-------------|------------|
| No JS type checking | Reference and type errors surface at runtime | Keep behaviours small; exercise them in stories |
| No component tests | Behaviour regressions are caught by eye | Browser tests, if the dependency is judged worthwhile |
| Contrast is checked per listed pair | A component using a role on an unlisted surface is not covered | Add the pair to `internal/tokens/contrast_test.go` |
| Form association is opt-in per control | Non-FACE elements still cannot submit | Set `form_associated = true` in the component TOML |
| `dist/` is committed | Merge conflicts in generated files | Regenerate on conflict; never hand-edit |
| Inline stories | Gallery page styles are visible to stories | Avoid context-dependent stories |
