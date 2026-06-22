import { forwardRef, useMemo } from 'react';
import type { CSSProperties, SVGProps } from 'react';
import { createAvatar } from '@humation/core';
import type { HumationManifest } from '@humation/core';

export type AvatarProps = {
  /** The asset set to draw with, e.g. `humation1` from `@humation/assets-humation-1`. */
  assets: HumationManifest;
  /** Deterministic part picks per slot — same seed, same avatar. */
  seed?: string;
  /**
   * Part selections by name, alias, or canonical ID,
   * e.g. `{ head: 'braids', item: 'calico-cat' }`.
   */
  selections?: Record<string, string>;
  /**
   * Color slot values (`{ hair: '#4A3728' }`, `#` optional). Applied as CSS
   * custom properties on the <svg> element, so changing colors never
   * re-renders the avatar content; unspecified slots keep the defaults baked
   * into the assets and stay themeable from outer CSS.
   */
  colors?: Record<string, string>;
  /** Background fill (hex or 'transparent'). Defaults to the manifest default. */
  background?: string;
  /** Crop id. Defaults to the manifest default ('avatar'). */
  crop?: string;
  /** Rendered size. Numbers keep the crop's aspect ratio. */
  size?: number | string;
  /** Accessible title. Without it the avatar is treated as decorative. */
  title?: string;
} & Omit<SVGProps<SVGSVGElement>, 'children'>;

export const Avatar = forwardRef<SVGSVGElement, AvatarProps>(function Avatar(
  {
    assets,
    seed,
    selections,
    colors,
    background,
    crop,
    size,
    title,
    style,
    ...rest
  },
  ref
) {
  const selectionsKey = JSON.stringify(selections ?? null);

  const data = useMemo(
    () => createAvatar(assets, { seed, selections, background, crop }).toRenderData(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selections is keyed by value
    [assets, seed, selectionsKey, background, crop]
  );

  const colorVariables: CSSProperties = {};
  for (const [slot, value] of Object.entries(colors ?? {})) {
    (colorVariables as Record<string, string>)[`--hm-${slot}`] =
      normalizeCssColor(value);
  }

  const { viewBox } = data;
  const width = size ?? viewBox.width;
  const height =
    typeof size === 'number'
      ? (size * viewBox.height) / viewBox.width
      : typeof size === 'string'
        ? 'auto'
        : viewBox.height;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      width={width}
      height={height}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      ref={ref}
      style={{ ...colorVariables, ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {data.background !== 'transparent' ? (
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill={`#${data.background}`}
        />
      ) : null}
      <g dangerouslySetInnerHTML={{ __html: data.content }} />
    </svg>
  );
});

function normalizeCssColor(value: string) {
  const trimmed = value.trim();
  return /^[0-9a-fA-F]{6}$/.test(trimmed) ? `#${trimmed}` : trimmed;
}
