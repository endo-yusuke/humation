// Builds installable shadcn registry items: inlines each item's file
// contents from registry/registry.json into r/<name>.json, the URLs that
// `npx shadcn add <url>` consumes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const registry = JSON.parse(
  readFileSync(join(repoRoot, 'registry/registry.json'), 'utf8')
);

mkdirSync(join(repoRoot, 'r'), { recursive: true });

for (const item of registry.items) {
  const built = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    ...item,
    files: item.files.map((file) => ({
      ...file,
      content: readFileSync(join(repoRoot, file.path), 'utf8'),
    })),
  };

  const outPath = join(repoRoot, 'r', `${item.name}.json`);
  writeFileSync(outPath, `${JSON.stringify(built, null, 2)}\n`);
  console.log(`Wrote r/${item.name}.json`);
}
