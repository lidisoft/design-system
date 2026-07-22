/*!
 * LiDiSoft Design System — lds.js
 * version 0.1.0 · generated 2026-07-22
 *
 * GENERATED FILE — DO NOT EDIT.
 * Regenerate with: make build   (see docs/architecture.md)
 */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------------
   * LDS runtime
   *
   * Shared base for every generated custom element. The generator never emits
   * class syntax — it emits LDS.define({...}) descriptors and this runtime builds
   * the constructor. That keeps code generation to data, not to JavaScript source.
   * ---------------------------------------------------------------------- */

  /* One constructable stylesheet and one <template> per component, shared by
   * every instance: cloning a parsed template is far cheaper than re-parsing. */
  const sheetCache = new Map();
  const templateCache = new Map();

  function sheetFor(tag, cssText) {
    let sheet = sheetCache.get(tag);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      sheetCache.set(tag, sheet);
    }
    return sheet;
  }

  function templateFor(tag, html) {
    let tpl = templateCache.get(tag);
    if (!tpl) {
      tpl = document.createElement("template");
      tpl.innerHTML = html;
      templateCache.set(tag, tpl);
    }
    return tpl;
  }

  /* Resolve the directory that served this script so icons.svg (and anything else
   * co-located with the bundle) resolves under the same mount prefix as fonts do
   * relative to lds.css. document.currentScript is only set while this file is
   * evaluating — capture it before any await. Fall back to scanning script tags
   * when currentScript is unavailable (some embedders strip it). */
  function resolveScriptBase() {
    if (typeof document === "undefined") return "";
    const current =
      document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : "";
    if (current) return current.replace(/[^/]+$/, "");
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || "";
      if (/\/lds(\.min)?\.js(\?|#|$)/.test(src)) {
        return src.replace(/[^/]+$/, "");
      }
    }
    return "";
  }

  const scriptBase = resolveScriptBase();

  let iconsPromise = null;

  const LDS = {
    version: "0.0.0",

    /** Directory URL of the loaded lds.js (trailing slash), or "". */
    base: scriptBase,

    /** Sorted icon names; overwritten by the generator after this file. */
    icons: [],

    /** tag -> generated constructor. */
    registry: new Map(),

    /** tag -> behaviour hooks. */
    behaviors: new Map(),

    /**
     * Register behaviour hooks for a tag. Authored in
     * components/<name>/<name>.js and always emitted before the matching
     * LDS.define() call, because customElements.define() upgrades synchronously.
     *
     * Hooks, all optional:
     *   connected(el)
     *   disconnected(el)
     *   attributeChanged(el, name, prev, next)
     */
    behavior(tag, hooks) {
      LDS.behaviors.set(tag, hooks || {});
    },

    /**
     * Build and register a custom element from a generated descriptor:
     * { tag, className, observed, defaults, template, styles }
     */
    define(spec) {
      const existing = customElements.get(spec.tag);
      if (existing) return existing;

      const observed = spec.observed || [];
      const defaults = spec.defaults || {};

      class LdsElement extends HTMLElement {
        static get observedAttributes() {
          return observed;
        }

        constructor() {
          super();
          this._lds = { ready: false, hooks: LDS.behaviors.get(spec.tag) || {} };
          this.attachShadow({ mode: "open" });
        }

        connectedCallback() {
          if (!this._lds.ready) {
            this.shadowRoot.adoptedStyleSheets = [sheetFor(spec.tag, spec.styles)];
            this.shadowRoot.appendChild(
              templateFor(spec.tag, spec.template).content.cloneNode(true)
            );

            /* Reflect declared defaults so :host([variant="primary"]) matches
             * even when the author wrote a bare <lds-button>. */
            for (const name in defaults) {
              if (!this.hasAttribute(name)) this.setAttribute(name, defaults[name]);
            }
            this._lds.ready = true;
          }
          if (this._lds.hooks.connected) this._lds.hooks.connected(this);
        }

        disconnectedCallback() {
          if (this._lds.hooks.disconnected) this._lds.hooks.disconnected(this);
        }

        attributeChangedCallback(name, prev, next) {
          if (prev === next) return;
          if (this._lds.hooks.attributeChanged) {
            this._lds.hooks.attributeChanged(this, name, prev, next);
          }
        }

        /** Query the shadow root. */
        $(selector) {
          return this.shadowRoot.querySelector(selector);
        }

        /** Query all matches in the shadow root. */
        $$(selector) {
          return Array.from(this.shadowRoot.querySelectorAll(selector));
        }

        /** Read a boolean attribute: present and not literally "false". */
        boolAttr(name) {
          return this.hasAttribute(name) && this.getAttribute(name) !== "false";
        }

        /**
         * Dispatch a composed, bubbling, cancelable custom event. Returns the
         * event so callers can check defaultPrevented.
         */
        emit(name, detail) {
          const event = new CustomEvent(name, {
            detail: detail,
            bubbles: true,
            composed: true,
            cancelable: true,
          });
          this.dispatchEvent(event);
          return event;
        }
      }

      Object.defineProperty(LdsElement, "name", { value: spec.className });
      customElements.define(spec.tag, LdsElement);
      LDS.registry.set(spec.tag, LdsElement);
      return LdsElement;
    },

    /**
     * Set the active theme. Themes are plain data attributes on <html> which the
     * generated theme blocks in lds.css key off; pass null to fall back to the
     * base layer.
     */
    setTheme(name) {
      if (name) {
        document.documentElement.setAttribute("data-lds-theme", name);
      } else {
        document.documentElement.removeAttribute("data-lds-theme");
      }
    },

    /** Resolve a design token, e.g. LDS.token("color.accent.default"). */
    token(path, element) {
      const scope = element || document.documentElement;
      return getComputedStyle(scope)
        .getPropertyValue("--lds-" + path.replace(/\./g, "-"))
        .trim();
    },

    /** Whether name is in the build-time icon list. */
    hasIcon(name) {
      return LDS.icons.indexOf(name) !== -1;
    },

    /**
     * Fetch dist/icons.svg once and inject it into the document. Each lds-icon
     * clones symbol children into its shadow SVG — <use href="#…"> from a shadow
     * root cannot resolve document-level IDs.
     */
    ensureIcons() {
      if (iconsPromise) return iconsPromise;
      if (typeof document === "undefined") {
        iconsPromise = Promise.resolve();
        return iconsPromise;
      }
      if (document.getElementById("lds-icon-sprite")) {
        iconsPromise = Promise.resolve();
        return iconsPromise;
      }

      const url = LDS.base + "icons.svg";
      iconsPromise = fetch(url)
        .then(function (res) {
          if (!res.ok) {
            throw new Error("LDS: failed to load icon sprite (" + res.status + ")");
          }
          return res.text();
        })
        .then(function (svgText) {
          if (document.getElementById("lds-icon-sprite")) return;
          const wrap = document.createElement("div");
          wrap.innerHTML = svgText.trim();
          const svg = wrap.firstElementChild;
          if (!svg || svg.tagName.toLowerCase() !== "svg") {
            throw new Error("LDS: icon sprite is not an <svg>");
          }
          svg.id = "lds-icon-sprite";
          svg.setAttribute("aria-hidden", "true");
          svg.style.position = "absolute";
          svg.style.width = "0";
          svg.style.height = "0";
          svg.style.overflow = "hidden";
          document.documentElement.appendChild(svg);
        })
        .catch(function (err) {
          iconsPromise = null;
          console.error(err);
          throw err;
        });
      return iconsPromise;
    },
  };

  LDS.icons = ["alert-circle", "alert-triangle", "bell", "check", "chevron-down", "chevron-left", "chevron-right", "chevron-up", "circle-check", "copy", "external-link", "info", "loader-circle", "menu", "minus", "more-horizontal", "plus", "search", "settings", "trash-2", "user", "x"];

  /* behaviour: lds-button */
  (function () {
    /* Behaviour for <lds-button>.
     *
     * Two problems the platform does not solve for us:
     *
     * 1. A <button type="submit"> inside a shadow root does not submit the form in
     *    the surrounding document — the shadow boundary stops form association. We
     *    forward the activation manually.
     * 2. Click events still bubble out of a disabled host, because the host element
     *    itself is not disabled, only the inner button. We stop them at the host.
     *
     * Hooks receive the host element; `el.$()`, `el.boolAttr()` and `el.emit()` come
     * from the runtime base class in runtime/base.js.
     */

    LDS.behavior("lds-button", {
      connected(el) {
        const button = el.$(".btn");

        syncDisabled(el, button);
        syncLabel(el, button);
        watchDefaultSlot(el);

        /* Capture on the host so a click on a disabled or loading button never
         * reaches listeners the consuming page attached. */
        el.addEventListener(
          "click",
          (event) => {
            if (el.boolAttr("disabled") || el.boolAttr("loading")) {
              event.preventDefault();
              event.stopImmediatePropagation();
              return;
            }

            const activation = el.emit("lds-click", { originalEvent: event });
            if (activation.defaultPrevented) return;

            forwardToForm(el);
          },
          true
        );
      },

      attributeChanged(el, name) {
        const button = el.$(".btn");
        if (!button) return; /* changed before first connect */

        if (name === "disabled" || name === "loading") syncDisabled(el, button);
        if (name === "label") syncLabel(el, button);
      },
    });

    function syncDisabled(el, button) {
      const loading = el.boolAttr("loading");

      /* Only `disabled` leaves the tab order. A loading button stays focusable so
       * keyboard users are not thrown back to the top of the document mid-request. */
      button.disabled = el.boolAttr("disabled");
      button.setAttribute("aria-busy", loading ? "true" : "false");
    }

    function syncLabel(el, button) {
      const label = el.getAttribute("label");
      if (label) {
        button.setAttribute("aria-label", label);
      } else {
        button.removeAttribute("aria-label");
      }
    }

    /* CSS has no "does this slot have content" selector, so mirror it onto an
     * attribute the stylesheet can key off. */
    function watchDefaultSlot(el) {
      const slot = el.$(".btn__label slot");
      const label = el.$(".btn__label");
      if (!slot || !label) return;

      const update = () => {
        const empty = slot.assignedNodes({ flatten: true }).every(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
        );
        label.toggleAttribute("data-empty", empty);
      };

      slot.addEventListener("slotchange", update);
      update();
    }

    function forwardToForm(el) {
      const type = el.getAttribute("type");
      if (type !== "submit" && type !== "reset") return;

      const form = el.closest("form");
      if (!form) return;

      if (type === "reset") {
        form.reset();
        return;
      }

      /* requestSubmit runs validation and fires submit, unlike form.submit(). */
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    }
  })();

  /* behaviour: lds-icon */
  (function () {
    /* Behaviour for <lds-icon>.
     *
     * The symbol sprite is injected into the light DOM once by LDS.ensureIcons.
     * SVG <use href="#…"> from inside a shadow root only resolves IDs in that
     * shadow tree (not the document), so we clone the symbol's children into the
     * host SVG instead of referencing them with <use>.
     */

    LDS.behavior("lds-icon", {
      connected(el) {
        syncA11y(el);
        syncIcon(el);
      },

      attributeChanged(el, name) {
        if (name === "label") syncA11y(el);
        if (name === "name") syncIcon(el);
      },
    });

    function syncA11y(el) {
      const label = el.getAttribute("label");
      const svg = el.$(".icon");
      if (!svg) return;

      if (label) {
        el.removeAttribute("aria-hidden");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", label);
      } else {
        el.setAttribute("aria-hidden", "true");
        svg.removeAttribute("role");
        svg.removeAttribute("aria-label");
      }
    }

    function syncIcon(el) {
      const name = el.getAttribute("name");
      const svg = el.$(".icon");
      if (!svg) return;

      clearChildren(svg);

      if (!name) return;

      if (!LDS.hasIcon(name)) {
        console.warn('LDS: unknown icon "' + name + '". Check LDS.icons.');
      }

      LDS.ensureIcons()
        .then(function () {
          /* name may have changed while the sprite was loading */
          if (el.getAttribute("name") !== name) return;

          const symbol = document.getElementById("lds-icon-" + name);
          if (!symbol) {
            console.warn('LDS: icon symbol "lds-icon-' + name + '" not in sprite.');
            return;
          }

          const viewBox = symbol.getAttribute("viewBox");
          if (viewBox) svg.setAttribute("viewBox", viewBox);

          /* Lift Lucide presentation attrs onto the host SVG so paths inherit. */
          ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"].forEach(
            function (attr) {
              const value = symbol.getAttribute(attr);
              if (value) svg.setAttribute(attr, value);
              else svg.removeAttribute(attr);
            }
          );

          clearChildren(svg);
          for (let node = symbol.firstChild; node; node = node.nextSibling) {
            svg.appendChild(node.cloneNode(true));
          }
        })
        .catch(function () {
          /* ensureIcons already logged; leave the icon empty. */
        });
    }

    function clearChildren(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }
  })();

  /* behaviour: lds-navbar */
  (function () {
    /* Behaviour for <lds-navbar>.
     *
     * Compact mode is either forced with the `compact` attribute or inferred from
     * host width vs --lds-navbar-compact-at. The toggle expands an inline links
     * panel under the bar — not a modal, so there is no focus trap.
     */

    const state = new WeakMap();

    LDS.behavior("lds-navbar", {
      connected(el) {
        const toggle = el.$(".toggle");

        syncLabel(el, toggle);
        syncExpanded(el, toggle);

        const onToggle = () => setOpen(el, !el.boolAttr("open"));
        toggle.addEventListener("click", onToggle);

        const onKeydown = (event) => {
          if (event.key === "Escape" && el.boolAttr("open") && isCompact(el)) {
            setOpen(el, false);
          }
        };

        const onPointerDown = (event) => {
          if (!el.boolAttr("open") || !isCompact(el)) return;
          if (event.composedPath().includes(el)) return;
          setOpen(el, false);
        };

        document.addEventListener("keydown", onKeydown);
        document.addEventListener("pointerdown", onPointerDown, true);

        const ro = new ResizeObserver(() => updateCompact(el));
        ro.observe(el);
        updateCompact(el);

        state.set(el, { onToggle, onKeydown, onPointerDown, ro });
      },

      disconnected(el) {
        const s = state.get(el);
        if (!s) return;

        document.removeEventListener("keydown", s.onKeydown);
        document.removeEventListener("pointerdown", s.onPointerDown, true);
        s.ro.disconnect();
        state.delete(el);
      },

      attributeChanged(el, name) {
        const toggle = el.$(".toggle");
        if (!toggle) return;

        if (name === "label") syncLabel(el, toggle);
        if (name === "open") syncExpanded(el, toggle);
        if (name === "compact") updateCompact(el);
      },
    });

    function isCompact(el) {
      return el.boolAttr("compact") || el.hasAttribute("data-compact");
    }

    function compactAt(el) {
      const raw = getComputedStyle(el).getPropertyValue("--lds-navbar-compact-at").trim();
      const px = parseFloat(raw);
      return Number.isFinite(px) ? px : 768;
    }

    function updateCompact(el) {
      if (el.boolAttr("compact")) {
        el.removeAttribute("data-compact");
        return;
      }

      const should = el.clientWidth > 0 && el.clientWidth < compactAt(el);
      const was = el.hasAttribute("data-compact");
      el.toggleAttribute("data-compact", should);

      if (was && !should && el.boolAttr("open")) {
        el.removeAttribute("open");
      }
    }

    function setOpen(el, open) {
      if (el.boolAttr("open") === open) return;

      const event = el.emit("lds-toggle", { open: open });
      if (event.defaultPrevented) return;

      el.toggleAttribute("open", open);
    }

    function syncLabel(el, toggle) {
      toggle.setAttribute("aria-label", el.getAttribute("label") || "Menu");
    }

    function syncExpanded(el, toggle) {
      toggle.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
    }
  })();

  /* component: lds-button (stable) */
  LDS.define({
    tag: "lds-button",
    className: "LdsButton",
    observed: ["variant", "size", "type", "disabled", "loading", "full-width", "pill", "label"],
    defaults: {"variant": "primary", "size": "md", "type": "button"},
    template: `<button class="btn" part="button" type="button">
  <span class="btn__spinner" part="spinner" aria-hidden="true"></span>
  <slot name="start"></slot>
  <span class="btn__label" part="label"><slot></slot></span>
  <slot name="end"></slot>
</button>`,
    styles: `/* Component styles are adopted into the shadow root, so selectors here are
 * scoped and can stay short. Only :host and ::slotted() reach outward, and
 * only --lds-* custom properties reach inward.
 *
 * Variants are expressed as custom-property assignments on :host, never as
 * duplicated rule blocks — the .btn rule below is the single place geometry
 * and colour are actually applied. */

:host {
  --lds-button-height: var(--lds-control-height-md);
  --lds-button-padding-x: var(--lds-control-padding-x-md);
  --lds-button-gap: var(--lds-control-gap-md);
  --lds-button-font-size: var(--lds-control-font-size-md);
  --lds-button-radius: var(--lds-control-radius-md);
  --lds-button-bg: var(--lds-color-accent-default);
  --lds-button-bg-hover: var(--lds-color-accent-hover);
  --lds-button-bg-active: var(--lds-color-accent-active);
  --lds-button-fg: var(--lds-color-fg-on-accent);
  --lds-button-border: transparent;
  --lds-button-shadow: none;

  display: inline-flex;
  vertical-align: middle;
  max-width: 100%;
}

:host([hidden]) {
  display: none;
}

/* --- Sizes ------------------------------------------------------------- */

:host([size="sm"]) {
  --lds-button-height: var(--lds-control-height-sm);
  --lds-button-padding-x: var(--lds-control-padding-x-sm);
  --lds-button-gap: var(--lds-control-gap-sm);
  --lds-button-font-size: var(--lds-control-font-size-sm);
  --lds-button-radius: var(--lds-control-radius-sm);
}

:host([size="lg"]) {
  --lds-button-height: var(--lds-control-height-lg);
  --lds-button-padding-x: var(--lds-control-padding-x-lg);
  --lds-button-gap: var(--lds-control-gap-lg);
  --lds-button-font-size: var(--lds-control-font-size-lg);
  --lds-button-radius: var(--lds-control-radius-lg);
}

/* --- Variants ---------------------------------------------------------- */

:host([variant="secondary"]) {
  --lds-button-bg: var(--lds-color-bg-canvas);
  --lds-button-bg-hover: var(--lds-color-bg-subtle);
  --lds-button-bg-active: var(--lds-color-bg-muted);
  --lds-button-fg: var(--lds-color-fg-default);
  --lds-button-border: var(--lds-color-border-default);
  --lds-button-shadow: var(--lds-shadow-sm);
}

:host([variant="ghost"]) {
  --lds-button-bg: transparent;
  --lds-button-bg-hover: var(--lds-color-bg-subtle);
  --lds-button-bg-active: var(--lds-color-bg-muted);
  --lds-button-fg: var(--lds-color-fg-muted);
  --lds-button-border: transparent;
}

:host([variant="danger"]) {
  --lds-button-bg: var(--lds-color-danger-default);
  --lds-button-bg-hover: var(--lds-color-danger-hover);
  --lds-button-bg-active: var(--lds-color-danger-active);
  --lds-button-fg: var(--lds-color-fg-on-accent);
}

:host([variant="link"]) {
  --lds-button-bg: transparent;
  --lds-button-bg-hover: transparent;
  --lds-button-bg-active: transparent;
  --lds-button-fg: var(--lds-color-fg-link);
  --lds-button-padding-x: 0;
  --lds-button-height: auto;
}

/* --- Modifiers --------------------------------------------------------- */

:host([pill]) {
  --lds-button-radius: var(--lds-control-radius-pill);
}

:host([full-width]) {
  display: flex;
  width: 100%;
}

:host([full-width]) .btn {
  width: 100%;
}

/* --- The control ------------------------------------------------------- */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--lds-button-gap);

  min-width: 0;
  height: var(--lds-button-height);
  padding-inline: var(--lds-button-padding-x);

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-button-font-size);
  font-weight: var(--lds-font-weight-semibold);
  line-height: 1;
  white-space: nowrap;

  color: var(--lds-button-fg);
  background: var(--lds-button-bg);
  border: var(--lds-control-border-width-default) solid var(--lds-button-border);
  border-radius: var(--lds-button-radius);
  box-shadow: var(--lds-button-shadow);

  cursor: pointer;
  appearance: none;
  transition:
    background var(--lds-transition-control),
    border-color var(--lds-transition-control),
    box-shadow var(--lds-transition-control),
    transform var(--lds-transition-control);
}

.btn:hover:not(:disabled) {
  background: var(--lds-button-bg-hover);
}

:host([variant="link"]) .btn:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.btn:active:not(:disabled) {
  background: var(--lds-button-bg-active);
  transform: translateY(1px);
}

.btn:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.btn__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* CSS cannot see whether a slot has assigned nodes, so the behaviour script
 * sets data-empty on slotchange. Without this an icon-only button carries the
 * flex gap of a zero-width label. */
.btn__label[data-empty] {
  display: none;
}

/* --- Loading ----------------------------------------------------------- */

.btn__spinner {
  display: none;
  flex: none;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: var(--lds-radius-full);
  animation: lds-button-spin var(--lds-duration-slower) linear infinite;
}

:host([loading]) .btn__spinner {
  display: block;
}

/* Adornments are redundant next to a spinner and would make the control
 * jump width mid-request. */
:host([loading]) ::slotted([slot="start"]) {
  display: none;
}

:host([loading]) .btn {
  cursor: progress;
}

@keyframes lds-button-spin {
  to {
    transform: rotate(360deg);
  }
}

/* --- Slotted adornments ------------------------------------------------ */

::slotted([slot="start"]),
::slotted([slot="end"]) {
  display: inline-flex;
  flex: none;
  align-items: center;
  line-height: 1;
}`,
  });

  /* component: lds-icon (beta) */
  LDS.define({
    tag: "lds-icon",
    className: "LdsIcon",
    observed: ["name", "size", "label"],
    defaults: {"size": "md"},
    template: `<svg class="icon" part="svg" viewBox="0 0 24 24" focusable="false"></svg>`,
    styles: `:host {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--lds-icon-size-md);
  height: var(--lds-icon-size-md);
  color: currentColor;
  vertical-align: middle;
  line-height: 0;
}

:host([hidden]) {
  display: none;
}

:host([size="sm"]) {
  width: var(--lds-icon-size-sm);
  height: var(--lds-icon-size-sm);
}

:host([size="md"]) {
  width: var(--lds-icon-size-md);
  height: var(--lds-icon-size-md);
}

:host([size="lg"]) {
  width: var(--lds-icon-size-lg);
  height: var(--lds-icon-size-lg);
}

.icon {
  display: block;
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
}`,
  });

  /* component: lds-navbar (draft) */
  LDS.define({
    tag: "lds-navbar",
    className: "LdsNavbar",
    observed: ["sticky", "compact", "open", "label"],
    defaults: {},
    template: `<header class="bar" part="bar">
  <div class="brand" part="brand"><slot name="brand"></slot></div>
  <button type="button" class="toggle" part="toggle" aria-expanded="false" aria-controls="links">
    <span class="toggle__icon" aria-hidden="true"></span>
  </button>
  <nav class="links" part="links" id="links"><slot></slot></nav>
  <div class="actions" part="actions"><slot name="actions"></slot></div>
</header>`,
    styles: `/* Top-bar chrome. Compact mode collapses the link row into a toggle panel
 * under the bar — not a drawer. Variants are custom properties on :host. */

:host {
  --lds-navbar-bg: var(--lds-color-bg-raised);
  --lds-navbar-fg: var(--lds-color-fg-default);
  --lds-navbar-border: var(--lds-color-border-subtle);
  --lds-navbar-compact-at: var(--lds-breakpoint-md);
  --lds-navbar-padding-x: var(--lds-space-4);
  --lds-navbar-gap: var(--lds-space-3);

  display: block;
  color: var(--lds-navbar-fg);
}

:host([hidden]) {
  display: none;
}

:host([sticky]) {
  position: sticky;
  top: 0;
  z-index: var(--lds-z-sticky);
}

/* --- Bar --------------------------------------------------------------- */

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--lds-navbar-gap);

  min-height: var(--lds-control-height-lg);
  padding-block: var(--lds-space-2);
  padding-inline: var(--lds-navbar-padding-x);

  background: var(--lds-navbar-bg);
  border-bottom: 1px solid var(--lds-navbar-border);
  transition:
    background var(--lds-transition-surface),
    border-color var(--lds-transition-surface);
}

.brand {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--lds-space-2);
  min-width: 0;
}

.links {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--lds-space-1);
  min-width: 0;
}

.actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: var(--lds-space-2);
  margin-inline-start: auto;
}

/* --- Toggle ------------------------------------------------------------ */

.toggle {
  display: none;
  flex: none;
  align-items: center;
  justify-content: center;

  width: var(--lds-control-height-md);
  height: var(--lds-control-height-md);
  padding: 0;

  color: var(--lds-color-fg-muted);
  background: transparent;
  border: var(--lds-control-border-width-default) solid transparent;
  border-radius: var(--lds-control-radius-md);

  cursor: pointer;
  appearance: none;
  transition:
    background var(--lds-transition-control),
    color var(--lds-transition-control),
    border-color var(--lds-transition-control);
}

.toggle:hover {
  color: var(--lds-color-fg-default);
  background: var(--lds-color-bg-subtle);
}

.toggle:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

.toggle__icon,
.toggle__icon::before,
.toggle__icon::after {
  display: block;
  width: 1.125em;
  height: 2px;
  background: currentColor;
  border-radius: var(--lds-radius-full);
}

.toggle__icon {
  position: relative;
}

.toggle__icon::before,
.toggle__icon::after {
  content: "";
  position: absolute;
  inset-inline-start: 0;
}

.toggle__icon::before {
  translate: 0 -0.35em;
}

.toggle__icon::after {
  translate: 0 0.35em;
}

/* --- Compact ----------------------------------------------------------- */

:host([compact]) .toggle,
:host([data-compact]) .toggle {
  display: inline-flex;
  order: 3;
}

:host([compact]) .actions,
:host([data-compact]) .actions {
  order: 2;
  margin-inline-start: auto;
}

:host([compact]) .links,
:host([data-compact]) .links {
  display: none;
  order: 4;
  flex: none;
  flex-basis: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: var(--lds-space-1);
  padding-block: var(--lds-space-2) var(--lds-space-3);
  border-top: 1px solid var(--lds-navbar-border);
}

:host([compact][open]) .links,
:host([data-compact][open]) .links {
  display: flex;
}

:host([compact][open]) .toggle,
:host([data-compact][open]) .toggle {
  color: var(--lds-color-fg-default);
  background: var(--lds-color-bg-muted);
}

/* --- Slotted content --------------------------------------------------- */

::slotted([slot="brand"]) {
  font-family: var(--lds-font-family-display);
  font-size: var(--lds-font-size-lg);
  font-weight: var(--lds-font-weight-semibold);
  line-height: var(--lds-font-leading-tight);
  color: var(--lds-navbar-fg);
  text-decoration: none;
}

::slotted(a:not([slot])) {
  display: inline-flex;
  align-items: center;
  min-height: var(--lds-control-height-md);
  padding-inline: var(--lds-control-padding-x-sm);

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-medium);
  line-height: 1;
  color: var(--lds-color-fg-muted);
  text-decoration: none;
  border-radius: var(--lds-control-radius-md);
  transition:
    background var(--lds-transition-control),
    color var(--lds-transition-control);
}

::slotted(a:not([slot]):hover) {
  color: var(--lds-color-fg-default);
  background: var(--lds-color-bg-subtle);
}

::slotted(a:not([slot]):focus-visible) {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

::slotted(a[aria-current="page"]:not([slot])) {
  color: var(--lds-color-accent-fg);
  background: var(--lds-color-accent-subtle);
}

:host([compact]) ::slotted(a:not([slot])),
:host([data-compact]) ::slotted(a:not([slot])) {
  width: 100%;
  justify-content: flex-start;
  min-height: var(--lds-control-height-lg);
  padding-inline: var(--lds-control-padding-x-md);
}`,
  });

  LDS.version = "0.1.0";
  global.LDS = LDS;
})(typeof globalThis !== "undefined" ? globalThis : window);
