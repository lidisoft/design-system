/* ------------------------------------------------------------------------
 * Overlay helpers — non-modal dismiss plumbing for menus and future popovers.
 *
 * Menus do not lock scroll. Pass scrollLock: true for modals.
 * Callers own open/close state; this wires Escape, outside click, optional
 * focus trap, focus restoration, and optional document scroll lock.
 * ---------------------------------------------------------------------- */

/**
 * Bind dismiss and focus behaviour to an open overlay root.
 *
 * @param {Element} root floating surface (panel)
 * @param {object} [opts]
 * @param {(reason: "escape"|"outside") => void} [opts.onDismiss]
 * @param {Element} [opts.restoreFocus] element to focus on disconnect
 * @param {boolean} [opts.trapFocus=true] cycle Tab within root
 * @param {boolean} [opts.scrollLock=false] lock documentElement overflow while bound
 * @param {Element|Element[]} [opts.ignoreOutside] clicks here are not "outside"
 * @returns {{ disconnect(): void }}
 */
LDS.overlay = {
  bind(root, opts) {
    opts = opts || {};
    const onDismiss = typeof opts.onDismiss === "function" ? opts.onDismiss : function () {};
    const trapFocus = opts.trapFocus !== false;
    const restoreFocus = opts.restoreFocus || null;
    const scrollLock = !!opts.scrollLock;
    let previousOverflow = "";

    if (scrollLock && typeof document !== "undefined") {
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }

    let ignore = opts.ignoreOutside || [];
    if (!Array.isArray(ignore)) ignore = [ignore];
    ignore = ignore.filter(Boolean);

    const composedContains = function (container, target) {
      let node = target;
      while (node) {
        if (node === container) return true;
        if (node.nodeType === 11 && node.host) {
          node = node.host;
        } else {
          node = node.parentNode;
        }
      }
      return false;
    };

    const isInside = function (target) {
      if (!target || !target.nodeType) return false;
      if (composedContains(root, target)) return true;
      for (let i = 0; i < ignore.length; i++) {
        if (composedContains(ignore[i], target)) return true;
      }
      return false;
    };

    const deepestActive = function () {
      let el = document.activeElement;
      while (el && el.shadowRoot && el.shadowRoot.activeElement) {
        el = el.shadowRoot.activeElement;
      }
      return el;
    };

    const focusSelector =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    const isVisible = function (el) {
      if (el.closest("[hidden]")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none";
    };

    /* Walk light DOM, slots and shadow roots — menu items live in slotted
     * custom elements whose real controls sit in their own shadows. */
    const focusables = function () {
      const out = [];
      const visit = function (node) {
        if (!node) return;
        if (node.nodeType === 1) {
          if (node.matches(focusSelector) && isVisible(node)) out.push(node);
          if (node.tagName === "SLOT") {
            node.assignedElements({ flatten: true }).forEach(visit);
            return;
          }
          if (node.shadowRoot) visit(node.shadowRoot);
          Array.prototype.forEach.call(node.children, visit);
          return;
        }
        if (node.nodeType === 11) {
          Array.prototype.forEach.call(node.children, visit);
        }
      };
      visit(root);
      return out;
    };

    /* Defer outside-pointer binding so the opening click does not dismiss. */
    let pointerReady = false;
    const armPointer = function () {
      pointerReady = true;
    };
    window.setTimeout(armPointer, 0);

    const onPointerDown = function (event) {
      if (!pointerReady) return;
      if (isInside(event.target)) return;
      onDismiss("outside");
    };

    const onKeydown = function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss("escape");
        return;
      }
      if (!trapFocus || event.key !== "Tab") return;

      const list = focusables();
      if (!list.length) {
        event.preventDefault();
        if (typeof root.focus === "function") root.focus();
        return;
      }

      const first = list[0];
      const last = list[list.length - 1];
      const active = deepestActive();

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!composedContains(root, active) && ignore.every(function (node) {
        return !composedContains(node, active);
      })) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeydown, true);

    return {
      disconnect: function () {
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeydown, true);
        if (scrollLock && typeof document !== "undefined") {
          document.documentElement.style.overflow = previousOverflow;
        }
        if (restoreFocus && typeof restoreFocus.focus === "function") {
          try {
            restoreFocus.focus();
          } catch (_) {
            /* ignore */
          }
        }
      },
    };
  },
};
