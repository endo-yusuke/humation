import { describe, expect, test } from 'bun:test';
import type { HumationManifest } from './types.js';
import { createPartPreview, getPartsForSlot, getPartsForUiGroup } from './ui-helpers.js';

function buildManifest(): HumationManifest {
  const headSvg = (label: string) =>
    `<svg><rect data-label="${label}" width="1" height="1" fill="var(--hm-hair, #000000)" /></svg>`;
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
      selections: { head: 'test-p-001', item: 'test-p-004' },
      colors: { hair: '000000', skin: 'FFFFFF' },
      background: 'F6F5F4',
      crop: 'avatar',
    },
    colors: [
      { id: 'hair', label: 'Hair', default: '000000', cssVariable: '--hm-hair' },
      { id: 'skin', label: 'Skin', default: 'FFFFFF', cssVariable: '--hm-skin' },
    ],
    crops: { avatar: { x: 0, y: 0, width: 10, height: 10 } },
    selectionSlots: [
      { id: 'head', label: 'Head', defaultPart: 'test-p-001', exclusive: true },
      { id: 'item', label: 'Item', defaultPart: 'test-p-004', exclusive: true },
    ],
    uiGroups: [
      { id: 'head', label: 'Head', order: 1, selectionSlots: ['head'] },
      { id: 'item', label: 'Item', order: 2, selectionSlots: ['item'] },
      { id: 'cat', label: 'Cat', order: 3, selectionSlots: ['item'] },
    ],
    layerSlots: [
      { id: 'head', label: 'Head', order: 1, offset: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
      { id: 'item', label: 'Item', order: 2, offset: { x: 0, y: 5 }, size: { width: 10, height: 10 } },
    ],
    parts: [
      {
        id: 'test-p-001', source: { partId: '001' }, name: 'bun',
        selectionSlot: 'head', uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-001') }],
      },
      {
        id: 'test-p-002', source: { partId: '003' }, name: 'braids',
        selectionSlot: 'head', uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-003') }],
      },
      {
        id: 'test-p-003', source: { partId: '002' }, name: 'short',
        selectionSlot: 'head', uiGroups: ['head'],
        layers: [{ layerSlot: 'head', svg: headSvg('head-002') }],
      },
      {
        id: 'test-p-004', name: 'none', source: { partId: '000' },
        selectionSlot: 'item', uiGroups: ['item'],
        layers: [{ layerSlot: 'item', svg: itemSvg('item-000') }],
      },
      {
        id: 'test-p-005', name: 'duck', source: { partId: '001' },
        selectionSlot: 'item', uiGroups: ['item'],
        layers: [{ layerSlot: 'item', svg: itemSvg('item-001') }],
      },
      {
        id: 'test-p-006', name: 'calico-cat', source: { partId: '002' },
        selectionSlot: 'item', uiGroups: ['cat'],
        layers: [{ layerSlot: 'item', svg: itemSvg('cat-002') }],
      },
      {
        id: 'test-p-007', name: 'old-hat', source: { partId: '099' },
        selectionSlot: 'item', uiGroups: ['item'],
        layers: [{ layerSlot: 'item', svg: itemSvg('item-099') }],
        deprecated: true,
      },
    ],
    aliases: [],
  };
}

describe('createPartPreview', () => {
  const manifest = buildManifest();

  test('renders a single part as standalone SVG', () => {
    const svg = createPartPreview(manifest, manifest.parts[0]).toString();
    expect(svg).toContain('<svg');
    expect(svg).toContain('head-001');
    expect(svg).toContain('fill="var(--hm-hair, #000000)"');
    expect(svg.match(/<svg/g)?.length).toBe(1);
  });

  test('accepts a part ID string', () => {
    const svg = createPartPreview(manifest, 'test-p-005').toString();
    expect(svg).toContain('item-001');
  });

  test('uses the layer slot viewBox for framing', () => {
    const svg = createPartPreview(manifest, 'test-p-005').toString();
    expect(svg).toContain('viewBox="0 5 10 10"');
  });

  test('applies custom colors', () => {
    const svg = createPartPreview(manifest, manifest.parts[0], {
      colors: { hair: '#FF0000' },
    }).toString();
    expect(svg).toContain('--hm-hair:#FF0000');
  });

  test('defaults to transparent background', () => {
    const svg = createPartPreview(manifest, manifest.parts[0]).toString();
    expect(svg).not.toContain('fill="#F6F5F4"');
  });

  test('renders background when specified', () => {
    const svg = createPartPreview(manifest, manifest.parts[0], {
      background: 'EEEEEE',
    }).toString();
    expect(svg).toContain('fill="#EEEEEE"');
    expect(svg).toMatch(/<rect[^>]*fill="#EEEEEE"/);
  });

  test('toDataUri returns a valid data URI', () => {
    const uri = createPartPreview(manifest, manifest.parts[0]).toDataUri();
    expect(uri).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });

  test('throws for unknown part ID', () => {
    expect(() => createPartPreview(manifest, 'nope')).toThrow('Unknown part');
  });
});

describe('getPartsForSlot', () => {
  const manifest = buildManifest();

  test('returns parts for a given slot', () => {
    const heads = getPartsForSlot(manifest, 'head');
    expect(heads).toHaveLength(3);
    expect(heads.every((p) => p.selectionSlot === 'head')).toBe(true);
  });

  test('excludes deprecated parts', () => {
    const items = getPartsForSlot(manifest, 'item');
    expect(items.find((p) => p.name === 'old-hat')).toBeUndefined();
  });

  test('sorts by source.partId', () => {
    const heads = getPartsForSlot(manifest, 'head');
    expect(heads.map((p) => p.source?.partId)).toEqual(['001', '002', '003']);
  });
});

describe('getPartsForUiGroup', () => {
  const manifest = buildManifest();

  test('returns parts for item group only', () => {
    const items = getPartsForUiGroup(manifest, 'item');
    expect(items.map((p) => p.name)).toEqual(['none', 'duck']);
  });

  test('returns parts for cat group only', () => {
    const cats = getPartsForUiGroup(manifest, 'cat');
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('calico-cat');
  });

  test('excludes deprecated parts', () => {
    const items = getPartsForUiGroup(manifest, 'item');
    expect(items.find((p) => p.deprecated)).toBeUndefined();
  });
});
