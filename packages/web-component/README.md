# @humation/web-component

`<humation-avatar>` custom element for Humation avatars. Framework-free —
works in plain HTML, Vue, Svelte, anywhere.

```js
import { defineAvatarElement } from '@humation/web-component';
import { humation1 } from '@humation/assets-humation-1';

defineAvatarElement(humation1);
```

```html
<!-- Deterministic avatar for a user -->
<humation-avatar seed="felix" size="96"></humation-avatar>

<!-- Pick parts by name; colors are plain CSS custom properties -->
<humation-avatar head="braids" item="calico-cat"
                 style="--hm-hair: #4A3728"></humation-avatar>

<style>
  .dark humation-avatar { --hm-stroke: #e5e5e5; --hm-clothes: #2a2a2a; }
</style>
```

Attributes mirror the selection slots (`head`, `body`, `bottom`, `item`,
`glasses`) plus `seed`, `background`, `crop`, `size`, and `title`; changing
an attribute re-renders the element. Colors cascade in through `--hm-*`
custom properties — unset slots keep the defaults baked into the assets.

## License

MIT. See [LICENSE.md](./LICENSE.md). Avatar assets are licensed separately —
see `@humation/assets-humation-1`.
