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
