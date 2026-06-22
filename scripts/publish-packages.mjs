#!/usr/bin/env node

// Publish packages via tarball to work around npm workspaces README bug.
//
// npm workspaces have a bug where publishing from a workspace directory
// produces a tarball with the correct README, but the registry metadata
// (the readme shown on npmjs.com) ends up empty. Publishing a tarball
// file instead of a directory forces npm to read the README from inside it.
//
// Usage:
//   node scripts/publish-packages.mjs --tag beta          # all public packages
//   node scripts/publish-packages.mjs --tag beta --only core,react

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const PACKAGES = ['core', 'assets-humation-1', 'react'];

const args = process.argv.slice(2);
const tagIdx = args.indexOf('--tag');
const tag = tagIdx !== -1 ? args[tagIdx + 1] : undefined;
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1].split(',') : null;

if (!tag) {
  console.error('Usage: node scripts/publish-packages.mjs --tag <tag> [--only pkg1,pkg2]');
  console.error('Example: node scripts/publish-packages.mjs --tag beta');
  process.exit(1);
}

const packages = only
  ? PACKAGES.filter((p) => only.includes(p))
  : PACKAGES;

for (const pkg of packages) {
  const dir = path.resolve('packages', pkg);
  const pkgJson = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));

  if (!existsSync(path.join(dir, 'README.md'))) {
    console.error(`\x1b[31m✗ ${pkgJson.name}: no README.md found\x1b[0m`);
    process.exit(1);
  }

  console.log(`\n\x1b[36m▸ Publishing ${pkgJson.name}@${pkgJson.version} --tag ${tag}\x1b[0m`);

  try {
    // Step 1: build and pack into a tarball
    const packOutput = execSync('npm pack', { cwd: dir, encoding: 'utf8' });
    const tgzName = packOutput.trim().split('\n').pop();
    const tgzPath = path.join(dir, tgzName);

    // Step 2: publish the tarball (forces npm to read README from inside it)
    try {
      execSync(`npm publish "${tgzPath}" --tag ${tag}`, {
        cwd: dir,
        stdio: 'inherit',
      });
      console.log(`\x1b[32m✓ ${pkgJson.name}@${pkgJson.version} published\x1b[0m`);
    } finally {
      if (existsSync(tgzPath)) unlinkSync(tgzPath);
    }
  } catch {
    console.error(`\x1b[31m✗ ${pkgJson.name} failed\x1b[0m`);
    process.exit(1);
  }
}

console.log('\n\x1b[32mDone.\x1b[0m');
