# Vendored fonts

Two variable woff2 files, committed so builds never depend on a font CDN at
runtime and the design system works offline and inside air-gapped deployments.

| File | Family | Axes | Subset | Size |
|------|--------|------|--------|------|
| `Inter-Variable.woff2` | Inter | `wght 100–900` | latin | ~48 KiB |
| `SpaceGrotesk-Variable.woff2` | Space Grotesk | `wght 300–700` | latin | ~22 KiB |

Inter carries body copy; Space Grotesk carries display type and eyebrows. Both
match what `lidisoft.com` already loads from Google Fonts, so the marketing site
and the product UI render identically.

## Refetching

```bash
make fonts
```

That pulls the [Fontsource](https://fontsource.org) builds via jsDelivr. This
uses the npm registry purely as a CDN origin — no npm binary runs, nothing is
installed, and once the files are committed the build is fully offline.

The URLs live in the `Makefile` under `INTER_URL` and `GROTESK_URL`.

## Licences

Both families are licensed under the SIL Open Font License 1.1, which permits
redistribution of the font files alongside this repository.

- Inter — © The Inter Project Authors, <https://github.com/rsms/inter>
- Space Grotesk — © Florian Karsten, <https://github.com/floriankarsten/space-grotesk>

## Adding a subset or an axis

1. Point the relevant `*_URL` in the `Makefile` at the file you want.
2. Run `make fonts`.
3. Update the `@font-face` block in `runtime/reset.css` — the `font-weight`
   range there must match the font's actual `wght` axis, or the browser will
   synthesise weights and the type will look wrong at the extremes.
4. Run `make build` so `dist/fonts/` picks the new files up.

Only `.woff2` is shipped. Every browser in the support matrix
(`docs/conventions.md`) has supported it since 2020, so a `.woff` fallback would
be dead weight.
