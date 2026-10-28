/* ------------------------------------------------------------------------
 * Anchored positioning — manual layout until CSS anchor positioning is safe.
 *
 * Places a floating element relative to an anchor with flip + viewport clamp.
 * Call again on resize/scroll while open; the consumer owns that loop.
 * ---------------------------------------------------------------------- */

/**
 * Position `floating` next to `anchor`.
 *
 * Placement is `side` or `side-align`: side is top | bottom | left | right,
 * align is start | end, and a bare side centres on the anchor. The side flips
 * when the preferred one would overflow and the opposite one fits.
 *
 * @param {HTMLElement} floating
 * @param {Element} anchor
 * @param {object} [opts]
 * @param {string} [opts.placement] default "bottom-end"
 * @param {number} [opts.offset] gap in CSS pixels; default = control.gap.md
 * @param {boolean} [opts.matchWidth] min-width matches anchor width
 * @returns {string} the side actually used, after any flip
 */
LDS.position = function (floating, anchor, opts) {
  opts = opts || {};
  if (!floating || !anchor) return "";

  const placement = opts.placement || "bottom-end";
  let offset = opts.offset;
  if (offset == null) {
    const raw = LDS.token("control.gap.md", anchor);
    offset = raw ? parseFloat(raw) : 8;
    if (Number.isNaN(offset)) offset = 8;
  }

  const prevVisibility = floating.style.visibility;
  const prevDisplay = floating.style.display;
  floating.style.visibility = "hidden";
  floating.style.display = "block";
  floating.style.position = "fixed";
  floating.style.top = "0";
  floating.style.left = "0";

  /* Measure the anchor only once the floating element is out of flow: while
   * it is still static it can widen the anchor's container and shift the
   * anchor, which is then measured where it will not stay. */
  const anchorRect = anchor.getBoundingClientRect();
  if (opts.matchWidth) {
    floating.style.minWidth = Math.ceil(anchorRect.width) + "px";
  }

  const floatRect = floating.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const parts = placement.split("-");
  let side = parts[0];
  const align = parts[1] || "center";
  const vertical = side === "top" || side === "bottom";

  /* Main axis: the coordinate on the side, flipped if it does not fit. */
  const before = vertical
    ? anchorRect.top - offset - floatRect.height
    : anchorRect.left - offset - floatRect.width;
  const after = vertical ? anchorRect.bottom + offset : anchorRect.right + offset;
  const limit = vertical ? vh : vw;
  const size = vertical ? floatRect.height : floatRect.width;

  let main;
  if (side === "bottom" || side === "right") {
    main = after;
    if (after + size > limit && before >= 0) {
      main = before;
      side = side === "bottom" ? "top" : "left";
    }
  } else {
    main = before;
    if (before < 0 && after + size <= limit) {
      main = after;
      side = side === "top" ? "bottom" : "right";
    }
  }

  /* Cross axis: start, end or centre along the anchor. */
  const crossStart = vertical ? anchorRect.left : anchorRect.top;
  const crossEnd = vertical ? anchorRect.right : anchorRect.bottom;
  const crossSize = vertical ? floatRect.width : floatRect.height;
  let cross;
  if (align === "start") cross = crossStart;
  else if (align === "end") cross = crossEnd - crossSize;
  else cross = (crossStart + crossEnd) / 2 - crossSize / 2;

  let top = vertical ? main : cross;
  let left = vertical ? cross : main;

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
  return side;
};
