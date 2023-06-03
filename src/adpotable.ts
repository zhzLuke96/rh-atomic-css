// @fork https://github.com/tw-in-js/twind/blob/4df946522f9a93644f99b21c33a79beb47a5eb01/packages/with-web-components/src/index.ts

import { cssom, noop, type Sheet } from "@twind/core";

declare global {
  // eslint-disable-next-line no-var
  var ShadyCSS: { nativeShadow: boolean };
}

/**
 * Whether the current browser supports `adoptedStyleSheets`.
 * @link https://github.com/lit/lit/blob/393e30cf7c7f97712e524df34e7343147055fc5d/packages/reactive-element/src/css-tag.ts#L13
 */
const supportsAdoptingStyleSheets =
  typeof ShadowRoot !== "undefined" &&
  (typeof ShadyCSS === "undefined" || ShadyCSS.nativeShadow) &&
  "adoptedStyleSheets" in Document.prototype &&
  "replace" in CSSStyleSheet.prototype;

function getShadowRoot(element: HTMLElement): ShadowRoot {
  return element.shadowRoot || element.attachShadow({ mode: "open" });
}

interface AdoptableSheet extends Sheet<CSSStyleSheet> {
  connect(element: HTMLElement): void;
  disconnect(element: HTMLElement): void;
}

export function adoptable(): AdoptableSheet {
  if (supportsAdoptingStyleSheets) {
    try {
      // Try using adoptedStyleSheets — not supported in all browsers
      const sheet = cssom(new CSSStyleSheet()) as AdoptableSheet;

      sheet.connect = (element) => {
        const shadowRoot = getShadowRoot(element);
        shadowRoot.adoptedStyleSheets = [
          ...shadowRoot.adoptedStyleSheets,
          sheet.target,
        ];
      };

      sheet.disconnect = noop;

      return sheet;
    } catch {
      // ignore — continue with fallback
    }
  }

  // Fallback: create a dedicated stylesheet for each element instance

  // Create our base stylesheet — its css rules will be copied to each element style
  const style = document.createElement("style");
  // Prevent this style sheet from being applied anywhere
  style.media = "not all";
  document.head.prepend(style);

  const sheets = [cssom(style)];

  /** @type {WeakMap<HTMLElement, import('@twind/core').Sheet>} */
  const sheetsByElement = new WeakMap();

  return {
    get target() {
      return sheets[0].target;
    },

    snapshot() {
      const restores = sheets.map((sheet) => sheet.snapshot());
      return () => restores.forEach((restore) => restore());
    },

    clear() {
      sheets.forEach((sheets) => sheets.clear());
    },

    destroy() {
      sheets.forEach((sheets) => sheets.destroy());
    },

    insert(css, index, rule) {
      // We first insert the rule into our base sheet
      // This call will check (try-catch) and warn if necessary
      sheets[0].insert(css, index, rule);

      // For all connected sheets we insert the resulting rule directly
      // by-passing the try-catch block
      const cssRule = this.target.cssRules[index];
      sheets.forEach(
        (sheets, notFirst) =>
          notFirst && sheets.target.insertRule(cssRule.cssText, index)
      );
    },

    resume(addClassName, insert) {
      return sheets[0].resume(addClassName, insert);
    },

    connect(element) {
      const style = document.createElement("style");
      getShadowRoot(element).appendChild(style);

      const sheet = cssom(style);

      // Directly copy all rules from our base sheet
      const { cssRules } = this.target;
      for (let i = 0; i < cssRules.length; i++) {
        sheet.target.insertRule(cssRules[i].cssText, i);
      }

      sheets.push(sheet);
      sheetsByElement.set(element, sheet);
    },

    disconnect(element) {
      const index = sheets.indexOf(sheetsByElement.get(element));
      if (index >= 0) {
        sheets.splice(index, 1);
      }
    },
  };
}
