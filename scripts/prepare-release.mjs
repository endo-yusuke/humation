import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePaths = [
  'packages/core',
  'packages/assets-humation-1',
  'packages/react',
  'packages/web-component',
];
const args = process.argv.slice(2);
const version = args.find((arg) => !arg.startsWith('-'));
const shouldWrite = args.includes('--write');

if (!version || !isSemver(version)) {
  console.error('Usage: bun run release:prepare -- <version> [--write]');
  console.error('Example: bun run release:prepare -- 0.1.0 --write');
  process.exit(1);
}

const changes = [];
const packageJsonByName = new Map();

for (const packagePath of packagePaths) {
  const path = join(repoRoot, packagePath, 'package.json');
  const packageJson = readJson(path);

  packageJson.version = version;
  delete packageJson.private;

  packageJsonByName.set(packageJson.name, { packagePath, path, packageJson });
}

const core = packageJsonByName.get('@humation/core')?.packageJson;

if (!core) {
  throw new Error('Expected @humation/core');
}

// keep every internal @humation/* dependency pinned to the release version
for (const { packageJson } of packageJsonByName.values()) {
  for (const field of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(packageJson[field] ?? {})) {
      if (packageJsonByName.has(name)) {
        packageJson[field][name] = version;
      }
    }
  }
}

for (const { packagePath, path, packageJson } of packageJsonByName.values()) {
  const nextJson = `${JSON.stringify(packageJson, null, 2)}\n`;
  const previousJson = readFileSync(path, 'utf8');

  if (nextJson !== previousJson) {
    changes.push(`${packagePath}/package.json`);
    if (shouldWrite) {
      writeFileSync(path, nextJson);
    }
  }
}

if (shouldWrite) {
  console.log(`Prepared Humation release ${version}.`);
  for (const change of changes) {
    console.log(`- updated ${change}`);
  }
  console.log('Next: bun install && bun run release:check && bun run pack:smoke');
} else {
  console.log(`Dry run: would prepare Humation release ${version}.`);
  for (const change of changes) {
    console.log(`- would update ${change}`);
  }
  console.log('Re-run with --write to modify package files.');
}

function isSemver(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    value
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
