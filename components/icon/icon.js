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
