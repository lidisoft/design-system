/* Behaviour for <lds-avatar>.
 *
 * Derives initials from name, loads src with error fallback, and always
 * exposes an accessible name via label or name.
 */

LDS.behavior("lds-avatar", {
  connected(el) {
    const img = el.$(".img");

    img.addEventListener("load", () => {
      el._lds.imageFailed = false;
      syncFace(el);
    });
    img.addEventListener("error", () => {
      el._lds.imageFailed = true;
      syncFace(el);
    });

    syncAll(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "src") el._lds.imageFailed = false;
    syncAll(el);
  },
});

function syncAll(el) {
  syncName(el);
  syncImage(el);
  syncFace(el);
}

function syncName(el) {
  const label = el.getAttribute("label") || el.getAttribute("name");
  if (label) {
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", label);
  } else {
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "User");
  }
}

function syncImage(el) {
  const img = el.$(".img");
  const src = el.getAttribute("src");
  if (src) {
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
  } else {
    img.removeAttribute("src");
    el._lds.imageFailed = false;
  }
}

function syncFace(el) {
  const img = el.$(".img");
  const initialsEl = el.$(".initials");
  const fallback = el.$(".fallback");

  const src = el.getAttribute("src");
  const failed = !!el._lds.imageFailed;
  const showImage = !!(src && !failed && img.complete && img.naturalWidth > 0);
  const initials = resolveInitials(el);

  img.hidden = !showImage;
  initialsEl.hidden = !initials || showImage;
  fallback.hidden = !!(initials || showImage);

  initialsEl.textContent = initials || "";
}

function resolveInitials(el) {
  const explicit = (el.getAttribute("initials") || "").trim();
  if (explicit) return explicit.slice(0, 3);

  const name = (el.getAttribute("name") || "").trim();
  if (!name) return "";

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
