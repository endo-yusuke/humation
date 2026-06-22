import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const smokeRoot = mkdtempSync(join(tmpdir(), 'humation-pack-smoke-'));
const tarballDir = join(smokeRoot, 'tarballs');
const fixtureDir = join(smokeRoot, 'fixture');
const npmCache = join(tmpdir(), 'humation-npm-cache');

mkdirSync(tarballDir, { recursive: true });
mkdirSync(fixtureDir, { recursive: true });

run('bun', ['run', 'build:packages'], { cwd: repoRoot });

const coreTarball = packPackage('packages/core');
const assetsTarball = packPackage('packages/assets-humation-1');
const reactTarball = packPackage('packages/react');
const webComponentTarball = packPackage('packages/web-component');

inspectPackedPackage(coreTarball, {
  name: '@humation/core',
  requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'LICENSE.md', 'README.md'],
});

inspectPackedPackage(assetsTarball, {
  name: '@humation/assets-humation-1',
  requiredFiles: [
    'dist/index.js',
    'dist/index.d.ts',
    'LICENSE.md',
    'manifest.json',
    'assets/humation-1/head/023.svg',
    'README.md',
  ],
});

inspectPackedPackage(reactTarball, {
  name: '@humation/react',
  requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'LICENSE.md', 'README.md'],
});

inspectPackedPackage(webComponentTarball, {
  name: '@humation/web-component',
  requiredFiles: ['dist/index.js', 'dist/index.d.ts', 'LICENSE.md', 'README.md'],
});

writeFileSync(
  join(fixtureDir, 'package.json'),
  JSON.stringify(
    {
      name: 'humation-pack-smoke-fixture',
      private: true,
      type: 'module',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
    },
    null,
    2
  )
);

run(
  'npm',
  [
    '--cache',
    npmCache,
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    coreTarball,
    assetsTarball,
    reactTarball,
    webComponentTarball,
  ],
  { cwd: fixtureDir }
);

writeFileSync(
  join(fixtureDir, 'render.mjs'),
  `import { createAvatar, validateManifest } from '@humation/core';
import { humation1, manifest } from '@humation/assets-humation-1';

const validation = validateManifest(manifest);
if (validation.length > 0) {
  throw new Error(validation.map((issue) => \`\${issue.path}: \${issue.message}\`).join('\\n'));
}

const svg = createAvatar(manifest, {
  selections: {
    head: 'wavy-long',
    body: 'body-hoodie',
    bottom: 'wide-pants',
    item: 'camera',
  },
  colors: {
    hair: '#123456',
    clothes: '654321',
    bottom: 'ABCDEF',
    skin: 'FFEECC',
    stroke: '111111',
  },
  background: 'F6F5F4',
}).toString();

for (const fragment of [
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
]) {
  if (!svg.includes(fragment)) {
    throw new Error(\`Expected SVG output to include: \${fragment}\`);
  }
}

const seededFirst = createAvatar(manifest, { seed: 'felix' }).toString();
const seededSecond = createAvatar(manifest, { seed: 'felix' }).toString();
if (seededFirst !== seededSecond) {
  throw new Error('Expected seeded output to be deterministic');
}

// React wrapper renders through the packed packages
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { Avatar } = await import('@humation/react');

const reactHtml = renderToStaticMarkup(
  createElement(Avatar, {
    assets: humation1,
    seed: 'felix',
    colors: { hair: '4A3728' },
    size: 96,
  })
);
if (!reactHtml.startsWith('<svg') || !reactHtml.includes('--hm-hair:#4A3728')) {
  throw new Error('Expected @humation/react to render an svg with color variables');
}

// Web component markup builder works without a DOM
const { renderAvatarMarkup } = await import('@humation/web-component');
const wcMarkup = renderAvatarMarkup(humation1, { seed: 'felix', size: 96 });
if (!wcMarkup.startsWith('<svg') || wcMarkup.includes('style=')) {
  throw new Error('Expected @humation/web-component markup without inline styles');
}

console.log(JSON.stringify({
  ok: true,
  length: svg.length,
  packageImport: true,
  cssVariables: true,
  react: true,
  webComponent: true
}));
`
);

run('node', ['render.mjs'], { cwd: fixtureDir });

console.log(`Pack smoke passed: ${smokeRoot}`);

function packPackage(packagePath) {
  const result = run(
    'npm',
    [
      '--cache',
      npmCache,
      'pack',
      '--json',
      '--pack-destination',
      tarballDir,
    ],
    { cwd: join(repoRoot, packagePath), capture: true }
  );
  const parsed = JSON.parse(result.stdout);
  const filename = parsed[0]?.filename;
  if (!filename) {
    throw new Error(`npm pack did not return a filename for ${packagePath}`);
  }
  return join(tarballDir, filename);
}

function inspectPackedPackage(tarballPath, options) {
  const packageJson = JSON.parse(
    run('tar', ['-xOf', tarballPath, 'package/package.json'], {
      capture: true,
    }).stdout
  );

  if (packageJson.name !== options.name) {
    throw new Error(`Expected ${options.name}, received ${packageJson.name}`);
  }

  for (const [name, version] of Object.entries(packageJson.dependencies ?? {})) {
    if (String(version).startsWith('workspace:')) {
      throw new Error(`${packageJson.name} dependency ${name} uses ${version}`);
    }
  }

  const fileList = run('tar', ['-tf', tarballPath], { capture: true }).stdout
    .trim()
    .split('\n')
    .map((entry) => entry.replace(/^package\//, ''));

  for (const requiredFile of options.requiredFiles) {
    if (!fileList.includes(requiredFile)) {
      throw new Error(`${packageJson.name} tarball is missing ${requiredFile}`);
    }
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ? resolve(options.cwd) : repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    const detail = options.capture
      ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      : '';
    throw new Error(
      `Command failed: ${command} ${args.join(' ')}${detail}`
    );
  }

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
