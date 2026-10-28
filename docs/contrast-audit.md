# Contrast audit

Text and focus-indicator pairs that fall below WCAG 2.2 AA, measured from the
resolved tokens at `0628d56` (2026-10-28). Found while importing LDS into a
Claude Design system for Horizon. See [design-tokens.md](design-tokens.md#contrast)
for the rule this checks.

Thresholds: 4.5:1 for body text, 3:1 for large text (24px+, or 19px+ bold) and
for focus indicators and UI boundaries. Translucent dark-theme fills are blended
over `color.bg.canvas` before measuring.

## Failing pairs

| # | Foreground | Background | Light | Dark | Needed |
|---|------------|------------|-------|------|--------|
| 1 | `color.fg.on-accent` (`#ffffff`) | `color.accent.default` | 2.9:1 | 2.4:1 | 4.5:1 |
| 1 | `color.fg.on-accent` | `color.danger.default` | 2.9:1 | 2.5:1 | 4.5:1 |
| 1 | `color.fg.on-accent` | `color.success.default` | 3.1:1 | 2.6:1 | 4.5:1 |
| 2 | `color.focus.ring` | `color.bg.canvas` | 2.9:1 | 7.7:1 | 3:1 |
| 2 | `color.focus.ring` | `color.bg.subtle` | 2.7:1 | 8.2:1 | 3:1 |
| 2 | `color.focus.ring` | `color.bg.muted` | 2.5:1 | — | 3:1 |
| 3 | `color.fg.subtle` | `color.bg.canvas` / `raised` | 3.6:1 | 5.0:1 / 4.5:1 | 4.5:1 |
| 3 | `color.fg.subtle` | `color.bg.subtle` | 3.4:1 | 5.3:1 | 4.5:1 |
| 4 | `color.fg.link` | `color.bg.canvas` / `raised` | 4.2:1 | 9.4:1 / 8.5:1 | 4.5:1 |
| 4 | `color.fg.link` | `color.bg.subtle` | 3.9:1 | 9.9:1 | 4.5:1 |

## Impact

1. **Labels on solid fills** — every primary button (`lds-button
   variant="primary"`), solid badge and solid danger/success control. Labels use
   `control.font-size.*` (14–16px), so the large-text exception does not apply.
   Worst in dark mode, where intents lighten one step (`blue.400` etc.).
2. **Focus ring in the light theme** — `blue.500` is too light against near-white
   surfaces, so keyboard focus is hard to see on every focusable component.
3. **`fg.subtle` in the light theme** — fine for disabled-adjacent hints only if
   they are not needed to understand the UI; placeholders and timestamps use it
   today.
4. **Links in the light theme** — `blue.600` is just short on canvas and
   noticeably short on `bg.subtle` (sidebars, table headers).

The dark theme passes for 2, 3 and 4.

Not in the original measurement: solid **warning** badges and tags put white on
`warning.default` (1.5:1 in both themes), and the dark-theme solid neutral badge
and tag put white on `fg.muted` (2.2:1).

## Decisions

Reviewed 2026-10-28.

1. **On-accent text: kept as is.** White on the solid accent, success and danger
   fills is a deliberate choice for a bright look, accepted below AA. The floor
   is 2:1: anything below it is fixed. That covers only the solid warning
   badge and tag, which now use a new `color.fg.on-warning` (`gray.900`,
   12.0:1 light, 12.5:1 dark). The dark solid neutral badge (2.2:1) is kept.
2. **Focus ring:** `blue.600` in the light theme: 4.2:1 on canvas, 3.9:1 on
   `bg.subtle`, 3.7:1 on `bg.muted`. Dark is unchanged.
3. **`fg.subtle`:** new core step `gray.550` (`#646e80`) in the light theme:
   5.1:1 on canvas, 4.8:1 on `bg.subtle`, 4.5:1 on `bg.muted`. Dark is unchanged.
4. **Links:** `blue.700` in the light theme: 6.2:1 on canvas, 5.8:1 on
   `bg.subtle`. Dark is unchanged.

`TestContrastMeetsWCAG` in `internal/tokens` now asserts these pairs in both
themes. The accepted on-accent pairs are listed in its `accepted` map with the
2:1 floor.

## Chart tokens (2026-10-28)

Added `color.chart.*` for Horizon. Light `abandoned` uses `coral.600` (4.1:1 on
canvas) because `coral.500` measured 2.9:1. `unstarted` stays below 3:1 by
choice (2.2:1 light, 2.4:1 dark): raising it to `gray.500` passed contrast but
failed the normal-vision separation check against `started` (ΔE 10.4 light,
11.8 dark, floor 15). It is in the test's `accepted` map at a 2:1 floor, and
charts using it must label values or offer a table view.
