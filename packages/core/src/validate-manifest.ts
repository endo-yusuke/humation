import type { HumationManifest } from './types.js';

export type ManifestValidationIssue = {
  path: string;
  message: string;
};

export function validateManifest(
  manifest: HumationManifest
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  const partIds = new Set<string>();
  const partNames = new Set<string>();
  const aliasIds = new Set<string>();
  const colorIds = new Set(manifest.colors.map((color) => color.id));
  const cropIds = new Set(Object.keys(manifest.crops));
  const layerSlotIds = new Set(manifest.layerSlots.map((slot) => slot.id));
  const selectionSlotIds = new Set(
    manifest.selectionSlots.map((slot) => slot.id)
  );
  const uiGroupIds = new Set(manifest.uiGroups.map((group) => group.id));

  collectDuplicateIssues(
    manifest.selectionSlots.map((slot) => slot.id),
    'selectionSlots',
    issues
  );
  collectDuplicateIssues(
    manifest.uiGroups.map((group) => group.id),
    'uiGroups',
    issues
  );
  collectDuplicateIssues(
    manifest.layerSlots.map((slot) => slot.id),
    'layerSlots',
    issues
  );
  collectDuplicateIssues(
    manifest.colors.map((color) => color.id),
    'colors',
    issues
  );

  for (const [index, crop] of Object.entries(manifest.crops)) {
    if (crop.width <= 0 || crop.height <= 0) {
      issues.push({
        path: `crops.${index}`,
        message: 'Crop width and height must be positive',
      });
    }
  }

  if (!cropIds.has(manifest.defaults.crop)) {
    issues.push({
      path: 'defaults.crop',
      message: `Unknown default crop: ${manifest.defaults.crop}`,
    });
  }

  for (const color of manifest.colors) {
    if (!isHexColor(color.default)) {
      issues.push({
        path: `colors.${color.id}.default`,
        message: `Invalid default color: ${color.default}`,
      });
    }
    if (color.cssVariable !== `--hm-${color.id}`) {
      issues.push({
        path: `colors.${color.id}.cssVariable`,
        message: `Expected --hm-${color.id}`,
      });
    }
  }

  for (const [colorId, color] of Object.entries(manifest.defaults.colors)) {
    if (!colorIds.has(colorId)) {
      issues.push({
        path: `defaults.colors.${colorId}`,
        message: `Unknown color slot: ${colorId}`,
      });
    }
    if (!isHexColor(color)) {
      issues.push({
        path: `defaults.colors.${colorId}`,
        message: `Invalid default color: ${color}`,
      });
    }
  }

  for (const [index, part] of manifest.parts.entries()) {
    if (partIds.has(part.id)) {
      issues.push({
        path: `parts.${index}.id`,
        message: `Duplicate part id: ${part.id}`,
      });
    }
    partIds.add(part.id);

    if (part.name) {
      const slotScopedName = `${part.selectionSlot}:${part.name}`;
      if (partNames.has(slotScopedName)) {
        issues.push({
          path: `parts.${part.id}.name`,
          message: `Duplicate part name in slot ${part.selectionSlot}: ${part.name}`,
        });
      }
      partNames.add(slotScopedName);
    }

    if (!selectionSlotIds.has(part.selectionSlot)) {
      issues.push({
        path: `parts.${part.id}.selectionSlot`,
        message: `Unknown selection slot: ${part.selectionSlot}`,
      });
    }

    for (const uiGroup of part.uiGroups) {
      if (!uiGroupIds.has(uiGroup)) {
        issues.push({
          path: `parts.${part.id}.uiGroups`,
          message: `Unknown UI group: ${uiGroup}`,
        });
      }
    }

    for (const [layerIndex, layer] of part.layers.entries()) {
      if (!layerSlotIds.has(layer.layerSlot)) {
        issues.push({
          path: `parts.${part.id}.layers.${layerIndex}.layerSlot`,
          message: `Unknown layer slot: ${layer.layerSlot}`,
        });
      }
      if (!layer.svg && !layer.svgPath) {
        issues.push({
          path: `parts.${part.id}.layers.${layerIndex}`,
          message: 'Layer must include svg or svgPath',
        });
      }

      // CSS variable references in the svg source must point at declared
      // color slots.
      if (layer.svg) {
        for (const match of layer.svg.matchAll(/var\(--hm-([a-z0-9-]+)/g)) {
          if (!colorIds.has(match[1])) {
            issues.push({
              path: `parts.${part.id}.layers.${layerIndex}.svg`,
              message: `Unknown color slot referenced: ${match[1]}`,
            });
          }
        }
      }
    }
  }

  for (const slot of manifest.selectionSlots) {
    const defaultPartId = manifest.defaults.selections[slot.id];
    if (!defaultPartId) {
      issues.push({
        path: `defaults.selections.${slot.id}`,
        message: 'Missing default selection',
      });
      continue;
    }

    const defaultPart = manifest.parts.find((part) => part.id === defaultPartId);
    if (!defaultPart) {
      issues.push({
        path: `defaults.selections.${slot.id}`,
        message: `Unknown default part: ${defaultPartId}`,
      });
      continue;
    }

    if (defaultPart.selectionSlot !== slot.id) {
      issues.push({
        path: `defaults.selections.${slot.id}`,
        message: `Default part belongs to ${defaultPart.selectionSlot}`,
      });
    }

    if (slot.defaultPart !== defaultPartId) {
      issues.push({
        path: `selectionSlots.${slot.id}.defaultPart`,
        message: 'Selection slot default must match defaults.selections',
      });
    }
  }

  for (const [index, alias] of manifest.aliases.entries()) {
    if (aliasIds.has(alias.alias)) {
      issues.push({
        path: `aliases.${index}.alias`,
        message: `Duplicate alias: ${alias.alias}`,
      });
    }
    aliasIds.add(alias.alias);

    if (partIds.has(alias.alias)) {
      issues.push({
        path: `aliases.${index}.alias`,
        message: `Alias collides with canonical part id: ${alias.alias}`,
      });
    }

    if (!partIds.has(alias.targetId)) {
      issues.push({
        path: `aliases.${index}.targetId`,
        message: `Unknown alias target: ${alias.targetId}`,
      });
    }
  }

  return issues;
}

function collectDuplicateIssues(
  values: string[],
  path: string,
  issues: ManifestValidationIssue[]
) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      issues.push({
        path,
        message: `Duplicate id: ${value}`,
      });
    }
    seen.add(value);
  }
}

function isHexColor(value: string) {
  return /^[0-9a-fA-F]{6}$/.test(value);
}
