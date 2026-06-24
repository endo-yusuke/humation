import {
  createAvatar,
  createPartPreview,
  getPartsForUiGroup,
} from '@humation/core';
import type {
  ColorSlot,
  CreateAvatarOptions,
  HumationManifest,
  PartOption,
  UiGroup,
} from '@humation/core';

export type HumationAvatarBuilderState = {
  selections: Record<string, string>;
  colors: Record<string, string>;
  background: string;
  crop?: CreateAvatarOptions['crop'];
};

export type HumationPartSubgroup = {
  id: string;
  label: string;
  selectionSlot: string;
  sourceGroupId: string;
  defaultPart: string;
  order: number;
  parts: PartOption[];
};

export type HumationPartGroup = {
  id: string;
  label: string;
  selectionSlot: string;
  defaultPart: string;
  order: number;
  parts: PartOption[];
  subgroups: HumationPartSubgroup[];
};

export type HumationAvatarBuilderModel = {
  groups: HumationPartGroup[];
  colors: ColorSlot[];
};

export type CreateBuilderStateOptions = {
  seed?: string;
  state?: Partial<HumationAvatarBuilderState>;
};

const DEFAULT_HIDDEN_GROUP_IDS = new Set(['bottom']);
const DEFAULT_HIDDEN_COLOR_IDS = new Set(['bottom']);
const PREFERRED_GROUP_ORDER = ['head', 'body', 'item', 'glasses'];

export function createAvatarBuilderState(
  manifest: HumationManifest,
  options: CreateBuilderStateOptions = {}
): HumationAvatarBuilderState {
  const seededSelections = options.seed
    ? createAvatar(manifest, { seed: options.seed }).toJSON().selections
    : {};

  return {
    selections: {
      ...manifest.defaults.selections,
      ...seededSelections,
      ...(options.state?.selections ?? {}),
    },
    colors: {
      ...manifest.defaults.colors,
      ...(options.state?.colors ?? {}),
    },
    background: options.state?.background ?? manifest.defaults.background,
    crop: options.state?.crop ?? manifest.defaults.crop,
  };
}

export function buildAvatarBuilderModel(
  manifest: HumationManifest,
  options: {
    hiddenGroupIds?: string[];
    hiddenColorIds?: string[];
  } = {}
): HumationAvatarBuilderModel {
  const hiddenGroupIds = new Set([
    ...DEFAULT_HIDDEN_GROUP_IDS,
    ...(options.hiddenGroupIds ?? []),
  ]);
  const hiddenColorIds = new Set([
    ...DEFAULT_HIDDEN_COLOR_IDS,
    ...(options.hiddenColorIds ?? []),
  ]);
  const bySelectionSlot = new Map<string, HumationPartGroup>();

  for (const uiGroup of manifest.uiGroups) {
    if (isHidden(uiGroup.id, uiGroup.label, hiddenGroupIds)) continue;

    const subgroup = buildSubgroup(manifest, uiGroup);
    if (!subgroup || subgroup.parts.length === 0) continue;

    const slot = manifest.selectionSlots.find(
      (candidate) => candidate.id === subgroup.selectionSlot
    );
    const existing = bySelectionSlot.get(subgroup.selectionSlot);

    if (existing) {
      existing.subgroups.push(subgroup);
      existing.parts = mergeUniqueParts(existing.parts, subgroup.parts);
      existing.order = Math.min(existing.order, subgroup.order);
      continue;
    }

    bySelectionSlot.set(subgroup.selectionSlot, {
      id: subgroup.selectionSlot,
      label: slot?.label ?? subgroup.label,
      selectionSlot: subgroup.selectionSlot,
      defaultPart: subgroup.defaultPart,
      order: subgroup.order,
      parts: subgroup.parts,
      subgroups: [subgroup],
    });
  }

  const groups = [...bySelectionSlot.values()].sort(sortBuilderGroups);
  for (const group of groups) {
    group.subgroups.sort((left, right) => left.order - right.order);
  }

  return {
    groups,
    colors: manifest.colors.filter(
      (color) => !isHidden(color.id, color.label, hiddenColorIds)
    ),
  };
}

export function randomizeAvatarBuilderState(
  state: HumationAvatarBuilderState,
  groups: HumationPartGroup[]
): HumationAvatarBuilderState {
  const selections = { ...state.selections };

  for (const group of groups) {
    const parts = group.parts.filter((part) => !part.deprecated);
    if (parts.length === 0) continue;
    selections[group.selectionSlot] =
      parts[Math.floor(Math.random() * parts.length)].id;
  }

  return { ...state, selections };
}

export function getPartPreviewDataUri(
  manifest: HumationManifest,
  part: PartOption,
  state: HumationAvatarBuilderState
) {
  return createPartPreview(manifest, part, {
    colors: state.colors,
    background: 'transparent',
  }).toDataUri();
}

export function formatPartLabel(part: PartOption) {
  return titleCase(part.name ?? part.source?.partId ?? part.id);
}

export function formatColorLabel(color: ColorSlot) {
  if (color.id === 'clothes') return 'Cloth';
  return color.label;
}

export function normalizeHexColor(color: string, fallback = '000000') {
  const normalized = color.replace('#', '').trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(normalized)
    ? normalized
    : fallback.replace('#', '').trim().toUpperCase();
}

export function toCssColor(color: string, fallback = '000000') {
  if (color === 'transparent') return 'transparent';
  return `#${normalizeHexColor(color, fallback)}`;
}

function buildSubgroup(
  manifest: HumationManifest,
  uiGroup: UiGroup
): HumationPartSubgroup | undefined {
  const selectionSlot = uiGroup.selectionSlots[0] ?? uiGroup.id;
  const defaultPart =
    manifest.defaults.selections[selectionSlot] ??
    manifest.selectionSlots.find((slot) => slot.id === selectionSlot)
      ?.defaultPart ??
    '';

  const parts = getGroupParts(manifest, uiGroup, selectionSlot, defaultPart);

  return {
    id: uiGroup.id,
    label: uiGroup.label,
    selectionSlot,
    sourceGroupId: uiGroup.id,
    defaultPart,
    order: uiGroup.order,
    parts,
  };
}

function getGroupParts(
  manifest: HumationManifest,
  uiGroup: UiGroup,
  selectionSlot: string,
  defaultPart: string
) {
  const selectionSlots = new Set(uiGroup.selectionSlots);
  const allowedPartIds = uiGroup.partIds ? new Set(uiGroup.partIds) : undefined;
  const parts = getPartsForUiGroup(manifest, uiGroup.id).filter((part) => {
    if (!selectionSlots.has(part.selectionSlot)) return false;
    if (allowedPartIds && !allowedPartIds.has(part.id)) return false;
    return true;
  });

  if (selectionSlot !== 'item') return parts;

  return [...parts].sort((left, right) => {
    if (left.id === defaultPart) return -1;
    if (right.id === defaultPart) return 1;

    const leftNumber = Number(left.source?.partId);
    const rightNumber = Number(right.source?.partId);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return rightNumber - leftNumber;
    }

    return right.id.localeCompare(left.id);
  });
}

function sortBuilderGroups(left: HumationPartGroup, right: HumationPartGroup) {
  const leftPreferred = PREFERRED_GROUP_ORDER.indexOf(left.selectionSlot);
  const rightPreferred = PREFERRED_GROUP_ORDER.indexOf(right.selectionSlot);
  const leftRank =
    leftPreferred === -1 ? Number.MAX_SAFE_INTEGER : leftPreferred;
  const rightRank =
    rightPreferred === -1 ? Number.MAX_SAFE_INTEGER : rightPreferred;

  return leftRank - rightRank || left.order - right.order;
}

function mergeUniqueParts(left: PartOption[], right: PartOption[]) {
  const seen = new Set(left.map((part) => part.id));
  const merged = [...left];

  for (const part of right) {
    if (seen.has(part.id)) continue;
    seen.add(part.id);
    merged.push(part);
  }

  return merged;
}

function isHidden(id: string, label: string, hidden: Set<string>) {
  return hidden.has(id) || hidden.has(label.toLowerCase());
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
