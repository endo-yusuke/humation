'use client';

import * as React from 'react';
import type { HumationManifest } from '@humation/core';
import { humation1 } from '@humation/assets-humation-1';
import { AvatarColorSheet } from '@/components/humation/color-sheet';
import {
  AvatarPreview,
  type AvatarExportState,
} from '@/components/humation/avatar-preview';
import { AvatarPartPicker } from '@/components/humation/part-picker';
import {
  buildAvatarBuilderModel,
  createAvatarBuilderState,
  randomizeAvatarBuilderState,
} from '@/lib/humation/avatar-state';
import type { HumationAvatarBuilderState } from '@/lib/humation/avatar-state';
import {
  copyAvatarState,
  downloadAvatarPng,
  downloadAvatarSvg,
} from '@/lib/humation/export-avatar';

export type AvatarBuilderProps = {
  assets?: HumationManifest;
  value?: Partial<HumationAvatarBuilderState>;
  defaultValue?: Partial<HumationAvatarBuilderState>;
  seed?: string;
  title?: string;
  filename?: string;
  className?: string;
  hiddenGroupIds?: string[];
  hiddenColorIds?: string[];
  onChange?: (state: HumationAvatarBuilderState) => void;
};

export function AvatarBuilder({
  assets = humation1,
  value,
  defaultValue,
  seed,
  title = 'Humation',
  filename = 'humation-avatar',
  className,
  hiddenGroupIds,
  hiddenColorIds,
  onChange,
}: AvatarBuilderProps) {
  const defaultValueRef = React.useRef(defaultValue);
  const model = React.useMemo(
    () => buildAvatarBuilderModel(assets, { hiddenGroupIds, hiddenColorIds }),
    [assets, hiddenColorIds, hiddenGroupIds]
  );
  const [internalState, setInternalState] =
    React.useState<HumationAvatarBuilderState>(() =>
      createAvatarBuilderState(assets, {
        seed,
        state: defaultValueRef.current,
      })
    );
  const [colorSheetOpen, setColorSheetOpen] = React.useState(false);
  const [exportState, setExportState] =
    React.useState<AvatarExportState>('idle');
  const exportInFlightRef = React.useRef(false);

  React.useEffect(() => {
    setInternalState(
      createAvatarBuilderState(assets, {
        seed,
        state: defaultValueRef.current,
      })
    );
  }, [assets, seed]);

  const state = React.useMemo(
    () =>
      createAvatarBuilderState(assets, {
        seed,
        state: value ?? internalState,
      }),
    [assets, internalState, seed, value]
  );

  const commitState = React.useCallback(
    (nextState: HumationAvatarBuilderState) => {
      if (!value) setInternalState(nextState);
      onChange?.(nextState);
    },
    [onChange, value]
  );

  const handleSelectPart = React.useCallback(
    (slotId: string, partId: string) => {
      commitState({
        ...state,
        selections: { ...state.selections, [slotId]: partId },
      });
    },
    [commitState, state]
  );

  const handleColorChange = React.useCallback(
    (slotId: string, color: string) => {
      commitState({
        ...state,
        colors: { ...state.colors, [slotId]: color },
      });
    },
    [commitState, state]
  );

  const handleBackgroundChange = React.useCallback(
    (background: string) => {
      commitState({ ...state, background });
    },
    [commitState, state]
  );

  const handleRandomize = React.useCallback(() => {
    commitState(randomizeAvatarBuilderState(state, model.groups));
  }, [commitState, model.groups, state]);

  const handleExportPng = React.useCallback(async () => {
    if (exportInFlightRef.current) return;

    exportInFlightRef.current = true;
    setExportState('exporting');
    const startedAt = window.performance.now();
    const finish = (nextState: AvatarExportState) => {
      const delay = Math.max(180 - (window.performance.now() - startedAt), 0);
      window.setTimeout(() => {
        exportInFlightRef.current = false;
        setExportState(nextState);
        window.setTimeout(
          () => setExportState('idle'),
          nextState === 'success' ? 1800 : 2400
        );
      }, delay);
    };

    try {
      await downloadAvatarPng(assets, state, { filename });
      finish('success');
    } catch (error) {
      console.error('Humation PNG export failed:', error);
      finish('error');
    }
  }, [assets, filename, state]);

  const handleDownloadSvg = React.useCallback(() => {
    downloadAvatarSvg(assets, state, { filename });
  }, [assets, filename, state]);

  const handleCopyJson = React.useCallback(async () => {
    await copyAvatarState(state);
  }, [state]);

  return (
    <div
      className={cx(
        'mx-auto flex h-dvh w-full max-w-6xl flex-col overflow-hidden bg-background text-foreground sm:h-auto sm:min-h-[680px] sm:rounded-[2rem] sm:ring-1 sm:ring-border md:grid md:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]',
        className
      )}
    >
      <AvatarPreview
        assets={assets}
        state={state}
        title={title}
        exportState={exportState}
        onRandomize={handleRandomize}
        onOpenColors={() => setColorSheetOpen(true)}
        onExportPng={handleExportPng}
        onDownloadSvg={handleDownloadSvg}
        onCopyJson={handleCopyJson}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <AvatarPartPicker
          assets={assets}
          groups={model.groups}
          state={state}
          onSelectPart={handleSelectPart}
        />
      </div>
      <AvatarColorSheet
        open={colorSheetOpen}
        onOpenChange={setColorSheetOpen}
        colors={model.colors}
        values={state.colors}
        background={state.background}
        onColorChange={handleColorChange}
        onBackgroundChange={handleBackgroundChange}
      />
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
