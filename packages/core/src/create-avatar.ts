import type {
  AvatarJson,
  AvatarRenderData,
  CreateAvatarOptions,
  HumationManifest,
  LayerFragment,
  PartOption,
} from './types.js';

type ResolvedFragment = {
  part: PartOption;
  fragment: LayerFragment;
  order: number;
  offset: { x: number; y: number };
};

export function createAvatar(
  manifest: HumationManifest,
  options: CreateAvatarOptions = {}
) {
  const state = resolveAvatarState(manifest, options);

  return {
    toString() {
      return renderSvg(manifest, state);
    },
    toDataUri() {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        renderSvg(manifest, state)
      )}`;
    },
    toJSON(): AvatarJson {
      return {
        template: manifest.template.id,
        selections: { ...state.selections },
        colors: { ...state.colors },
        background: state.background,
        crop: state.crop,
      };
    },
    /**
     * Structured render output for framework wrappers that build the root
     * <svg> element themselves (React, web components). `content` is the
     * composed fragment markup without the root element, background rect,
     * or inline color style — colors stay as `var(--hm-*, fallback)`
     * references, so wrappers can drive them via CSS custom properties
     * without re-rendering the content.
     */
    toRenderData(): AvatarRenderData {
      const viewBox = resolveViewBox(manifest, state);
      const fragments = collectFragments(manifest, state);

      return {
        viewBox: { ...viewBox },
        background: state.background,
        colors: { ...state.colors },
        content: fragments
          .map(({ part, fragment, offset }) =>
            renderFragment(part, fragment, offset)
          )
          .join(''),
      };
    },
  };
}

export function resolvePartId(
  input: string,
  manifest: HumationManifest,
  slotId?: string
) {
  if (manifest.parts.some((part) => part.id === input)) return input;

  if (slotId) {
    const scopedAlias = `${slotId}-${input}`;
    const scoped = manifest.aliases.find(
      (entry) => entry.alias === scopedAlias
    );
    if (scoped) return scoped.targetId;
  }

  const alias = manifest.aliases.find((entry) => entry.alias === input);
  if (alias) return alias.targetId;

  throw new Error(`Unknown part: ${input}`);
}

function resolveAvatarState(
  manifest: HumationManifest,
  options: CreateAvatarOptions
): AvatarJson {
  const selections = { ...manifest.defaults.selections };

  if (options.seed !== undefined) {
    for (const slot of manifest.selectionSlots) {
      const slotParts = manifest.parts.filter(
        (part) => part.selectionSlot === slot.id
      );
      if (slotParts.length === 0) continue;

      const hash = fnv1a(`${options.seed}:${slot.id}`);
      selections[slot.id] = slotParts[hash % slotParts.length].id;
    }
  }

  for (const [slotId, value] of Object.entries(options.selections ?? {})) {
    const partId = resolvePartId(value, manifest, slotId);
    const part = manifest.parts.find((candidate) => candidate.id === partId);

    if (!part) throw new Error(`Unknown part: ${value}`);
    if (part.selectionSlot !== slotId) {
      throw new Error(`Part ${value} is not selectable in slot ${slotId}`);
    }

    selections[slotId] = partId;
  }

  const colors: Record<string, string> = { ...manifest.defaults.colors };
  for (const [key, color] of Object.entries(options.colors ?? {})) {
    colors[key] = normalizeHex(color);
  }

  const background = options.background ?? manifest.defaults.background;

  return {
    template: manifest.template.id,
    selections,
    colors,
    background:
      background === 'transparent' ? background : normalizeHex(background),
    crop: options.crop ?? manifest.defaults.crop,
  };
}

function fnv1a(input: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function resolveViewBox(manifest: HumationManifest, state: AvatarJson) {
  const viewBox =
    manifest.crops[state.crop] ?? manifest.crops[manifest.defaults.crop];
  if (!viewBox) throw new Error(`Unknown crop: ${state.crop}`);
  return viewBox;
}

function renderSvg(manifest: HumationManifest, state: AvatarJson) {
  const viewBox = resolveViewBox(manifest, state);
  const fragments = collectFragments(manifest, state);
  const cssVariables = formatCssVariables(state.colors);
  const bgRect =
    state.background === 'transparent'
      ? ''
      : `<rect x="${formatNumber(viewBox.x)}" y="${formatNumber(viewBox.y)}" width="${formatNumber(viewBox.width)}" height="${formatNumber(viewBox.height)}" fill="#${state.background}" />`;
  const content = fragments
    .map(({ part, fragment, offset }) => renderFragment(part, fragment, offset))
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(viewBox.width)}" height="${formatNumber(viewBox.height)}" viewBox="${formatNumber(viewBox.x)} ${formatNumber(viewBox.y)} ${formatNumber(viewBox.width)} ${formatNumber(viewBox.height)}" style="${escapeAttr(cssVariables)}">${bgRect}${content}</svg>`;
}

function collectFragments(
  manifest: HumationManifest,
  state: AvatarJson
): ResolvedFragment[] {
  return Object.values(state.selections)
    .map((partId) => {
      const part = manifest.parts.find((candidate) => candidate.id === partId);
      if (!part) throw new Error(`Unknown selected part: ${partId}`);
      return part;
    })
    .flatMap((part) =>
      part.layers.map((fragment) => {
        const layerSlot = manifest.layerSlots.find(
          (candidate) => candidate.id === fragment.layerSlot
        );
        if (!layerSlot) {
          throw new Error(`Unknown layer slot: ${fragment.layerSlot}`);
        }

        return {
          part,
          fragment,
          order: layerSlot.order,
          offset: layerSlot.offset,
        };
      })
    )
    .sort((left, right) => left.order - right.order);
}

// Color binding lives in the SVG sources themselves: recolorable regions
// reference CSS variables with default-color fallbacks, e.g.
// fill="var(--hm-hair, #000000)". Rendering therefore only composes
// fragments and sets the variable values on the root element; the renderer
// has no marker-color or substitution knowledge.
function renderFragment(
  part: PartOption,
  fragment: LayerFragment,
  offset: { x: number; y: number }
) {
  if (!fragment.svg) {
    throw new Error(`Missing SVG for part: ${part.id}`);
  }

  const content = stripSvgWrapper(fragment.svg);
  const transform = fragment.transform
    ? `translate(${formatNumber(offset.x)}, ${formatNumber(offset.y)}) ${fragment.transform}`
    : `translate(${formatNumber(offset.x)}, ${formatNumber(offset.y)})`;
  const attributes = [
    ['data-hm-layer-slot', fragment.layerSlot],
    ['data-hm-part-id', part.id],
    ['data-hm-selection-slot', part.selectionSlot],
    ['data-hm-source-group-id', part.source?.groupId],
    ['data-hm-source-part-id', part.source?.partId],
    ['transform', transform],
  ]
    .flatMap(([name, value]) =>
      value === undefined ? [] : [`${name}="${escapeAttr(value)}"`]
    )
    .join(' ');

  return `<g ${attributes}>${content}</g>`;
}

function formatCssVariables(colors: Record<string, string>) {
  return Object.entries(colors)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, color]) => `--hm-${key}:#${normalizeHex(color)}`)
    .join(';');
}

function normalizeHex(color: string) {
  return color.replace(/^#/, '').toUpperCase();
}

function stripSvgWrapper(svg: string): string {
  return svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
