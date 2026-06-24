# @humation/react

React component for Humation avatars.

> **[Docs](https://humation.app/docs)** | **[GitHub](https://github.com/humation-labs/humation)**

```tsx
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';

// Deterministic avatar for a user
<Avatar assets={humation1} seed={user.email} size={96} />

// Pick parts by name and set colors
<Avatar
  assets={humation1}
  selections={{ head: 'braids', body: 'hoodie', item: 'calico-cat' }}
  colors={{ hair: '#4A3728', skin: '#F4C9A8' }}
  title="Felix's avatar"
/>
```

Colors are applied as CSS custom properties on the `<svg>` element, so
changing the `colors` prop never re-renders the avatar content, and slots
you do not specify stay themeable from outer CSS:

```css
.dark .avatar { --hm-stroke: #e5e5e5; --hm-clothes: #2a2a2a; }
```

## License

MIT. See [LICENSE.md](./LICENSE.md).
