import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAvatar, validateManifest } from '@humation/core';
import { manifest, rawManifest } from './index.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('@humation/assets-humation-1', () => {
  test('exports a valid embedded manifest that renders without I/O', () => {
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest.parts).toHaveLength(86);
    expect(manifest.aliases).toHaveLength(86);

    for (const part of manifest.parts) {
      if (!part.name) throw new Error(`Part is missing a name: ${part.id}`);
    }

    const svg = createAvatar(manifest, {
      selections: { head: 'wavy-long' },
      colors: { skin: '#FFEECC' },
    }).toString();

    expect(svg).toContain('<svg');
    expect(svg).toContain('data-hm-layer-slot="head"');
    expect(svg).toContain('data-hm-part-id="hm1-p-000023"');
    expect(svg).toContain('data-hm-selection-slot="head"');
    expect(svg).toContain('data-hm-source-group-id="head"');
    expect(svg).toContain('data-hm-source-part-id="023"');
    expect(svg).toContain('--hm-skin:#FFEECC');
    expect(svg).toContain('fill="var(--hm-hair, #000000)"');
  });

  test('accessory fills are fixed while outlines follow the stroke slot', () => {
    const fixedGroups = new Set(['item', 'glasses', 'cat']);
    const fixedParts = manifest.parts.filter((part) =>
      fixedGroups.has(part.source?.groupId ?? '')
    );
    expect(fixedParts.length).toBeGreaterThan(0);

    // identity colors are fixed: the only allowed slot reference is stroke
    for (const part of fixedParts) {
      for (const layer of part.layers) {
        for (const match of layer.svg?.matchAll(/var\(--hm-([a-z-]+)/g) ??
          []) {
          if (match[1] !== 'stroke') {
            throw new Error(
              `Accessory ${part.id} binds a non-stroke slot: ${match[1]}`
            );
          }
        }
      }
    }

    // whites stay white even with custom colors; outlines bind to stroke
    // (tank-top body: no fixed-white regions outside the item itself)
    const svg = createAvatar(manifest, {
      selections: { item: 'santa-hat', body: 'tank-top' },
      colors: { skin: 'FFEECC', stroke: 'FF0000' },
    }).toString();
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain('fill="var(--hm-stroke');
    expect(svg).not.toContain('fill="white"');
  });

  test('exports raw manifest without embedded SVG strings', () => {
    expect(validateManifest(rawManifest)).toEqual([]);
    expect(rawManifest.parts).toHaveLength(86);
    expect(JSON.stringify(rawManifest)).not.toContain('"svg"');
  });

  test('raw manifest asset paths resolve to package files', () => {
    const paths = rawManifest.parts.flatMap((part) =>
      part.layers.map((layer) => layer.svgPath)
    );

    expect(paths).toHaveLength(86);

    for (const path of paths) {
      if (!path) throw new Error('Missing svgPath');
      expect(existsSync(join(packageRoot, path)), path).toBe(true);
    }
  });
});
