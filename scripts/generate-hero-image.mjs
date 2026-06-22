import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, '..');
const outDir = join(rootDir, '.github');

const { humation1 } = await import(
  join(rootDir, 'packages/assets-humation-1/dist/index.js')
);
const { createAvatar } = await import(
  join(rootDir, 'packages/core/dist/index.js')
);

const personas = [
  { seed: 'alice',   colors: { hair: '#2D1B0E', skin: '#FFDEC2', clothes: '#E87461', bottom: '#3B3B3B' } },
  { seed: 'bob',     colors: { hair: '#1A1A2E', skin: '#F5D6BA', clothes: '#4A90D9', bottom: '#2C3E50' } },
  { seed: 'charlie', colors: { hair: '#8B4513', skin: '#FFE0BD', clothes: '#27AE60', bottom: '#34495E' } },
  { seed: 'diana',   colors: { hair: '#C0392B', skin: '#FFEAA7', clothes: '#9B59B6', bottom: '#2C3E50' } },
  { seed: 'eve',     colors: { hair: '#2C3E50', skin: '#DFC5A0', clothes: '#F39C12', bottom: '#1A1A2E' } },
  { seed: 'felix',   colors: { hair: '#5D4037', skin: '#FFD5B8', clothes: '#E74C3C', bottom: '#4A4A4A' } },
  { seed: 'grace',   colors: { hair: '#1B1B1B', skin: '#F0C8A0', clothes: '#1ABC9C', bottom: '#2D2D2D' } },
  { seed: 'hiro',    colors: { hair: '#3E2723', skin: '#FFE4C4', clothes: '#3498DB', bottom: '#333333' } },
  { seed: 'iris',    colors: { hair: '#4A148C', skin: '#FFDAB9', clothes: '#FF6F61', bottom: '#3B3B3B' } },
  { seed: 'jade',    colors: { hair: '#212121', skin: '#F5DEB3', clothes: '#2ECC71', bottom: '#2C3E50' } },
];

const avatarSize = 80;
const gap = 12;
const cols = personas.length;
const totalWidth = cols * avatarSize + (cols - 1) * gap;
const totalHeight = avatarSize;

let innerSvg = '';

for (let i = 0; i < personas.length; i++) {
  const { seed, colors } = personas[i];
  const avatar = createAvatar(humation1, { seed, colors, crop: 'avatar' });
  const svgStr = avatar.toString();

  const viewBoxMatch = svgStr.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 88 88';

  const innerContent = svgStr
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

  const styleMatch = svgStr.match(/style="([^"]+)"/);
  const style = styleMatch ? styleMatch[1] : '';

  const x = i * (avatarSize + gap);

  innerSvg += `<svg x="${x}" y="0" width="${avatarSize}" height="${avatarSize}" viewBox="${viewBox}" style="${style}">${innerContent}</svg>\n`;
}

const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
${innerSvg}</svg>
`;

await writeFile(join(outDir, 'hero.svg'), heroSvg);
console.log(`Wrote .github/hero.svg (${personas.length} avatars)`);

for (const { seed, colors } of personas.slice(0, 5)) {
  const svg = createAvatar(humation1, { seed, colors, crop: 'avatar' }).toString();
  await writeFile(join(outDir, `avatar-${seed}.svg`), svg);
}
console.log('Wrote individual sample avatars');
