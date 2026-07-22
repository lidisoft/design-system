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

- [ ] **`lds-field`** — label, help text, error, required marker, and the
      `aria-describedby` wiring the whole form group depends on. **Do this
      first**; retrofitting it later means touching every control.
- [x] **Icon strategy** — build-time Lucide SVG sprite (`assets/icons/` →
      `dist/icons.svg` + `LDS.icons`) and `<lds-icon>`. Unblocks anything that
      wants an icon.
- [ ] **`lds-input`** — the second-most-used component after button.
- [ ] **`lds-card`** — header/media/footer slots.
- [ ] **`lds-badge`** — exercises the intent-role pattern end to end.
- [ ] **`lds-alert`** — inline messaging.
- [ ] **`lds-spinner`** — extract from the button's inline spinner.

At the end of this phase, rebuild one `tocsin` screen with LDS. That is the
honest test of whether the API works, and it will surface gaps faster than more
components will.

## Phase 2 — Forms and structure

- [ ] **Form-associated custom elements in the runtime** —
      `static formAssociated = true` and `ElementInternals`, so inputs
      participate in real form submission and validation. Every form component
      after this point depends on it, and retrofitting is expensive. **Do this
      before `lds-select` and `lds-checkbox`.**
- [ ] `lds-textarea`, `lds-select`, `lds-checkbox`, `lds-radio-group`,
      `lds-switch`
- [ ] `lds-table` — light-DOM `<table>`, sorting, sticky header, density
- [ ] `lds-tabs` + `lds-tab-panel`
- [ ] `lds-empty-state`, `lds-stat`, `lds-skeleton`
- [ ] `lds-avatar` + `lds-avatar-group`, `lds-tag`, `lds-divider`

## Phase 3 — Overlays and navigation

- [ ] **Shared overlay helper in the runtime** — focus trap, scroll lock,
      `Escape`, focus restoration. Write it once; `lds-modal`, `lds-drawer`,
      `lds-popover` and `lds-menu` all need exactly this.
- [ ] **Shared anchored-positioning helper** — `lds-menu`, `lds-tooltip`,
      `lds-select` and `lds-combobox` all need it. Extract on the first
      component, not the third. CSS anchor positioning is not yet safe across
      the support matrix, so this is manual.
- [ ] `lds-modal`, `lds-drawer`, `lds-confirm` with `LDS.confirm()`
- [ ] `lds-toast` with a host singleton and `LDS.toast()`
- [ ] `lds-menu`, `lds-tooltip`, `lds-popover`
- [ ] **`lds-navbar`** — top bar with brand/links/actions and compact toggle
      (first nav deliverable; no drawer dependency)
- [ ] **`lds-nav` + `lds-nav-item` + `lds-nav-group`** — sidebar with active
      items, collapsible groups and a collapsed icon rail
- [ ] `lds-breadcrumb`
- [ ] `lds-timeline` — needed by tocsin's incident history
- [ ] `lds-progress`, `lds-pagination`, `lds-banner`, `lds-code`

## Phase 4 — Adoption

- [ ] Migrate `tocsin` fully onto LDS
- [ ] Migrate `lidisoft.github.io` — delete its inline `<style>` block and the
      Google Fonts `<link>`
- [ ] Tag `v1.0.0` once the API has survived both migrations

## Phase 5 — Later

Genuinely optional; none of it blocks shipping.

- [ ] `lds-combobox` and `lds-command` — the hardest components in the inventory
- [ ] `lds-date-picker`, after checking whether native `<input type="date">` is
      sufficient
- [ ] Static export of the gallery as a public design-system site
- [ ] Additional themes (high contrast; a marketing/inverse theme)

## Toolchain work

Independent of components, ordered by value.

- [ ] **Automated contrast checking.** Assert WCAG AA on every `fg`/`bg`
      pairing in both themes, as a Go test over the resolved token set. Cheap to
      write, catches a whole class of regression, and removes the manual step
      currently described in [design-tokens.md](design-tokens.md#contrast).
- [ ] **CI pipeline.** `make check` on every push. `make verify` is the load
      bearing part — it fails when `dist/` drifts from the sources.
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
| No contrast automation | A token change can quietly break AA | Automate — first item under toolchain work |
| No form association yet | Form controls cannot participate in real forms | Phase 2, before any input component |
| `dist/` is committed | Merge conflicts in generated files | Regenerate on conflict; never hand-edit |
| Inline stories | Gallery page styles are visible to stories | Avoid context-dependent stories |
