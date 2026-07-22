// Command lds builds the design system bundles and serves the development gallery.
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/lidisoft/design-system/internal/cli"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := cli.New().Run(ctx, os.Args); err != nil {
		fmt.Fprintln(os.Stderr, "lds:", err)
		os.Exit(1)
	}
}
