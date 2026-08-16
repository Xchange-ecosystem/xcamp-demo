import { applySkin, type SkinDefinition } from "@xchange/ui";

const STYLE_ID = "xcamp-vendor-skin";
const LAYER_NAME = "xcamp-vendor-skin";

/**
 * Publish a vendor skin's tokens as app-wide CSS custom property defaults.
 *
 * Why not call `applySkin(skin)` directly against <html>: applySkin writes with
 * `element.style.setProperty()`, i.e. inline styles. Inline styles outrank every
 * stylesheet selector, so the `--skin-*` values in styles.css — including the
 * whole `.dark` block — become dead the moment applySkin runs. That silently
 * broke dark mode for every token the two sides share.
 *
 * Instead we let applySkin write onto a detached probe element, then re-emit the
 * declarations inside a cascade layer. Layered rules always lose to unlayered
 * ones regardless of specificity or source order, and styles.css declares its
 * `:root` / `.dark` blocks unlayered. Result: the vendor supplies a value for
 * every token it knows about (typography, radii, motion, gravity, and colours
 * styles.css never declares), while anything styles.css does declare keeps
 * winning in both light and dark mode.
 */
export function applyBaseSkin(skin: SkinDefinition): void {
  if (typeof document === "undefined") return;

  // applySkin also stamps data-skin-paradigm / data-skin-tone, which CSS
  // attribute selectors key off — read them back off the probe and forward them.
  const probe = document.createElement("div");
  applySkin(skin, probe);

  const declarations = probe.getAttribute("style") ?? "";
  if (declarations) {
    const style = document.getElementById(STYLE_ID) ?? document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `@layer ${LAYER_NAME} { :root { ${declarations} } }`;
    // Prepend so the layer is registered before styles.css is parsed.
    if (!style.isConnected) document.head.prepend(style);
  }

  for (const attr of ["data-skin-paradigm", "data-skin-tone"]) {
    const value = probe.getAttribute(attr);
    if (value !== null) document.documentElement.setAttribute(attr, value);
  }
}
