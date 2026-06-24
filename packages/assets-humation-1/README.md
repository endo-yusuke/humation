# @humation/assets-humation-1

Humation 1 manifest and SVG assets.

> **[Docs](https://humation.app/docs)** | **[GitHub](https://github.com/humation-labs/humation)**

```ts
import { createAvatar } from "@humation/core";
import { humation1 } from "@humation/assets-humation-1";

const svg = createAvatar(humation1, {
  selections: {
    head: "wavy-long",
  },
}).toString();
```

`humation1` (also exported as `manifest`) includes embedded SVG strings and can render
without network or filesystem access. Raw package assets are also available:

```txt
manifest.json
assets/**/*.svg
```

When used with `@humation/core`, rendered output keeps colors as CSS custom
properties such as `--hm-hair`, `--hm-skin`, and `--hm-stroke`.

`manifest.json`, `assets/**`, and the generated `src/` manifest modules are a
synchronized asset snapshot. Update them together so raw SVGs and embedded
manifests stay in sync.

## License

MIT. See [LICENSE.md](./LICENSE.md).
