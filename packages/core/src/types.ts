export type SelectionSlotId = string;
export type PartOptionId = string;
export type ColorSlotId = string;
export type LayerSlotId = string;
export type UiGroupId = string;
export type CropId = string;
export type HexColor = string;

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HumationManifest = {
  schemaVersion: '1.0';
  template: {
    id: string;
    shortId: string;
    name: string;
    version: string;
    license: string;
  };
  defaults: {
    selections: Record<SelectionSlotId, PartOptionId>;
    colors: Record<ColorSlotId, HexColor>;
    background: HexColor | 'transparent';
    crop: CropId;
  };
  colors: ColorSlot[];
  crops: Record<CropId, ViewBox>;
  selectionSlots: SelectionSlot[];
  uiGroups: UiGroup[];
  layerSlots: LayerSlot[];
  parts: PartOption[];
  aliases: AliasEntry[];
};

export type ColorSlot = {
  id: ColorSlotId;
  label: string;
  default: HexColor;
  cssVariable: `--hm-${string}`;
  allowTransparent?: boolean;
};

export type SelectionSlot = {
  id: SelectionSlotId;
  label: string;
  defaultPart: PartOptionId;
  allowsEmpty?: boolean;
  exclusive: true;
};

export type UiGroup = {
  id: UiGroupId;
  label: string;
  order: number;
  selectionSlots: SelectionSlotId[];
  partIds?: PartOptionId[];
};

export type LayerSlot = {
  id: LayerSlotId;
  label: string;
  order: number;
  offset: { x: number; y: number };
  size: { width: number; height: number };
  hidden?: boolean;
};

export type PartOption = {
  id: PartOptionId;
  source?: {
    groupId?: string;
    sourceGroupName?: string;
    partId?: string;
  };
  /**
   * Human-readable name, unique within the part's selection slot
   * (e.g. 'braids', 'hoodie', 'camera'). Doubles as the display label;
   * UIs derive presentation from it (e.g. title-case). Resolvable in
   * createAvatar selections via the generated `${selectionSlot}-${name}`
   * alias or slot-scoped as `{ head: 'braids' }`.
   */
  name?: string;
  aliases?: string[];
  selectionSlot: SelectionSlotId;
  uiGroups: UiGroupId[];
  layers: LayerFragment[];
  tags?: string[];
  deprecated?: boolean;
};

/**
 * Color binding is explicit in the SVG source: recolorable regions
 * reference CSS variables with default-color fallbacks, e.g.
 * `fill="var(--hm-hair, #000000)"`. Regions without variable references
 * are color-fixed by construction (accessory fills bind only their
 * outlines to the stroke slot).
 */
export type LayerFragment = {
  layerSlot: LayerSlotId;
  svgPath?: string;
  svg?: string;
  transform?: string;
};

export type AliasEntry = {
  alias: string;
  targetId: PartOptionId;
  status: 'active' | 'deprecated';
  replacementAlias?: string;
};

export type CreateAvatarOptions = {
  /**
   * Deterministically picks a part for every selection slot from the seed
   * string. Explicit `selections` override seeded picks. Picks are stable per
   * asset-package version; adding parts to a slot may change them. Colors
   * stay at the manifest defaults (black hair/bottoms, white clothes/skin
   * for humation-1) unless overridden via `colors`.
   */
  seed?: string;
  /**
   * Values accept canonical part IDs, global aliases, and slot-scoped
   * names: `{ head: 'braids' }` resolves the alias `head-braids`.
   */
  selections?: Record<SelectionSlotId, PartOptionId | string>;
  /** Hex values are accepted with or without a leading `#`. */
  colors?: Record<ColorSlotId, HexColor>;
  background?: HexColor | 'transparent';
  crop?: CropId;
};

/**
 * Structured render output for framework wrappers. `content` carries the
 * composed fragments only; colors remain `var(--hm-*, fallback)` references
 * so wrappers control them through CSS custom properties.
 */
export type AvatarRenderData = {
  viewBox: ViewBox;
  background: HexColor | 'transparent';
  colors: Record<ColorSlotId, HexColor>;
  content: string;
};

export type AvatarJson = {
  template: string;
  selections: Record<SelectionSlotId, PartOptionId>;
  colors: Record<ColorSlotId, HexColor>;
  background: HexColor | 'transparent';
  crop: CropId;
};

