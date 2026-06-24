---
name: humation-avatar
description: Use when implementing Humation avatars in React, plain JavaScript, web components, or avatar builder UIs; installing @humation packages; rendering deterministic SVG avatars; creating part pickers or previews; persisting avatar state; or replacing remote avatar generation with local Humation rendering.
---

# Humation Avatar

Humation is a hand-drawn deterministic SVG avatar engine. Use it when an app
needs consistent user avatars without AI generation and without runtime API
calls.

## Choose The Package

- React UI: use `@humation/react` with `@humation/assets-humation-1`.
- Raw SVG or picker helpers: use `@humation/core` with `@humation/assets-humation-1`.
- Plain HTML, Vue, Svelte, or framework-neutral UI: use `@humation/web-component`
  with `@humation/assets-humation-1`.
- Avatar builder UI: use the shadcn registry block from this repo. Do not look
  for a separate npm builder package.

Keep `@humation/*` package versions in sync.

## React Avatar

```tsx
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';

<Avatar assets={humation1} seed={user.id} size={96} />

<Avatar
  assets={humation1}
  selections={{ head: 'braids', body: 'hoodie', item: 'calico-cat' }}
  colors={{ hair: '#4A3728', skin: '#F4C9A8' }}
  title="User avatar"
/>
```

Use `seed` for deterministic generated avatars. Use `selections` for exact
parts. When both are present, explicit `selections` override the seed for those
slots.

## Core SVG Rendering

```ts
import { createAvatar } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';

const svg = createAvatar(humation1, { seed: 'felix' }).toString();
```

The returned value is self-contained SVG. Do not call a Humation API for
rendering.

## Web Component

```js
import { defineAvatarElement } from '@humation/web-component';
import { humation1 } from '@humation/assets-humation-1';

defineAvatarElement(humation1);
```

```html
<humation-avatar seed="felix" size="96"></humation-avatar>
<humation-avatar head="braids" item="calico-cat"
                 style="--hm-hair: #4A3728"></humation-avatar>
```

## Avatar Builder

Install the copy-paste builder block:

```bash
npx shadcn@latest add humation-labs/humation/avatar-builder
```

Then import it from the installed source:

```tsx
import { AvatarBuilder } from '@/components/humation/avatar-builder';

<AvatarBuilder onChange={(state) => saveAvatar(state)} />
```

The builder is app-owned source code. It already includes responsive preview,
part picker tabs, a color sheet, randomize, PNG/SVG export states, and JSON
copy. Prefer installing and adapting this block rather than generating a small
one-off picker UI.

## Picker Helpers

```ts
import { createPartPreview, getPartsForSlot } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';

const heads = getPartsForSlot(humation1, 'head');
const preview = createPartPreview(humation1, heads[0], {
  colors: { hair: '#4A3728' },
}).toDataUri();
```

Do not invent part names. Inspect the manifest or use helpers such as
`getPartsForSlot()`.

## State And Colors

Persist either:

- a stable `seed` string for generated avatars, or
- `{ selections, colors }` for manually customized avatars.

Common selection slots are `head`, `body`, `bottom`, `item`, and `glasses`.
Common color slots are `hair`, `clothes`, `bottom`, `skin`, `stroke`, and
`background`.

Colors use CSS custom properties in the rendered SVG, such as `--hm-hair` and
`--hm-stroke`. Hex values can be passed with or without `#`.
