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

  /* behaviour: lds-breadcrumb */
  (function () {
    /* Behaviour for <lds-breadcrumb>.
     *
     * When the trail overflows, middle items get data-overflow and an ellipsis
     * control appears between the first and last items. expanded shows everything.
     */

    const state = new WeakMap();

    LDS.behavior("lds-breadcrumb", {
      connected(el) {
        const overflow = el.$(".overflow");

        syncLabel(el);
        syncOverflowA11y(el, overflow);

        const onOverflow = () => setExpanded(el, true);
        overflow.addEventListener("click", onOverflow);

        const slot = el.$("slot");
        const onSlot = () => scheduleMeasure(el);
        slot.addEventListener("slotchange", onSlot);

        const ro = new ResizeObserver(() => scheduleMeasure(el));
        ro.observe(el);

        state.set(el, { onOverflow, onSlot, ro, raf: 0 });
        scheduleMeasure(el);
      },

      disconnected(el) {
        const s = state.get(el);
        if (!s) return;
        if (s.raf) cancelAnimationFrame(s.raf);
        s.ro.disconnect();
        state.delete(el);
      },

      attributeChanged(el, name) {
        const overflow = el.$(".overflow");
        if (!overflow) return;

        if (name === "label") syncLabel(el);
        if (name === "expanded") {
          syncOverflowA11y(el, overflow);
          scheduleMeasure(el);
        }
      },
    });

    function itemsOf(el) {
      const slot = el.$("slot");
      if (!slot) return [];
      return slot.assignedElements({ flatten: true }).filter(function (node) {
        return node.tagName === "LDS-BREADCRUMB-ITEM";
      });
    }

    function scheduleMeasure(el) {
      const s = state.get(el);
      if (!s) return;
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = requestAnimationFrame(function () {
        s.raf = 0;
        measure(el);
      });
    }

    function measure(el) {
      const items = itemsOf(el);
      const overflow = el.$(".overflow");
      if (!overflow) return;

      /* Reset so we measure the full trail. */
      items.forEach(function (item) {
        item.removeAttribute("data-overflow");
      });
      el.removeAttribute("data-collapsed");

      if (el.boolAttr("expanded") || items.length <= 2) {
        overflow.hidden = true;
        syncOverflowA11y(el, overflow);
        return;
      }

      /* If everything fits, stay expanded visually with no overflow control. */
      if (el.scrollWidth <= el.clientWidth + 1) {
        overflow.hidden = true;
        syncOverflowA11y(el, overflow);
        return;
      }

      /* Collapse the middle: keep first + last (and last-1 if max-items allows). */
      const keepTail = Math.max(1, parseInt(el.getAttribute("max-items") || "1", 10) || 1);
      const lastKept = Math.max(1, items.length - keepTail);

      for (let i = 1; i < lastKept; i++) {
        items[i].setAttribute("data-overflow", "");
      }

      el.setAttribute("data-collapsed", "");
      overflow.hidden = false;
      syncOverflowA11y(el, overflow);

      /* If still overflowing with only ends visible, drop extra tail items. */
      if (el.scrollWidth > el.clientWidth + 1 && keepTail > 1) {
        for (let i = items.length - keepTail; i < items.length - 1; i++) {
          if (i > 0) items[i].setAttribute("data-overflow", "");
        }
      }
    }

    function setExpanded(el, expanded) {
      if (el.boolAttr("expanded") === expanded) return;

      const event = el.emit("lds-expand", { expanded: expanded });
      if (event.defaultPrevented) return;

      el.toggleAttribute("expanded", expanded);
    }

    function syncLabel(el) {
      el.setAttribute("aria-label", el.getAttribute("label") || "Breadcrumb");
    }

    function syncOverflowA11y(el, overflow) {
      overflow.setAttribute("aria-expanded", el.boolAttr("expanded") ? "true" : "false");
      overflow.setAttribute("aria-label", "Show more path");
    }
  })();

  /* behaviour: lds-breadcrumb-item */
  (function () {
    /* Behaviour for <lds-breadcrumb-item>.
     *
     * Forwards href/target onto the inner <a>. The current page drops href and
     * sets aria-current="page" so it is not announced as a link.
     */

    LDS.behavior("lds-breadcrumb-item", {
      connected(el) {
        sync(el);
      },

      attributeChanged(el, name) {
        if (!el.$(".link")) return;
        if (name === "href" || name === "current" || name === "target") sync(el);
      },
    });

    function sync(el) {
      const link = el.$(".link");
      if (!link) return;

      const current = el.boolAttr("current");
      const href = el.getAttribute("href");

      if (current || !href) {
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.setAttribute("aria-current", "page");
      } else {
        link.setAttribute("href", href);
        link.removeAttribute("aria-current");

        const target = el.getAttribute("target");
        if (target) {
          link.setAttribute("target", target);
          if (target === "_blank") link.setAttribute("rel", "noopener noreferrer");
        } else {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        }
      }
    }
  })();

  /* behaviour: lds-nav */
  (function () {
    /* Behaviour for <lds-nav>.
     *
     * CSS cannot see whether a named slot has assigned nodes, so brand and footer
     * wrappers get data-empty for collapse.
     */

    LDS.behavior("lds-nav", {
      connected(el) {
        watchSlot(el, 'slot[name="brand"]', ".brand");
        watchSlot(el, 'slot[name="footer"]', ".footer");
      },
    });

    function watchSlot(el, slotSel, wrapSel) {
      const slot = el.$(slotSel);
      const wrap = el.$(wrapSel);
      if (!slot || !wrap) return;

      const update = () => {
        wrap.toggleAttribute("data-empty", slot.assignedNodes({ flatten: true }).length === 0);
      };

      slot.addEventListener("slotchange", update);
      update();
    }
  })();

  /* behaviour: lds-nav-group */
  (function () {
    /* Behaviour for <lds-nav-group>.
     *
     * Toggles the `open` attribute; aria-expanded tracks it. Cancel lds-toggle to
     * keep the previous state.
     */

    LDS.behavior("lds-nav-group", {
      connected(el) {
        const trigger = el.$(".trigger");

        syncLabel(el, trigger);
        syncExpanded(el, trigger);

        trigger.addEventListener("click", () => {
          setOpen(el, !el.boolAttr("open"));
        });
      },

      attributeChanged(el, name) {
        const trigger = el.$(".trigger");
        if (!trigger) return;

        if (name === "label") syncLabel(el, trigger);
        if (name === "open") syncExpanded(el, trigger);
      },
    });

    function setOpen(el, open) {
      if (el.boolAttr("open") === open) return;

      const event = el.emit("lds-toggle", { open: open });
      if (event.defaultPrevented) return;

      el.toggleAttribute("open", open);
    }

    function syncLabel(el, trigger) {
      const label = el.$(".trigger__label");
      const text = el.getAttribute("label") || "";
      if (label) label.textContent = text;
      if (text) {
        trigger.removeAttribute("aria-label");
      } else {
        trigger.setAttribute("aria-label", "Section");
      }
    }

    function syncExpanded(el, trigger) {
      trigger.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
    }
  })();

  /* behaviour: lds-nav-item */
  (function () {
    /* Behaviour for <lds-nav-item>.
     *
     * Mirrors href / target / active / disabled onto the inner <a>, and blocks
     * activation while disabled (the host itself is not a native disabled control).
     */

    LDS.behavior("lds-nav-item", {
      connected(el) {
        const item = el.$(".item");

        syncLink(el, item);
        syncActive(el, item);
        syncDisabled(el, item);
        watchSlot(el, ".item__start slot", ".item__start");
        watchSlot(el, ".item__end slot", ".item__end");
        watchSlot(el, ".item__label slot", ".item__label", () => syncName(el, item));
        syncName(el, item);

        el.addEventListener(
          "click",
          (event) => {
            if (el.boolAttr("disabled")) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          true
        );
      },

      attributeChanged(el, name) {
        const item = el.$(".item");
        if (!item) return;

        if (name === "href" || name === "target") syncLink(el, item);
        if (name === "active") syncActive(el, item);
        if (name === "disabled") syncDisabled(el, item);
        if (name === "label") syncName(el, item);
      },
    });

    function syncLink(el, item) {
      const href = el.getAttribute("href");
      if (href) {
        item.setAttribute("href", href);
      } else {
        item.removeAttribute("href");
      }

      const target = el.getAttribute("target");
      if (target) {
        item.setAttribute("target", target);
        if (target === "_blank" && !item.hasAttribute("rel")) {
          item.setAttribute("rel", "noopener noreferrer");
        }
      } else {
        item.removeAttribute("target");
      }
    }

    function syncActive(el, item) {
      if (el.boolAttr("active")) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    }

    function syncDisabled(el, item) {
      const disabled = el.boolAttr("disabled");
      item.toggleAttribute("aria-disabled", disabled);
      if (disabled) {
        item.setAttribute("tabindex", "-1");
      } else {
        item.removeAttribute("tabindex");
      }
    }

    /* Keep an accessible name when the visible label is hidden in a collapsed rail. */
    function syncName(el, item) {
      const explicit = el.getAttribute("label");
      if (explicit) {
        item.setAttribute("aria-label", explicit);
        return;
      }

      const slot = el.$(".item__label slot");
      if (!slot) return;

      const text = slot
        .assignedNodes({ flatten: true })
        .map((node) => node.textContent || "")
        .join("")
        .trim();

      if (text) {
        item.setAttribute("aria-label", text);
      } else {
        item.removeAttribute("aria-label");
      }
    }

    function watchSlot(el, slotSel, wrapSel, onChange) {
      const slot = el.$(slotSel);
      const wrap = el.$(wrapSel);
      if (!slot || !wrap) return;

      const update = () => {
        const empty = slot.assignedNodes({ flatten: true }).every(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
        );
        wrap.toggleAttribute("data-empty", empty);
        if (onChange) onChange();
      };

      slot.addEventListener("slotchange", update);
      update();
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

  /* behaviour: lds-toast */
  (function () {
    /* Behaviour for <lds-toast>.
     *
     * open controls visibility. duration (ms, default 5000; 0 = sticky) auto-
     * dismisses; the timer pauses while hovered or focus is inside. dismissible
     * defaults to true when the attribute is omitted.
     */

    const state = new WeakMap();

    LDS.behavior("lds-toast", {
      connected(el) {
        const close = el.$(".close");
        const root = el.$(".root");

        syncRole(el, root);
        syncDismissible(el, close);
        watchSlot(el, 'slot[name="title"]', ".title");
        watchSlot(el, ".body > slot", ".body");
        watchSlot(el, 'slot[name="action"]', ".action");

        close.addEventListener("click", function () {
          dismiss(el, "close");
        });

        el.addEventListener("mouseenter", function () {
          pauseTimer(el);
        });
        el.addEventListener("mouseleave", function () {
          resumeTimer(el);
        });
        el.addEventListener("focusin", function () {
          pauseTimer(el);
        });
        el.addEventListener("focusout", function () {
          requestAnimationFrame(function () {
            if (!el.matches(":focus-within")) resumeTimer(el);
          });
        });

        if (el.boolAttr("open")) startTimer(el);
      },

      disconnected(el) {
        clearTimer(el);
      },

      attributeChanged(el, name) {
        const close = el.$(".close");
        const root = el.$(".root");
        if (!root) return;

        if (name === "intent") syncRole(el, root);
        if (name === "dismissible" && close) syncDismissible(el, close);
        if (name === "open") {
          if (el.boolAttr("open")) startTimer(el);
          else clearTimer(el);
        }
        if (name === "duration" && el.boolAttr("open")) {
          clearTimer(el);
          startTimer(el);
        }
      },
    });

    function isDismissible(el) {
      if (!el.hasAttribute("dismissible")) return true;
      return el.boolAttr("dismissible");
    }

    function syncDismissible(el, close) {
      close.hidden = !isDismissible(el);
    }

    function syncRole(el, root) {
      root.setAttribute(
        "role",
        el.getAttribute("intent") === "danger" ? "alert" : "status"
      );
    }

    function durationMs(el) {
      const raw = el.getAttribute("duration");
      if (raw === null || raw === "") return 5000;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : 5000;
    }

    function dismiss(el, reason) {
      if (!el.boolAttr("open")) return;

      const event = el.emit("lds-dismiss", { reason: reason });
      if (event.defaultPrevented) return;

      el.removeAttribute("open");
      clearTimer(el);

      if (el.hasAttribute("data-managed")) {
        el.remove();
      }
    }

    function clearTimer(el) {
      const s = state.get(el);
      if (!s) return;
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
      state.set(el, s);
    }

    function startTimer(el) {
      clearTimer(el);
      const ms = durationMs(el);
      if (ms <= 0) return;

      const s = state.get(el) || {};
      s.remaining = ms;
      s.started = Date.now();
      s.timer = setTimeout(function () {
        dismiss(el, "timeout");
      }, ms);
      state.set(el, s);
    }

    function pauseTimer(el) {
      const s = state.get(el);
      if (!s || !s.timer) return;
      clearTimeout(s.timer);
      s.timer = null;
      s.remaining = Math.max(0, s.remaining - (Date.now() - s.started));
      state.set(el, s);
    }

    function resumeTimer(el) {
      if (!el.boolAttr("open")) return;
      const s = state.get(el);
      if (!s || s.timer) return;
      if (s.remaining <= 0) {
        dismiss(el, "timeout");
        return;
      }
      s.started = Date.now();
      s.timer = setTimeout(function () {
        dismiss(el, "timeout");
      }, s.remaining);
      state.set(el, s);
    }

    function watchSlot(el, slotSel, wrapSel) {
      const slot = el.$(slotSel);
      const wrap = el.$(wrapSel);
      if (!slot || !wrap) return;

      const update = function () {
        const empty = slot.assignedNodes({ flatten: true }).every(function (node) {
          return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "";
        });
        wrap.toggleAttribute("data-empty", empty);
      };

      slot.addEventListener("slotchange", update);
      update();
    }

    /* Used by lds-toast-region Escape handling and LDS.toast callers. */
    LDS._dismissToast = dismiss;
  })();

  /* behaviour: lds-toast-region */
  (function () {
    /* Behaviour for <lds-toast-region> and the LDS.toast() entry point.
     *
     * Escape dismisses the newest open toast. LDS.toast() ensures a region exists
     * on document.body, builds a managed <lds-toast>, and opens it.
     */

    const regionState = new WeakMap();

    LDS.behavior("lds-toast-region", {
      connected(el) {
        if (!el.hasAttribute("role")) el.setAttribute("role", "region");
        if (!el.hasAttribute("aria-label")) {
          el.setAttribute("aria-label", "Notifications");
        }
        el.setAttribute("aria-live", "polite");
        el.setAttribute("aria-relevant", "additions text");

        const onKeydown = function (event) {
          if (event.key !== "Escape") return;
          const open = openToasts(el);
          if (!open.length) return;
          const newest = open[open.length - 1];
          if (typeof LDS._dismissToast === "function") {
            LDS._dismissToast(newest, "escape");
          }
        };

        const slot = el.$("slot");
        const syncListener = function () {
          const s = regionState.get(el);
          if (!s) return;
          const has = openToasts(el).length > 0 || toastsOf(el).length > 0;
          if (has && !s.listening) {
            document.addEventListener("keydown", onKeydown);
            s.listening = true;
          } else if (!has && s.listening) {
            document.removeEventListener("keydown", onKeydown);
            s.listening = false;
          }
        };

        if (slot) slot.addEventListener("slotchange", syncListener);

        const mo = new MutationObserver(syncListener);
        mo.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["open"],
        });

        regionState.set(el, { onKeydown: onKeydown, mo: mo, listening: false });
        syncListener();
      },

      disconnected(el) {
        const s = regionState.get(el);
        if (!s) return;
        document.removeEventListener("keydown", s.onKeydown);
        s.mo.disconnect();
        regionState.delete(el);
      },
    });

    function toastsOf(el) {
      return Array.prototype.slice.call(el.querySelectorAll("lds-toast"));
    }

    function openToasts(el) {
      return toastsOf(el).filter(function (toast) {
        return toast.hasAttribute("open") && toast.getAttribute("open") !== "false";
      });
    }

    /**
     * Show a transient toast in the page toast region.
     *
     * @param {object} [opts]
     * @param {"info"|"success"|"warning"|"danger"} [opts.intent]
     * @param {string} [opts.title]
     * @param {string} [opts.description]
     * @param {number} [opts.duration] ms; 0 = sticky
     * @param {boolean} [opts.dismissible] default true
     * @param {"top-start"|"top-end"|"bottom-start"|"bottom-end"} [opts.placement]
     * @returns {HTMLElement} the <lds-toast> element
     */
    LDS.toast = function (opts) {
      opts = opts || {};

      let region = null;
      if (opts.placement) {
        region = document.querySelector(
          'lds-toast-region[placement="' + opts.placement + '"]'
        );
      }
      if (!region) region = document.querySelector("lds-toast-region");
      if (!region) {
        region = document.createElement("lds-toast-region");
        if (opts.placement) region.setAttribute("placement", opts.placement);
        document.body.appendChild(region);
      }

      const toast = document.createElement("lds-toast");
      toast.setAttribute("data-managed", "");

      const intent = opts.intent || "info";
      toast.setAttribute("intent", intent);

      if (opts.duration != null) {
        toast.setAttribute("duration", String(opts.duration));
      }

      if (opts.dismissible === false) {
        toast.setAttribute("dismissible", "false");
      }

      if (opts.title) {
        const title = document.createElement("span");
        title.slot = "title";
        title.textContent = String(opts.title);
        toast.appendChild(title);
      }

      if (opts.description) {
        toast.appendChild(document.createTextNode(String(opts.description)));
      }

      region.appendChild(toast);
      toast.setAttribute("open", "");
      return toast;
    };
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

  /* component: lds-breadcrumb (draft) */
  LDS.define({
    tag: "lds-breadcrumb",
    className: "LdsBreadcrumb",
    observed: ["label", "expanded", "max-items"],
    defaults: {"max-items": "1"},
    template: `<nav class="root" part="root">
  <div class="list" part="list" role="list">
    <slot></slot>
    <button type="button" class="overflow" part="overflow" hidden aria-expanded="false">
      <span class="overflow__sep" aria-hidden="true"></span>
      <span class="overflow__icon" aria-hidden="true"></span>
    </button>
  </div>
</nav>`,
    styles: `/* Hierarchy trail. Always one line: middle items collapse behind the overflow
 * control when the host is too narrow; expanded shows every step. */

:host {
  --lds-breadcrumb-fg: var(--lds-color-fg-muted);
  --lds-breadcrumb-fg-current: var(--lds-color-fg-default);
  --lds-breadcrumb-gap: var(--lds-space-1);

  display: block;
  max-width: 100%;
  min-width: 0;
  color: var(--lds-breadcrumb-fg);
}

:host([hidden]) {
  display: none;
}

.root {
  max-width: 100%;
  min-width: 0;
}

.list {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--lds-breadcrumb-gap);
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Expanded in a tight container: scroll instead of wrapping (wrapping puts
 * leading chevrons at the start of new lines). */
:host([expanded]) .list {
  overflow-x: auto;
}

.overflow {
  display: none;
  flex: none;
  align-items: center;
  gap: var(--lds-breadcrumb-gap);
  order: 2;

  height: var(--lds-control-height-sm);
  padding: 0;
  padding-inline-end: var(--lds-space-1);

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-medium);
  line-height: 1;
  color: var(--lds-color-fg-muted);

  background: transparent;
  border: none;
  border-radius: var(--lds-control-radius-sm);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--lds-transition-control),
    color var(--lds-transition-control);
}

.overflow:hover {
  color: var(--lds-color-fg-default);
}

.overflow:hover .overflow__icon {
  background: var(--lds-color-bg-subtle);
}

.overflow:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

:host([data-collapsed]:not([expanded])) .overflow {
  display: inline-flex;
}

/* Match breadcrumb-item separators so Home > … > Current reads evenly. */
.overflow__sep {
  display: inline-flex;
  flex: none;
  width: 0.4em;
  height: 0.4em;
  margin-inline: var(--lds-space-1);
  border-inline-end: 2px solid var(--lds-color-border-strong);
  border-block-end: 2px solid var(--lds-color-border-strong);
  rotate: -45deg;
}

.overflow__icon {
  display: inline-flex;
  position: relative;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: var(--lds-control-height-sm);
  height: var(--lds-control-height-sm);
  border-radius: var(--lds-control-radius-sm);
  transition: background var(--lds-transition-control);
}

.overflow__icon::before,
.overflow__icon::after {
  content: "";
  position: absolute;
  inset-block-start: 50%;
  width: 0.25em;
  height: 0.25em;
  background: currentColor;
  border-radius: var(--lds-radius-full);
  translate: 0 -50%;
}

.overflow__icon::before {
  inset-inline-start: calc(50% - 0.45em);
  box-shadow: 0.45em 0 0 currentColor;
}

.overflow__icon::after {
  inset-inline-start: calc(50% + 0.45em);
}

::slotted(lds-breadcrumb-item) {
  flex: none;
  min-width: 0;
  max-width: 100%;
}

::slotted(lds-breadcrumb-item:first-child) {
  order: 1;
}

::slotted(lds-breadcrumb-item:not(:first-child)) {
  order: 3;
}

/* Collapsed single-line: last step fills the remainder and ellipsizes. */
:host([data-collapsed]:not([expanded])) ::slotted(lds-breadcrumb-item:last-child) {
  flex: 1 1 0;
  min-width: 0;
}`,
  });

  /* component: lds-breadcrumb-item (draft) */
  LDS.define({
    tag: "lds-breadcrumb-item",
    className: "LdsBreadcrumbItem",
    observed: ["href", "target", "current"],
    defaults: {},
    template: `<span class="item" part="item" role="listitem">
  <span class="sep" part="separator" aria-hidden="true"></span>
  <a class="link" part="link"><slot></slot></a>
</span>`,
    styles: `/* One step in an lds-breadcrumb. The leading separator hides on :first-child. */

:host {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

:host([hidden]),
:host([data-overflow]) {
  display: none;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: var(--lds-breadcrumb-gap, var(--lds-space-1));
  min-width: 0;
  max-width: 100%;
}

.sep {
  display: inline-flex;
  flex: none;
  width: 0.4em;
  height: 0.4em;
  margin-inline: var(--lds-space-1);
  border-inline-end: 2px solid var(--lds-color-border-strong);
  border-block-end: 2px solid var(--lds-color-border-strong);
  rotate: -45deg;
}

:host(:first-child) .sep {
  display: none;
}

.link {
  display: inline-block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-medium);
  line-height: var(--lds-font-leading-snug);
  color: var(--lds-breadcrumb-fg, var(--lds-color-fg-muted));
  text-decoration: none;
  border-radius: var(--lds-control-radius-sm);
  transition: color var(--lds-transition-control);
}

a.link:hover {
  color: var(--lds-color-fg-link);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.link:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

:host([current]) .link,
.link[aria-current="page"] {
  color: var(--lds-breadcrumb-fg-current, var(--lds-color-fg-default));
  font-weight: var(--lds-font-weight-semibold);
  text-decoration: none;
  pointer-events: none;
}`,
  });

  /* component: lds-nav (draft) */
  LDS.define({
    tag: "lds-nav",
    className: "LdsNav",
    observed: ["collapsed"],
    defaults: {},
    template: `<aside class="root" part="root">
  <div class="brand" part="brand"><slot name="brand"></slot></div>
  <nav class="body" part="body"><slot></slot></nav>
  <div class="footer" part="footer"><slot name="footer"></slot></div>
</aside>`,
    styles: `/* App sidebar shell. Item and group chrome live in their own components;
 * --lds-nav-* custom properties inherit into their shadows for collapsed mode. */

:host {
  --lds-nav-bg: var(--lds-color-bg-subtle);
  --lds-nav-fg: var(--lds-color-fg-default);
  --lds-nav-border: var(--lds-color-border-subtle);
  --lds-nav-width: 15rem;
  --lds-nav-padding: var(--lds-space-3);
  --lds-nav-gap: var(--lds-space-1);
  --lds-nav-item-label-display: inline;
  --lds-nav-group-label-display: inline;
  --lds-nav-group-chevron-display: inline-flex;

  display: flex;
  flex-direction: column;
  width: var(--lds-nav-width);
  min-height: 100%;
  color: var(--lds-nav-fg);
  background: var(--lds-nav-bg);
  border-inline-end: 1px solid var(--lds-nav-border);
  transition:
    width var(--lds-transition-surface),
    background var(--lds-transition-surface),
    border-color var(--lds-transition-surface);
}

:host([hidden]) {
  display: none;
}

:host([collapsed]) {
  --lds-nav-width: calc(var(--lds-control-height-md) + var(--lds-space-6));
  --lds-nav-item-label-display: none;
  --lds-nav-group-trigger-display: none;
  --lds-nav-group-label-display: none;
  --lds-nav-group-chevron-display: none;
  --lds-nav-group-closed-display: flex;
  --lds-nav-group-closed-pad: 0;
}

.root {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--lds-space-3);
  min-height: 0;
  padding: var(--lds-nav-padding);
}

.brand {
  display: flex;
  flex: none;
  align-items: center;
  min-width: 0;
  min-height: var(--lds-control-height-md);
  padding-inline: var(--lds-space-2);
}

.brand[data-empty] {
  display: none;
}

.body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--lds-nav-gap);
  min-height: 0;
  overflow: auto;
}

.footer {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: var(--lds-nav-gap);
  margin-block-start: auto;
  padding-block-start: var(--lds-space-3);
  border-block-start: 1px solid var(--lds-nav-border);
}

.footer[data-empty] {
  display: none;
}

::slotted([slot="brand"]) {
  font-family: var(--lds-font-family-display);
  font-size: var(--lds-font-size-md);
  font-weight: var(--lds-font-weight-semibold);
  line-height: var(--lds-font-leading-tight);
  color: var(--lds-nav-fg);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:host([collapsed]) .brand {
  justify-content: center;
  padding-inline: 0;
}

:host([collapsed]) ::slotted([slot="brand"]) {
  font-size: var(--lds-font-size-sm);
}`,
  });

  /* component: lds-nav-group (draft) */
  LDS.define({
    tag: "lds-nav-group",
    className: "LdsNavGroup",
    observed: ["label", "open"],
    defaults: {},
    template: `<div class="group" part="group">
  <button type="button" class="trigger" part="trigger" aria-expanded="false">
    <span class="trigger__label" part="label"></span>
    <span class="trigger__chevron" part="chevron" aria-hidden="true"></span>
  </button>
  <div class="items" part="items" role="group">
    <slot></slot>
  </div>
</div>`,
    styles: `/* Collapsible section inside <lds-nav>. Open state is the \`open\` attribute.
 * A collapsed parent nav sets --lds-nav-group-* vars so the rail stays usable. */

:host {
  display: block;
}

:host([hidden]) {
  display: none;
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--lds-space-1);
}

.trigger {
  display: var(--lds-nav-group-trigger-display, flex);
  align-items: center;
  justify-content: space-between;
  gap: var(--lds-control-gap-md);

  width: 100%;
  min-height: var(--lds-control-height-sm);
  padding-inline: var(--lds-control-padding-x-sm);

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-2xs);
  font-weight: var(--lds-font-weight-semibold);
  line-height: 1;
  letter-spacing: var(--lds-font-tracking-caps);
  text-transform: uppercase;
  color: var(--lds-color-fg-subtle);
  text-align: start;

  background: transparent;
  border: none;
  border-radius: var(--lds-control-radius-sm);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--lds-transition-control),
    color var(--lds-transition-control);
}

.trigger:hover {
  color: var(--lds-color-fg-muted);
  background: var(--lds-color-bg-muted);
}

.trigger:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

.trigger__label {
  display: var(--lds-nav-group-label-display, inline);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger__chevron {
  display: var(--lds-nav-group-chevron-display, inline-flex);
  flex: none;
  width: 0.5em;
  height: 0.5em;
  border-inline-end: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  rotate: -45deg;
  translate: 0 -0.1em;
  transition: rotate var(--lds-transition-control);
}

:host([open]) .trigger__chevron {
  rotate: 45deg;
  translate: 0 0.05em;
}

.items {
  display: flex;
  flex-direction: column;
  gap: var(--lds-space-1);
  padding-inline-start: var(--lds-space-2);
}

:host(:not([open])) .items {
  display: var(--lds-nav-group-closed-display, none);
  padding-inline-start: var(--lds-nav-group-closed-pad, var(--lds-space-2));
}`,
  });

  /* component: lds-nav-item (draft) */
  LDS.define({
    tag: "lds-nav-item",
    className: "LdsNavItem",
    observed: ["href", "target", "active", "disabled", "label"],
    defaults: {},
    template: `<a class="item" part="item">
  <span class="item__start" part="start"><slot name="start"></slot></span>
  <span class="item__label" part="label"><slot></slot></span>
  <span class="item__end" part="end"><slot name="end"></slot></span>
</a>`,
    styles: `/* Single sidebar destination. Label visibility follows --lds-nav-item-label-display
 * inherited from a collapsed <lds-nav>. */

:host {
  --lds-nav-item-bg: transparent;
  --lds-nav-item-bg-hover: var(--lds-color-bg-muted);
  --lds-nav-item-fg: var(--lds-color-fg-muted);
  --lds-nav-item-fg-active: var(--lds-color-accent-fg);
  --lds-nav-item-bg-active: var(--lds-color-accent-subtle);

  display: block;
}

:host([hidden]) {
  display: none;
}

:host([active]) {
  --lds-nav-item-bg: var(--lds-nav-item-bg-active);
  --lds-nav-item-fg: var(--lds-nav-item-fg-active);
  --lds-nav-item-bg-hover: var(--lds-color-accent-muted);
}

.item {
  display: flex;
  align-items: center;
  gap: var(--lds-control-gap-md);

  min-height: var(--lds-control-height-md);
  padding-inline: var(--lds-control-padding-x-sm);

  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-medium);
  line-height: 1;
  color: var(--lds-nav-item-fg);
  text-decoration: none;

  background: var(--lds-nav-item-bg);
  border-radius: var(--lds-control-radius-md);
  transition:
    background var(--lds-transition-control),
    color var(--lds-transition-control);
}

.item:hover {
  background: var(--lds-nav-item-bg-hover);
  color: var(--lds-color-fg-default);
}

:host([active]) .item:hover {
  color: var(--lds-nav-item-fg-active);
}

.item:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

.item__start,
.item__end {
  display: inline-flex;
  flex: none;
  align-items: center;
  line-height: 1;
}

.item__start[data-empty],
.item__end[data-empty] {
  display: none;
}

.item__label {
  display: var(--lds-nav-item-label-display, inline);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__label[data-empty] {
  display: none;
}

:host([disabled]) .item {
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: none;
}

::slotted([slot="start"]),
::slotted([slot="end"]) {
  display: inline-flex;
  flex: none;
  align-items: center;
  line-height: 1;
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

  /* component: lds-toast (draft) */
  LDS.define({
    tag: "lds-toast",
    className: "LdsToast",
    observed: ["intent", "open", "dismissible", "duration"],
    defaults: {"intent": "info", "duration": "5000"},
    template: `<div class="root" part="root">
  <div class="main">
    <div class="title" part="title"><slot name="title"></slot></div>
    <div class="body" part="body"><slot></slot></div>
    <div class="action" part="action"><slot name="action"></slot></div>
  </div>
  <button type="button" class="close" part="close" aria-label="Dismiss" hidden>
    <lds-icon name="x"></lds-icon>
  </button>
</div>`,
    styles: `/* Transient notification card. Intents are custom properties on :host. */

:host {
  --lds-toast-bg: var(--lds-color-accent-subtle);
  --lds-toast-fg: var(--lds-color-accent-fg);
  --lds-toast-border: var(--lds-color-accent-border);
  --lds-toast-width: 22rem;

  display: none;
  max-width: 100%;
  color: var(--lds-toast-fg);
}

:host([open]) {
  display: block;
}

:host([hidden]) {
  display: none;
}

:host([intent="success"]) {
  --lds-toast-bg: var(--lds-color-success-subtle);
  --lds-toast-fg: var(--lds-color-success-fg);
  --lds-toast-border: var(--lds-color-success-border);
}

:host([intent="warning"]) {
  --lds-toast-bg: var(--lds-color-warning-subtle);
  --lds-toast-fg: var(--lds-color-warning-fg);
  --lds-toast-border: var(--lds-color-warning-border);
}

:host([intent="danger"]) {
  --lds-toast-bg: var(--lds-color-danger-subtle);
  --lds-toast-fg: var(--lds-color-danger-fg);
  --lds-toast-border: var(--lds-color-danger-border);
}

.root {
  display: flex;
  align-items: flex-start;
  gap: var(--lds-space-3);

  box-sizing: border-box;
  width: var(--lds-toast-width);
  max-width: 100%;
  padding: var(--lds-space-4);

  background: var(--lds-toast-bg);
  border: 1px solid var(--lds-toast-border);
  border-radius: var(--lds-radius-md);
  box-shadow: var(--lds-shadow-md);
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--lds-space-1);
  min-width: 0;
}

.title {
  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-semibold);
  line-height: var(--lds-font-leading-snug);
}

.title[data-empty] {
  display: none;
}

.body {
  font-family: var(--lds-font-family-sans);
  font-size: var(--lds-font-size-sm);
  font-weight: var(--lds-font-weight-regular);
  line-height: var(--lds-font-leading-normal);
}

.body[data-empty] {
  display: none;
}

.action {
  margin-block-start: var(--lds-space-2);
}

.action[data-empty] {
  display: none;
}

.close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;

  width: var(--lds-control-height-sm);
  height: var(--lds-control-height-sm);
  margin: calc(var(--lds-space-1) * -1);
  padding: 0;

  color: inherit;
  background: transparent;
  border: none;
  border-radius: var(--lds-control-radius-sm);
  cursor: pointer;
  appearance: none;
  opacity: 0.7;
  transition:
    background var(--lds-transition-control),
    opacity var(--lds-transition-control);
}

.close:hover {
  opacity: 1;
  background: var(--lds-color-bg-muted);
}

.close:focus-visible {
  outline: var(--lds-focus-width) solid var(--lds-color-focus-ring);
  outline-offset: var(--lds-focus-offset);
}

.close[hidden] {
  display: none;
}`,
  });

  /* component: lds-toast-region (draft) */
  LDS.define({
    tag: "lds-toast-region",
    className: "LdsToastRegion",
    observed: ["placement"],
    defaults: {"placement": "top-end"},
    template: `<div class="stack" part="stack">
  <slot></slot>
</div>`,
    styles: `/* Fixed toast stack. Placement is inset + alignment on :host. */

:host {
  --lds-toast-region-gap: var(--lds-space-3);
  --lds-toast-region-inset: var(--lds-space-4);

  position: fixed;
  z-index: var(--lds-z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--lds-toast-region-gap);
  box-sizing: border-box;
  max-width: calc(100vw - (var(--lds-toast-region-inset) * 2));
  max-height: calc(100vh - (var(--lds-toast-region-inset) * 2));
  overflow: auto;
  pointer-events: none;
}

:host([hidden]) {
  display: none;
}

:host([placement="top-start"]) {
  inset-block-start: var(--lds-toast-region-inset);
  inset-inline-start: var(--lds-toast-region-inset);
  align-items: flex-start;
}

:host([placement="top-end"]),
:host(:not([placement])) {
  inset-block-start: var(--lds-toast-region-inset);
  inset-inline-end: var(--lds-toast-region-inset);
  align-items: flex-end;
}

:host([placement="bottom-start"]) {
  inset-block-end: var(--lds-toast-region-inset);
  inset-inline-start: var(--lds-toast-region-inset);
  align-items: flex-start;
}

:host([placement="bottom-end"]) {
  inset-block-end: var(--lds-toast-region-inset);
  inset-inline-end: var(--lds-toast-region-inset);
  align-items: flex-end;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--lds-toast-region-gap);
  align-items: inherit;
  min-width: 0;
}

::slotted(lds-toast) {
  pointer-events: auto;
}

:host(:not(:has(lds-toast))) {
  /* No children — stay out of the way. :has is in the support matrix. */
  visibility: hidden;
}`,
  });

  LDS.version = "0.1.0";
  global.LDS = LDS;
})(typeof globalThis !== "undefined" ? globalThis : window);
