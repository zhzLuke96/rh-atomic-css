import { useContextProxy } from "@rhjs/rh";
import {
  createEffect,
  DirectiveDefine,
  disableDirective,
  enableDirective,
  getRootNode,
} from "@rhjs/rh";

import { twind, Twind, TwindUserConfig } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";
import presetTailwindForms from "@twind/preset-tailwind-forms";

import { adoptable } from "./adpotable";

// @ts-ignore
const IS_PROD = process.env.NODE_ENV === "production";

export const defaultConfig: TwindUserConfig = {
  presets: [
    presetAutoprefix(),
    presetTailwind() as any,
    presetTailwindForms() as any,
  ],
  hash: IS_PROD,
};

/**
 * Determines if two class name strings contain the same classes.
 *
 * @param a first class names
 * @param b second class names
 * @returns are they different
 */
function changed(a: string, b: string): boolean {
  return a != b && "" + a.split(" ").sort() != "" + b.split(" ").sort();
}

const atomicConfigSymbol = Symbol("atomic-css-config");
export const setAtomicConfig = (config: TwindUserConfig) => {
  const context = useContextProxy();
  context[atomicConfigSymbol] = config;
};
export const getAtomicConfig = (): TwindUserConfig | null => {
  const context = useContextProxy();
  return context[atomicConfigSymbol] || null;
};

const twRefCount = new WeakMap<Twind, number>();
const getTwRefCount = (tw: Twind) => twRefCount.get(tw) ?? 0;
const refUp = (tw: Twind) => {
  const count = twRefCount.get(tw) ?? 0;
  const next = count + 1;
  twRefCount.set(tw, next);
  return next;
};
const refDown = (tw: Twind) => {
  const count = twRefCount.get(tw) ?? 0;
  const next = count - 1;
  if (count <= 0) {
    // next tick try dispose
    setTimeout(() => {
      if (getTwRefCount(tw) > 0) {
        return;
      }
      destroyTw(tw);
    });
    return 0;
  }
  twRefCount.set(tw, next);
  return next;
};

const root2tw = new WeakMap<DocumentOrShadowRoot, Twind>();
const tw2root = new WeakMap<Twind, DocumentOrShadowRoot>();

const getTw = () => {
  const root = getRootNode();
  if (root2tw.has(root)) {
    const tw = root2tw.get(root)!;
    return tw;
  }
  const contextConfig = getAtomicConfig();
  const sheet = adoptable();
  const tw = twind(
    {
      ...defaultConfig,
      ...contextConfig,
    },
    sheet
  );
  root2tw.set(root, tw);
  tw2root.set(tw, root);
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet.target];
  return tw;
};

const destroyTw = (tw: Twind) => {
  const root = tw2root.get(tw);
  if (root) {
    root2tw.delete(root);
  }
  tw2root.delete(tw);
  twRefCount.delete(tw);

  tw.destroy();
};

const diffClassName = (newClassNames: string[], prevClassNames: string[]) => {
  const patches = [] as { type: "add" | "remove"; cls: string }[];
  for (const cls of prevClassNames) {
    const has = newClassNames.indexOf(cls) !== -1;
    if (!has) {
      patches.push({ type: "remove", cls });
    }
  }
  for (const cls of newClassNames) {
    const has = prevClassNames.indexOf(cls) !== -1;
    if (!has) {
      patches.push({ type: "add", cls });
    }
  }
  return patches;
};

export const atomicDirective: DirectiveDefine = {
  key: "$atomic",
  mounted: (elem, tokens) => {
    if (!(elem instanceof Element)) {
      return;
    }
    const tw = getTw();
    refUp(tw);

    let prevClassNames = [] as string[];

    const { cleanup } = createEffect(() => {
      const className = tw(tokens);
      const isChanged = changed(className, elem.className);
      if (!isChanged) {
        return;
      }
      const classNames = className
        .split(" ")
        .map((x) => x.trim())
        .filter(Boolean);
      const patches = diffClassName(classNames, prevClassNames);
      if (patches.length === 0) {
        return;
      }
      for (const patch of patches) {
        if (patch.type === "remove") {
          elem.classList.remove(patch.cls);
        } else if (patch.type === "add") {
          elem.classList.add(patch.cls);
        }
      }
      prevClassNames = classNames;
    });
    return () => {
      cleanup();
      refDown(tw);
    };
  },
};

export const enable = () => enableDirective(atomicDirective);
export const disable = () => disableDirective(atomicDirective.key);
