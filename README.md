# rh-atomic-css

css in js + atomic

# Usage

## default

```ts
import { rh, mount, html, Scope } from "@rhjs/rh";
import { enable } from "@rhjs/atomic-css";

// inject to framework context
enable();

const App = () => () =>
  html`<div $class="font-bold text-gray-900">hello world</div>`;
mount("#app", App);
```

## custom configuration

```ts
import { rh, mount, html, Scope } from "@rhjs/rh";
import { enable, setAtomicConfig } from "@rhjs/atomic-css";

// inject config to context
setAtomicConfig({
    presets: [], // cover all preset (tailwind css)
    hash: false
})
// inject to framework context
enable();

const App = () => () =>
  html`<div $class="font-bold text-gray-900">hello world</div>`;
mount("#app", App);
```

# License

MIT
