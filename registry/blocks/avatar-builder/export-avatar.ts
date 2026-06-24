import { createAvatar } from '@humation/core';
import type { HumationManifest } from '@humation/core';
import type { HumationAvatarBuilderState } from '@/lib/humation/avatar-state';

export type AvatarExportOptions = {
  filename?: string;
  pngSize?: number;
};

export function renderAvatarSvg(
  manifest: HumationManifest,
  state: HumationAvatarBuilderState
) {
  return createAvatar(manifest, {
    selections: state.selections,
    colors: state.colors,
    background: state.background,
    crop: state.crop,
  }).toString();
}

export function serializeAvatarState(state: HumationAvatarBuilderState) {
  return JSON.stringify(
    {
      selections: state.selections,
      colors: state.colors,
      background: state.background,
      crop: state.crop,
    },
    null,
    2
  );
}

export async function copyAvatarState(state: HumationAvatarBuilderState) {
  await navigator.clipboard.writeText(serializeAvatarState(state));
}

export function downloadAvatarSvg(
  manifest: HumationManifest,
  state: HumationAvatarBuilderState,
  options: AvatarExportOptions = {}
) {
  const svg = renderAvatarSvg(manifest, state);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, buildFilename(options.filename, 'svg'));
}

export async function downloadAvatarPng(
  manifest: HumationManifest,
  state: HumationAvatarBuilderState,
  options: AvatarExportOptions = {}
) {
  const svg = renderAvatarSvg(manifest, state);
  const blob = await svgToPngBlob(svg, options.pngSize ?? 1024);
  downloadBlob(blob, buildFilename(options.filename, 'png'));
}

export async function svgToPngBlob(svg: string, targetSize: number) {
  const image = new Image();
  image.decoding = 'async';
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error('Failed to load SVG as image for PNG export'));
  });

  const width = image.naturalWidth || image.width || targetSize;
  const height = image.naturalHeight || image.height || targetSize;
  const scale = targetSize / Math.max(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context is not available');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildFilename(filename: string | undefined, extension: string) {
  const base = (filename ?? 'humation-avatar')
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${base || 'humation-avatar'}.${extension}`;
}
