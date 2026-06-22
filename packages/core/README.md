# @humation/core

Framework-independent Humation avatar renderer.

> **[Docs](https://humation.app/docs)** | **[GitHub](https://github.com/endo-yusuke/humation)**

```ts
import { createAvatar } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';

// Deterministic avatar from a seed — same seed, same SVG.
const seeded = createAvatar(humation1, { seed: 'felix' }).toString();

// Explicit parts and colors.
const svg = createAvatar(humation1, {
  selections: {
    head: 'wavy-long', // part name; 'head-wavy-long' and canonical IDs also work
  },
  colors: {
    hair: '#123456',
    skin: '#FFEECC',
  },
}).toString();
```

Parts carry a unique per-slot `name` (`manifest.parts[].name`) that doubles
as the display label — list the manifest to discover what is available.

Color slots are role-named (`hair`, `clothes`, `bottom`, `skin`, `stroke`,
`background`) so they never collide with part slots like `head` and `body`.
Hex values are accepted with or without a leading `#`.

`@humation/core` intentionally does not include avatar assets. Template assets
live in packages such as `@humation/assets-humation-1`, keeping the renderer
small and framework-independent.

Rendered SVGs use CSS custom properties for colors:

```svg
<svg style="--hm-hair:#000000;--hm-skin:#FFEECC">
  <path fill="var(--hm-hair, #000000)" />
</svg>
```

Inline color materialization is not part of the public OSS API.

## License

MIT. See [LICENSE.md](./LICENSE.md).
