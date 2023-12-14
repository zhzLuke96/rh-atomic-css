# rh-atomic-css

css in js + atomic

# Usage

## default

```ts
import { rh, mount } from "@rhjs/core";
import { Scope } from "@rhjs/builtin";
import { html } from "@rhjs/tag";
import { enable } from "@rhjs/atomic-css";

// all default settings
enable();

const app = html`<div $class="font-bold text-gray-900">hello world</div>`;
mount("#app", app);
```

## custom configuration

```ts
import { rh, mount } from "@rhjs/core";
import { Scope } from "@rhjs/builtin";
import { html } from "@rhjs/tag";
import { enable, setAtomicConfig } from "@rhjs/atomic-css";

// inject config to context
setAtomicConfig({
    presets: [], // cover all preset (tailwind css)
    hash: false
})
// inject to framework context, and hook attribute `$class` (default: $atomic)
enable("$class");

const app = html`<div $class="font-bold text-gray-900">hello world</div>`;
mount("#app", app);
```

# License

MIT
