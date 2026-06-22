import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { humation1 } from '@humation/assets-humation-1';
import { createAvatar } from '@humation/core';

const currentDir = dirname(fileURLToPath(import.meta.url));
const exampleRoot = join(currentDir, '..');
const outDir = join(exampleRoot, 'out');
const svgPath = join(outDir, 'avatar.svg');
const htmlPath = join(outDir, 'avatar.html');

const svg = createAvatar(humation1, {
  // part names resolve per slot; canonical IDs also work
  selections: {
    head: 'wavy-long',
    body: 'hoodie',
    bottom: 'wide-pants',
    item: 'camera',
  },
  colors: {
    hair: '#123456',
    clothes: '#654321',
    bottom: '#ABCDEF',
    skin: '#FFEECC',
    stroke: '#111111',
  },
  background: '#F6F5F4',
  crop: 'avatar',
}).toString();

assertCssVariableOutput(svg);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Humation Node Example</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f3f4f6;
      }

      svg {
        width: min(70vmin, 520px);
        height: auto;
        box-shadow: 0 20px 50px rgb(0 0 0 / 16%);
      }
    </style>
  </head>
  <body>
    ${svg}
  </body>
</html>
`;

await mkdir(outDir, { recursive: true });
await writeFile(svgPath, svg);
await writeFile(htmlPath, html);

console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${htmlPath}`);

function assertCssVariableOutput(output: string) {
  const required = [
    '--hm-hair:#123456',
    '--hm-clothes:#654321',
    '--hm-bottom:#ABCDEF',
    '--hm-skin:#FFEECC',
    '--hm-stroke:#111111',
    'fill="var(--hm-hair',
    'fill="var(--hm-clothes',
    'fill="var(--hm-bottom',
    'fill="var(--hm-skin',
    'fill="var(--hm-stroke',
  ];

  for (const fragment of required) {
    if (!output.includes(fragment)) {
      throw new Error(`Expected SVG output to include: ${fragment}`);
    }
  }
}
