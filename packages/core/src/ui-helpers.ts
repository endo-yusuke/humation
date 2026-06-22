import type {
  ColorSlotId,
  HexColor,
  HumationManifest,
  PartOption,
  PartOptionId,
  SelectionSlotId,
  UiGroupId,
} from './types.js';

export type CreatePartPreviewOptions = {
  colors?: Record<ColorSlotId, HexColor>;
  background?: HexColor | 'transparent';
};

export function createPartPreview(
  manifest: HumationManifest,
  part: PartOption | PartOptionId,
  options: CreatePartPreviewOptions = {}
) {
  const resolved =
    typeof part === 'string'
      ? manifest.parts.find((p) => p.id === part)
      : part;
  if (!resolved) throw new Error(`Unknown part: ${part}`);

  const colors: Record<string, string> = {
    ...manifest.defaults.colors,
    ...Object.fromEntries(
      Object.entries(options.colors ?? {}).map(([k, v]) => [k, normalizeHex(v)])
    ),
  };

  const cssVariables = Object.entries(colors)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, color]) => `--hm-${key}:#${color}`)
    .join(';');

  const fragments = resolved.layers
    .map((fragment) => {
      const layerSlot = manifest.layerSlots.find(
        (ls) => ls.id === fragment.layerSlot
      );
      if (!layerSlot || !fragment.svg) return '';

      const content = fragment.svg
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '');
      const transform = fragment.transform
        ? `translate(${formatNumber(layerSlot.offset.x)}, ${formatNumber(layerSlot.offset.y)}) ${fragment.transform}`
        : `translate(${formatNumber(layerSlot.offset.x)}, ${formatNumber(layerSlot.offset.y)})`;

      return `<g transform="${escapeAttr(transform)}">${content}</g>`;
    })
    .join('');

  const layerSlot = manifest.layerSlots.find(
    (ls) => ls.id === resolved.layers[0]?.layerSlot
  );
  const offset = layerSlot?.offset ?? { x: 0, y: 0 };
  const size = layerSlot?.size ?? { width: 80, height: 80 };

  const bg =
    options.background === undefined
      ? 'transparent'
      : options.background;
  const bgRect =
    bg === 'transparent'
      ? ''
      : `<rect x="${formatNumber(offset.x)}" y="${formatNumber(offset.y)}" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" fill="#${normalizeHex(bg)}" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(size.width)}" height="${formatNumber(size.height)}" viewBox="${formatNumber(offset.x)} ${formatNumber(offset.y)} ${formatNumber(size.width)} ${formatNumber(size.height)}" style="${escapeAttr(cssVariables)}">${bgRect}${fragments}</svg>`;

  return {
    toString() {
      return svg;
    },
    toDataUri() {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    },
  };
}

export function getPartsForSlot(
  manifest: HumationManifest,
  slotId: SelectionSlotId
): PartOption[] {
  return manifest.parts
    .filter((part) => part.selectionSlot === slotId && !part.deprecated)
    .sort((a, b) => {
      const aId = a.source?.partId ?? a.id;
      const bId = b.source?.partId ?? b.id;
      return aId.localeCompare(bId);
    });
}

export function getPartsForUiGroup(
  manifest: HumationManifest,
  groupId: UiGroupId
): PartOption[] {
  return manifest.parts
    .filter((part) => part.uiGroups.includes(groupId) && !part.deprecated)
    .sort((a, b) => {
      const aId = a.source?.partId ?? a.id;
      const bId = b.source?.partId ?? b.id;
      return aId.localeCompare(bId);
    });
}

function normalizeHex(color: string) {
  return color.replace(/^#/, '').toUpperCase();
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
