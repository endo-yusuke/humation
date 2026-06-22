import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePaths = [
  'packages/core',
  'packages/assets-humation-1',
  'packages/react',
  'packages/web-component',
];
const packages = new Map(
  packagePaths.map((packagePath) => {
    const packageJson = readJson(join(repoRoot, packagePath, 'package.json'));
    return [packageJson.name, { packagePath, packageJson }];
  })
);
const expectedLicenses = new Map([
  ['@humation/core', 'MIT'],
  ['@humation/assets-humation-1', 'MIT'],
  ['@humation/react', 'MIT'],
  ['@humation/web-component', 'MIT'],
]);
const blockers = [];
const warnings = [];

for (const { packagePath, packageJson } of packages.values()) {
  const label = `${packageJson.name} (${packagePath})`;

  requireField(packageJson, 'name', label);
  requireField(packageJson, 'version', label);
  requireField(packageJson, 'description', label);
  requireField(packageJson, 'license', label);
  requireField(packageJson, 'exports', label);
  requireField(packageJson, 'files', label);

  if (packageJson.private === true) {
    blockers.push(`${label}: remove private:true before publishing`);
  }

  const expectedLicense = expectedLicenses.get(packageJson.name);
  if (expectedLicense && packageJson.license !== expectedLicense) {
    blockers.push(
      `${label}: expected license ${expectedLicense}, received ${packageJson.license}`
    );
  } else if (packageJson.license === 'UNLICENSED') {
    blockers.push(`${label}: choose and apply a public release license`);
  }

  if (packageJson.version === '0.0.0-poc' || packageJson.version.includes('poc')) {
    blockers.push(`${label}: replace placeholder version ${packageJson.version}`);
  }

  if (packageJson.name?.startsWith('@')) {
    const access = packageJson.publishConfig?.access;
    if (access !== 'public') {
      blockers.push(`${label}: scoped public packages need publishConfig.access=public`);
    }
  }

  if (packageJson.type !== 'module') {
    blockers.push(`${label}: expected type=module`);
  }

  if (packageJson.sideEffects !== false) {
    warnings.push(`${label}: sideEffects:false improves tree-shaking`);
  }

  if (!packageJson.engines?.node) {
    warnings.push(`${label}: add engines.node for runtime support expectations`);
  }

  for (const [dependencyName, version] of Object.entries(
    packageJson.dependencies ?? {}
  )) {
    if (String(version).startsWith('workspace:')) {
      blockers.push(`${label}: dependency ${dependencyName} uses ${version}`);
    }
  }

  for (const requiredFile of packageJson.files ?? []) {
    if (!existsSync(join(repoRoot, packagePath, requiredFile))) {
      blockers.push(`${label}: files entry does not exist: ${requiredFile}`);
    }
  }

  if (!existsSync(join(repoRoot, packagePath, 'README.md'))) {
    blockers.push(`${label}: missing package README.md`);
  }

  if (!existsSync(join(repoRoot, packagePath, 'LICENSE.md'))) {
    blockers.push(`${label}: missing package LICENSE.md`);
  }
}

// every internal @humation/* runtime dependency must match the version of
// the package it points at
for (const { packageJson } of packages.values()) {
  for (const [name, range] of Object.entries(packageJson.dependencies ?? {})) {
    const target = packages.get(name)?.packageJson;
    if (target && range !== target.version) {
      blockers.push(
        `${packageJson.name}: ${name} dependency ${range} must match version ${target.version}`
      );
    }
  }
}

if (!existsSync(join(repoRoot, 'LICENSE'))) {
  blockers.push('repository: add a LICENSE file before public release');
}


if (blockers.length > 0) {
  console.error('Publish readiness blockers:');
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
}

if (warnings.length > 0) {
  console.error('\nPublish readiness warnings:');
  for (const warning of warnings) {
    console.error(`- ${warning}`);
  }
}

if (blockers.length > 0) {
  process.exit(1);
}

console.log('Publish readiness check passed.');

function requireField(packageJson, field, label) {
  if (packageJson[field] === undefined || packageJson[field] === '') {
    blockers.push(`${label}: missing ${field}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
