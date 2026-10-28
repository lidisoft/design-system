.PHONY: help build dev up down logs ps rebuild test fmt vet check fonts icons new clean verify notes site

# Default gallery port. 8080 belongs to tocsin in the local ecosystem.
PORT ?= 8081

help:
	@echo "LiDiSoft Design System"
	@echo ""
	@echo "  make dev              run the gallery locally on :$(PORT)"
	@echo "  make up               run the gallery under Docker + Air (hot reload)"
	@echo "  make build            regenerate dist/lds.css and dist/lds.js"
	@echo "  make site             export the gallery to site/ as a static SPA"
	@echo "  make notes tag=v0.1.0 preview release notes for a tag or ref"
	@echo "  make new name=alert   scaffold a new component"
	@echo "  make check            fmt + vet + test + verify"
	@echo ""
	@echo "  make fonts            fetch the vendored woff2 files"
	@echo "  make icons            fetch the vendored Lucide SVGs"
	@echo "  make down / logs / ps / rebuild    docker compose helpers"

# --- Build -----------------------------------------------------------------

build:
	go run ./cmd/lds build

notes:
	@test -n "$(tag)" || (echo "usage: make notes tag=v0.1.0" && exit 1)
	@scripts/release-notes.sh $(tag)

# Static export of the gallery, published to lidisoft.com/design-system as a
# GitHub Pages project site. SITE_BASE matches that subpath; override for a
# custom domain or root-hosted preview (SITE_BASE= make site).
SITE_BASE ?= /design-system

site:
	go run ./cmd/lds export --out site --base "$(SITE_BASE)"

# Fails when dist/ does not match the sources, which is what keeps the
# committed bundles honest in CI.
verify: build
	@git diff --quiet -- dist || { \
		echo "dist/ is stale — run 'make build' and commit the result"; \
		git --no-pager diff --stat -- dist; \
		exit 1; \
	}
	@echo "dist/ is up to date"

# --- Develop ---------------------------------------------------------------

dev:
	go run ./cmd/lds serve --addr :$(PORT)

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

rebuild:
	docker compose up --build --force-recreate

new:
	@test -n "$(name)" || (echo "usage: make new name=alert [category=feedback]" && exit 1)
	go run ./cmd/lds new $(name) $(if $(category),--category $(category),)

# --- Quality ---------------------------------------------------------------

test:
	go test ./...

fmt:
	gofmt -w .

vet:
	go vet ./...

check: fmt vet test verify

# --- Assets ----------------------------------------------------------------

# Variable woff2 files, fetched from jsDelivr's mirror of the Fontsource
# packages. This uses npm only as a CDN origin; nothing here runs npm, and the
# files land in the repository so builds stay offline afterwards.
FONT_DIR := assets/fonts
INTER_URL := https://cdn.jsdelivr.net/npm/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2
GROTESK_URL := https://cdn.jsdelivr.net/npm/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2

fonts:
	@mkdir -p $(FONT_DIR)
	curl -fsSL $(INTER_URL) -o $(FONT_DIR)/Inter-Variable.woff2
	curl -fsSL $(GROTESK_URL) -o $(FONT_DIR)/SpaceGrotesk-Variable.woff2
	@ls -lh $(FONT_DIR)/*.woff2

# Lucide SVGs, fetched from jsDelivr. Same CDN-only pattern as fonts: nothing
# runs npm, and once committed the build is fully offline.
ICON_DIR := assets/icons
ICON_BASE := https://cdn.jsdelivr.net/npm/lucide-static@1.25.0/icons
ICONS := check x chevron-down chevron-up chevron-left chevron-right search \
	plus minus menu more-horizontal alert-triangle alert-circle info \
	circle-check external-link copy trash-2 settings user users calendar \
	bell loader-circle \
	circle circle-dashed circle-dot circle-x \
	signal-low signal-medium signal-high octagon-alert \
	list kanban table chart-gantt calendar-days chart-column \
	repeat milestone flag rocket layers \
	link paperclip tag corner-down-right archive history eye at-sign \
	message-square inbox \
	git-branch git-pull-request git-merge git-commit-horizontal \
	filter arrow-up-down sliders-horizontal grip-vertical keyboard sun moon \
	log-out lock folder bookmark

icons:
	@mkdir -p $(ICON_DIR)
	@for name in $(ICONS); do \
		curl -fsSL $(ICON_BASE)/$$name.svg -o $(ICON_DIR)/$$name.svg; \
	done
	@ls -1 $(ICON_DIR)/*.svg | wc -l | xargs -I{} echo "{} icons in $(ICON_DIR)"

clean:
	rm -rf dist tmp site
