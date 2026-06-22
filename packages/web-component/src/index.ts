import { createAvatar } from '@humation/core';
import type { HumationManifest } from '@humation/core';

export type AvatarMarkupOptions = {
  seed?: string;
  selections?: Record<string, string>;
  background?: string;
  crop?: string;
  /** Rendered width; height follows the crop's aspect ratio. */
  size?: number;
  /** Accessible title. Without it the avatar is treated as decorative. */
  title?: string;
};

/**
 * Builds the <svg> markup for an avatar without any inline color style:
 * colors come from `--hm-*` CSS custom properties cascading in from the
 * surrounding document (unset slots fall back to the defaults baked into
 * the assets).
 */
export function renderAvatarMarkup(
  assets: HumationManifest,
  options: AvatarMarkupOptions = {}
): string {
  const { seed, selections, background, crop, size, title } = options;
  const data = createAvatar(assets, {
    seed,
    selections,
    background,
    crop,
  }).toRenderData();

  const { viewBox } = data;
  const width = size ?? viewBox.width;
  const height = size != null ? (size * viewBox.height) / viewBox.width : viewBox.height;
  const a11y = title
    ? `role="img"><title>${escapeText(title)}</title>`
    : 'aria-hidden="true">';
  const backgroundRect =
    data.background === 'transparent'
      ? ''
      : `<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="#${data.background}" />`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" width="${width}" height="${height}" ${a11y}` +
    backgroundRect +
    data.content +
    '</svg>'
  );
}

/**
 * Registers `<humation-avatar>` (or a custom tag name) bound to the given
 * asset set. Selection slots become attributes; colors are driven purely by
 * `--hm-*` CSS custom properties, which cascade into the shadow root:
 *
 *   defineAvatarElement(humation1);
 *   <humation-avatar seed="felix" size="96"></humation-avatar>
 *   <humation-avatar head="braids" item="calico-cat"
 *                    style="--hm-hair: #4A3728"></humation-avatar>
 */
export function defineAvatarElement(
  assets: HumationManifest,
  tagName = 'humation-avatar'
) {
  if (typeof customElements === 'undefined') {
    throw new Error('defineAvatarElement requires a DOM environment');
  }
  if (customElements.get(tagName)) return;

  const slotIds = assets.selectionSlots.map((slot) => slot.id);

  class HumationAvatarElement extends HTMLElement {
    static observedAttributes = [
      ...slotIds,
      'seed',
      'background',
      'crop',
      'size',
      'title',
    ];

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    private render() {
      const selections: Record<string, string> = {};
      for (const id of slotIds) {
        const value = this.getAttribute(id);
        if (value) selections[id] = value;
      }

      const sizeAttr = this.getAttribute('size');
      const markup = renderAvatarMarkup(assets, {
        seed: this.getAttribute('seed') ?? undefined,
        selections,
        background: this.getAttribute('background') ?? undefined,
        crop: this.getAttribute('crop') ?? undefined,
        size: sizeAttr ? Number(sizeAttr) : undefined,
        title: this.getAttribute('title') ?? undefined,
      });

      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>:host{display:inline-block;line-height:0}svg{display:block}</style>' +
        markup;
    }
  }

  customElements.define(tagName, HumationAvatarElement);
}

function escapeText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
