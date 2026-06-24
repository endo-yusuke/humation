'use client';

import { Avatar } from '@humation/react';
import type { HumationManifest } from '@humation/core';
import {
  ArrowDownToLine,
  Check,
  Copy,
  Dice5,
  ImageDown,
  Palette,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HumationAvatarBuilderState } from '@/lib/humation/avatar-state';
import { toCssColor } from '@/lib/humation/avatar-state';

export type AvatarExportState = 'idle' | 'exporting' | 'success' | 'error';

type AvatarPreviewProps = {
  assets: HumationManifest;
  state: HumationAvatarBuilderState;
  exportState: AvatarExportState;
  title?: string;
  onRandomize: () => void;
  onOpenColors: () => void;
  onExportPng: () => void;
  onDownloadSvg: () => void;
  onCopyJson: () => void;
};

export function AvatarPreview({
  assets,
  state,
  exportState,
  title = 'Humation',
  onRandomize,
  onOpenColors,
  onExportPng,
  onDownloadSvg,
  onCopyJson,
}: AvatarPreviewProps) {
  const exportLabel =
    exportState === 'exporting'
      ? 'Exporting'
      : exportState === 'success'
        ? 'Exported'
        : exportState === 'error'
          ? 'Export failed'
          : 'Export PNG';
  const ExportIcon =
    exportState === 'success'
      ? Check
      : exportState === 'error'
        ? XCircle
        : ImageDown;

  return (
    <section className="flex min-h-[360px] shrink-0 flex-col justify-between gap-5 bg-muted/35 p-4 sm:p-6 md:min-h-[640px] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-normal">
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {assets.template.name}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onOpenColors}
          aria-label="Edit colors"
          title="Edit colors"
          className="shrink-0 rounded-full"
        >
          <Palette className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[2rem] ring-1 ring-border ring-inset md:max-w-[360px]"
          style={{
            background:
              state.background === 'transparent'
                ? 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px'
                : toCssColor(state.background, assets.defaults.background),
          }}
        >
          <Avatar
            assets={assets}
            selections={state.selections}
            colors={state.colors}
            background="transparent"
            crop={state.crop}
            title={`${title} preview`}
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
        <Button type="button" variant="outline" onClick={onRandomize}>
          <Dice5 className="mr-2 size-4" aria-hidden="true" />
          Random
        </Button>
        <Button
          type="button"
          onClick={onExportPng}
          disabled={exportState === 'exporting'}
          variant={exportState === 'error' ? 'destructive' : 'default'}
        >
          <ExportIcon
            className={cx(
              'mr-2 size-4',
              exportState === 'exporting' && 'animate-pulse'
            )}
            aria-hidden="true"
          />
          {exportLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onDownloadSvg}>
          <ArrowDownToLine className="mr-2 size-4" aria-hidden="true" />
          SVG
        </Button>
        <Button type="button" variant="secondary" onClick={onCopyJson}>
          <Copy className="mr-2 size-4" aria-hidden="true" />
          JSON
        </Button>
      </div>
    </section>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
