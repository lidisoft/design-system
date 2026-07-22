/* ------------------------------------------------------------------------
 * Anchored positioning — manual layout until CSS anchor positioning is safe.
 *
 * Places a floating element relative to an anchor with flip + viewport clamp.
 * Call again on resize/scroll while open; the consumer owns that loop.
 * ---------------------------------------------------------------------- */

/**
 * Position `floating` next to `anchor`.
 *
 * @param {HTMLElement} floating
 * @param {Element} anchor
 * @param {object} [opts]
 * @param {"bottom-start"|"bottom-end"|"top-start"|"top-end"} [opts.placement]
 * @param {number} [opts.offset] gap in CSS pixels; default = control.gap.md
 * @param {boolean} [opts.matchWidth] min-width matches anchor width
 */
LDS.position = function (floating, anchor, opts) {
  opts = opts || {};
  if (!floating || !anchor) return;

  const placement = opts.placement || "bottom-end";
  let offset = opts.offset;
  if (offset == null) {
    const raw = LDS.token("control.gap.md", anchor);
    offset = raw ? parseFloat(raw) : 8;
    if (Number.isNaN(offset)) offset = 8;
  }

  const anchorRect = anchor.getBoundingClientRect();
  const prevVisibility = floating.style.visibility;
  const prevDisplay = floating.style.display;
  floating.style.visibility = "hidden";
  floating.style.display = "block";
  floating.style.position = "fixed";
  floating.style.top = "0";
  floating.style.left = "0";
  if (opts.matchWidth) {
    floating.style.minWidth = Math.ceil(anchorRect.width) + "px";
  }

  const floatRect = floating.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const parts = placement.split("-");
  let side = parts[0]; /* top | bottom */
  let align = parts[1] || "start"; /* start | end */

  let top;
  let left;

  if (side === "bottom") {
    top = anchorRect.bottom + offset;
    if (top + floatRect.height > vh && anchorRect.top - offset - floatRect.height >= 0) {
      side = "top";
      top = anchorRect.top - offset - floatRect.height;
    }
  } else {
    top = anchorRect.top - offset - floatRect.height;
    if (top < 0 && anchorRect.bottom + offset + floatRect.height <= vh) {
      side = "bottom";
      top = anchorRect.bottom + offset;
    }
  }

  if (align === "end") {
    left = anchorRect.right - floatRect.width;
  } else {
    left = anchorRect.left;
  }

  /* Clamp into the viewport with a small inset. */
  const inset = 8;
  left = Math.min(Math.max(left, inset), Math.max(inset, vw - floatRect.width - inset));
  top = Math.min(Math.max(top, inset), Math.max(inset, vh - floatRect.height - inset));

  floating.style.top = Math.round(top) + "px";
  floating.style.left = Math.round(left) + "px";
  floating.style.visibility = prevVisibility || "";
  if (prevDisplay) {
    floating.style.display = prevDisplay;
  } else {
    floating.style.removeProperty("display");
  }
};
