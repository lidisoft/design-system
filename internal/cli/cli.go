// Package cli wires the lds command line.
package cli

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"github.com/urfave/cli/v3"

	"github.com/lidisoft/design-system/internal/gallery"
	"github.com/lidisoft/design-system/internal/generator"
	"github.com/lidisoft/design-system/internal/tokens"
)

// New builds the root command.
func New() *cli.Command {
	return &cli.Command{
		Name:  "lds",
		Usage: "build and preview the LiDiSoft Design System",
		Flags: []cli.Flag{
			// Persistent by default in urfave/cli v3, so every subcommand inherits it.
			&cli.StringFlag{
				Name:    "root",
				Usage:   "repository root holding tokens/, components/ and runtime/",
				Value:   ".",
				Sources: cli.EnvVars("LDS_ROOT"),
			},
		},
		Commands: []*cli.Command{
			buildCmd(),
			serveCmd(),
			tokensCmd(),
			newComponentCmd(),
		},
	}
}

func buildCmd() *cli.Command {
	return &cli.Command{
		Name:  "build",
		Usage: "generate dist/lds.css and dist/lds.js",
		Flags: []cli.Flag{
			&cli.StringFlag{Name: "out", Usage: "output directory", Value: "dist"},
			&cli.BoolFlag{Name: "minify", Usage: "also emit lds.min.css and lds.min.js", Value: true},
			&cli.StringFlag{Name: "version", Usage: "version stamped into the banners", Value: generator.Version},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			root := cmd.String("root")
			out := cmd.String("out")
			if !filepath.IsAbs(out) {
				out = filepath.Join(root, out)
			}

			start := time.Now()
			res, err := generator.Build(generator.Options{
				Root:    root,
				OutDir:  out,
				Minify:  cmd.Bool("minify"),
				Version: cmd.String("version"),
			})
			if err != nil {
				return err
			}

			fmt.Printf("lds.css    %6.1f KiB\n", float64(len(res.CSS))/1024)
			fmt.Printf("lds.js     %6.1f KiB\n", float64(len(res.JS))/1024)
			fmt.Printf("icons.svg  %6.1f KiB (%d icons)\n", float64(len(res.Icons))/1024, len(res.IconNames))
			fmt.Printf("written to %s in %s\n", out, time.Since(start).Round(time.Millisecond))
			return nil
		},
	}
}

func serveCmd() *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "run the development gallery",
		Flags: []cli.Flag{
			&cli.StringFlag{Name: "addr", Usage: "listen address", Value: ":8081", Sources: cli.EnvVars("LDS_ADDR")},
			&cli.BoolFlag{Name: "dev", Usage: "regenerate bundles on every request", Value: true},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			root := cmd.String("root")
			srv, err := gallery.New(root, cmd.Bool("dev"))
			if err != nil {
				return err
			}

			addr := cmd.String("addr")
			httpSrv := &http.Server{
				Addr:              addr,
				Handler:           srv.Handler(),
				ReadHeaderTimeout: 10 * time.Second,
			}

			fmt.Printf("LDS gallery on http://localhost%s\n", addr)
			go func() {
				<-ctx.Done()
				shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				_ = httpSrv.Shutdown(shutdown)
			}()

			if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				return err
			}
			return nil
		},
	}
}

func tokensCmd() *cli.Command {
	return &cli.Command{
		Name:  "tokens",
		Usage: "print the resolved token layer",
		Flags: []cli.Flag{
			&cli.StringFlag{Name: "group", Usage: "restrict output to one group, e.g. color"},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			set, err := tokens.Load(filepath.Join(cmd.String("root"), "tokens"))
			if err != nil {
				return err
			}

			group := cmd.String("group")
			for _, t := range set.Tokens {
				if group != "" && t.Group != group {
					continue
				}
				if t.IsAlias() {
					fmt.Printf("%-44s %-32s %s\n", t.Var, t.Value, t.Raw)
					continue
				}
				fmt.Printf("%-44s %s\n", t.Var, t.Value)
			}
			return nil
		},
	}
}

func newComponentCmd() *cli.Command {
	return &cli.Command{
		Name:      "new",
		Usage:     "scaffold a component directory",
		ArgsUsage: "<name>",
		Flags: []cli.Flag{
			&cli.StringFlag{Name: "category", Usage: "catalog category", Value: "primitives"},
		},
		Action: func(ctx context.Context, cmd *cli.Command) error {
			name := cmd.Args().First()
			if name == "" {
				return fmt.Errorf("usage: lds new <name>")
			}
			name = strings.TrimPrefix(name, "lds-")

			dir := filepath.Join(cmd.String("root"), "components", name)
			if _, err := os.Stat(dir); err == nil {
				return fmt.Errorf("%s already exists", dir)
			}
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return err
			}

			data := map[string]string{
				"Name":     name,
				"Tag":      "lds-" + name,
				"Title":    strings.ToUpper(name[:1]) + name[1:],
				"Category": cmd.String("category"),
			}

			for ext, tpl := range scaffold {
				path := filepath.Join(dir, name+ext)
				f, err := os.Create(path)
				if err != nil {
					return err
				}
				err = template.Must(template.New(ext).Parse(tpl)).Execute(f, data)
				f.Close()
				if err != nil {
					return err
				}
				fmt.Println("created", path)
			}

			fmt.Printf("\nNext: fill in %s and refresh the gallery.\n", filepath.Join(dir, name+".toml"))
			fmt.Println("See docs/component-authoring.md for the checklist.")
			return nil
		},
	}
}

var scaffold = map[string]string{
	".toml": `tag = "{{.Tag}}"
name = "{{.Title}}"
category = "{{.Category}}"
status = "draft"
summary = "TODO: one sentence on what this is for."

a11y = """
TODO: keyboard interaction, roles, and what the caller is responsible for.
"""

[[attributes]]
name = "variant"
type = "enum"
values = ["default"]
default = "default"
description = "TODO"

[[slots]]
name = ""
description = "TODO"

[[stories]]
name = "Default"
description = "TODO"
html = """
<{{.Tag}}>Hello</{{.Tag}}>
"""
`,

	".html": `<div class="root" part="root">
  <slot></slot>
</div>
`,

	".css": `:host {
  display: block;
}

:host([hidden]) {
  display: none;
}

.root {
  /* Reference semantic tokens only: var(--lds-color-fg-default), never a hex. */
  color: var(--lds-color-fg-default);
}
`,

	".js": `/* Optional. Delete this file if {{.Tag}} needs no behaviour. */

LDS.behavior("{{.Tag}}", {
  connected(el) {
    void el;
  },

  attributeChanged(el, name, prev, next) {
    void el, name, prev, next;
  },
});
`,
}
