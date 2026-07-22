# Vendored icons

SVG sources for the build-time symbol sprite. The generator reads every `*.svg`
here and emits `dist/icons.svg` plus `LDS.icons` in the JS bundle.

| Convention | Rule |
|------------|------|
| Filename | kebab-case; basename is the `<lds-icon name="…">` value |
| Format | Lucide 24×24 stroke SVGs using `currentColor` |
| Colour | Never bake a fill/stroke colour in — inherit via `currentColor` |

## Refetching

```bash
make icons
```

That pulls the curated list from [lucide-static](https://www.npmjs.com/package/lucide-static)
v1.25.0 via jsDelivr. The list lives in the `Makefile` under `ICONS`. This uses the npm
registry purely as a CDN origin — no npm binary runs, nothing is installed, and
once the files are committed the build is fully offline.

To add an icon: append its Lucide name to `ICONS`, run `make icons`, then
`make build`.

## Licences

Icons are from [Lucide](https://lucide.dev), licensed under the ISC License.
Redistributing the SVG files (as this repository does) requires keeping the
copyright and permission notices below. LDS itself is not relicensed.

A subset of Lucide icons are derived from [Feather](https://feathericons.com)
and additionally carry the MIT License; those notices are included here too.

### ISC License (Lucide)

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### MIT License (Feather-derived icons)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
