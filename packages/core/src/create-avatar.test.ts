import { describe, expect, test } from 'bun:test';
import { createAvatar, resolvePartId } from './create-avatar.js';
import { validateManifest } from './validate-manifest.js';
import type { HumationManifest } from './types.js';

function buildManifest(): HumationManifest {
  // Recolorable regions reference CSS variables with default fallbacks;
  // color-fixed fragments (items) carry literal colors only.
  const headSvg = (label: string) =>
    `<svg><rect data-label="${label}" width="1" height="1" fill="var(--hm-hair, #000000)" /><rect width="1" height="1" fill="var(--hm-skin, #FFFFFF)" /></svg>`;
  const itemSvg = (label: string) =>
    `<svg><rect data-label="${label}" width="1" height="1" fill="#FFD412" /></svg>`;

  return {
    schemaVersion: '1.0',
    template: {
      id: 'test',
      shortId: 'test',
      name: 'Test',
      version: '0.0.0',
      license: 'UNLICENSED',
    },
    defaults: {
      selections: { head: 'test-p-000001', item: 'test-p-000004' },
      colors: { hair: '000000', skin: 'FFFFFF', clothes: '888888' },
      background: 'F6F5F4',
      crop: 'avatar',
    },
    colors: [
      { id: 'hair', label: 'Hair', default: '000000', cssVariable: '--hm-hair' },
      { id: 'skin', label: 'Skin', default: 'FFFFFF', cssVariable: '--hm-skin' },
      {
        id: 'clothes',
        label: 'Clothes',
        default: '888888',
        cssVariable: '--hm-clothes',
      },
    ],
    crops: { avatar: { x: 0, y: 0, width: 10, height: 10 } },
    selectionSlots: [
      { id: 'head', label: 'Head', defaultPart: 'test-p-000001', exclusive: true },
      { id: 'item', label: 'Item', defaultPart: 'test-p-000004', exclusive: true },
    ],
    uiGroups: [
      { id: 'head', label: 'Head', order: 1, selectionSlots: ['head'] },
      { id: 'item', label: 'Item', order: 2, selectionSlots: ['item'] },
    ],
    layerSlots: [
      {
        id: 'head',
        label: 'Head',
        order: 1,
        offset: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
      },
      {
        id: 'item',
        label: 'Item',
        order: 2,
        offset: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
      },
    ],
    parts: [
      {
        id: 'test-p-000001',
        name: 'bun',
        aliases: ['head-bun'],
        selectionSlot: 'head',
        uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-001') }],
      },
      {
        id: 'test-p-000002',
        name: 'braids',
        aliases: ['head-braids'],
        selectionSlot: 'head',
        uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-002') }],
      },
      {
        id: 'test-p-000003',
        name: 'short',
        aliases: ['head-short'],
        selectionSlot: 'head',
        uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-003') }],
      },
      {
        id: 'test-p-000004',
        name: 'none',
        aliases: ['item-none'],
        selectionSlot: 'item',
        uiGroups: ['item'],
        layers: [{ layerSlot: 'item', svg: itemSvg('item-000') }],
      },
      {
        id: 'test-p-000005',
        name: 'duck',
        aliases: ['item-duck'],
        selectionSlot: 'item',
        uiGroups: ['item'],
        layers: [{ layerSlot: 'item', svg: itemSvg('item-001') }],
      },
    ],
    aliases: [
      { alias: 'head-bun', targetId: 'test-p-000001', status: 'active' },
      { alias: 'head-braids', targetId: 'test-p-000002', status: 'active' },
      { alias: 'head-short', targetId: 'test-p-000003', status: 'active' },
      { alias: 'item-none', targetId: 'test-p-000004', status: 'active' },
      { alias: 'item-duck', targetId: 'test-p-000005', status: 'active' },
    ],
  };
}

describe('part resolution', () => {
  const manifest = buildManifest();

  test('manifest fixture is valid', () => {
    expect(validateManifest(manifest)).toEqual([]);
  });

  test('accepts canonical IDs, global aliases, and slot-scoped names', () => {
    expect(resolvePartId('test-p-000002', manifest)).toBe('test-p-000002');
    expect(resolvePartId('head-braids', manifest)).toBe('test-p-000002');
    expect(resolvePartId('braids', manifest, 'head')).toBe('test-p-000002');

    const json = createAvatar(manifest, {
      selections: { head: 'braids', item: 'item-duck' },
    }).toJSON();
    expect(json.selections.head).toBe('test-p-000002');
    expect(json.selections.item).toBe('test-p-000005');
  });

  test('resolves part names per slot', () => {
    const json = createAvatar(manifest, {
      selections: { head: 'braids', item: 'none' },
    }).toJSON();
    expect(json.selections.head).toBe('test-p-000002');
    expect(json.selections.item).toBe('test-p-000004');
  });

  test('rejects duplicate part names within a slot', () => {
    const broken = buildManifest();
    broken.parts[1].name = 'bun';

    const issues = validateManifest(broken);
    expect(
      issues.some((issue) => issue.message.includes('Duplicate part name'))
    ).toBe(true);
  });

  test('rejects unknown parts and cross-slot selections', () => {
    expect(() => resolvePartId('unknown', manifest, 'head')).toThrow(
      'Unknown part'
    );
    expect(() =>
      createAvatar(manifest, { selections: { head: 'item-duck' } })
    ).toThrow('not selectable in slot');
  });
});

describe('color input normalization', () => {
  const manifest = buildManifest();

  test('accepts hex with or without a leading #', () => {
    const svg = createAvatar(manifest, {
      colors: { hair: '#123456', skin: 'ffeecc' },
      background: '#abcdef',
    }).toString();

    expect(svg).toContain('--hm-hair:#123456');
    expect(svg).toContain('--hm-skin:#FFEECC');
    expect(svg).toContain('fill="#ABCDEF"');

    const json = createAvatar(manifest, {
      colors: { hair: '#123456' },
    }).toJSON();
    expect(json.colors.hair).toBe('123456');
  });

  test('keeps transparent background and renders no rect', () => {
    const svg = createAvatar(manifest, { background: 'transparent' }).toString();
    expect(svg).not.toContain('<rect x="0" y="0" width="10" height="10"');
  });

  test('keeps source CSS variable references and sets values on the root', () => {
    const svg = createAvatar(manifest, { colors: { hair: '123456' } }).toString();
    expect(svg).toContain('--hm-hair:#123456');
    expect(svg).toContain('fill="var(--hm-hair, #000000)"');
    expect(svg).toContain('fill="var(--hm-skin, #FFFFFF)"');
  });

  test('fragments without variable references are color-fixed', () => {
    const svg = createAvatar(manifest, {
      selections: { item: 'duck' },
      colors: { clothes: '654321', stroke: 'FF0000' },
    }).toString();

    // the item's literal color is untouched while head regions still bind
    expect(svg).toContain('fill="#FFD412"');
    expect(svg).toContain('fill="var(--hm-hair');
    // the inner svg wrapper is stripped
    expect(svg.match(/<svg/g)?.length).toBe(1);
  });

  test('rejects svg variable references to undeclared color slots', () => {
    const broken = buildManifest();
    broken.parts[0].layers[0].svg =
      '<svg><rect fill="var(--hm-nonexistent, #000000)" /></svg>';

    const issues = validateManifest(broken);
    expect(
      issues.some((issue) =>
        issue.message.includes('Unknown color slot referenced')
      )
    ).toBe(true);
  });
});

describe('toRenderData', () => {
  const manifest = buildManifest();

  test('returns structured output consistent with toString', () => {
    const avatar = createAvatar(manifest, {
      selections: { head: 'braids' },
      background: 'abcdef',
    });
    const data = avatar.toRenderData();

    expect(data.viewBox).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    expect(data.background).toBe('ABCDEF');
    // content has no root svg, no background rect, no inline style
    expect(data.content).not.toContain('<svg');
    expect(data.content).not.toContain('style=');
    expect(data.content).toContain('fill="var(--hm-hair, #000000)"');
    // the string renderer embeds the same content
    expect(avatar.toString()).toContain(data.content);
  });
});

describe('seed', () => {
  const manifest = buildManifest();

  test('is deterministic and picks a valid part per slot', () => {
    const first = createAvatar(manifest, { seed: 'felix' });
    const second = createAvatar(manifest, { seed: 'felix' });

    expect(first.toString()).toBe(second.toString());

    const json = first.toJSON();
    for (const [slotId, partId] of Object.entries(json.selections)) {
      const part = manifest.parts.find((candidate) => candidate.id === partId);
      expect(part?.selectionSlot).toBe(slotId);
    }
  });

  test('different seeds produce different avatars', () => {
    const outputs = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((seed) =>
        createAvatar(manifest, { seed }).toString()
      )
    );
    expect(outputs.size).toBeGreaterThan(1);
  });

  test('explicit selections override seeded picks', () => {
    const json = createAvatar(manifest, {
      seed: 'felix',
      selections: { head: 'head-short' },
    }).toJSON();
    expect(json.selections.head).toBe('test-p-000003');
  });
});
