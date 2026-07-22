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
