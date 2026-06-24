'use client';

import * as React from 'react';
import type { ColorSlot } from '@humation/core';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  formatColorLabel,
  normalizeHexColor,
  toCssColor,
} from '@/lib/humation/avatar-state';

type AvatarColorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: ColorSlot[];
  values: Record<string, string>;
  background: string;
  onColorChange: (slotId: string, color: string) => void;
  onBackgroundChange: (color: string) => void;
};

export function AvatarColorSheet({
  open,
  onOpenChange,
  colors,
  values,
  background,
  onColorChange,
  onBackgroundChange,
}: AvatarColorSheetProps) {
  const backgroundSlot = colors.find((color) => color.id === 'background');
  const colorSlots = colors.filter((color) => color.id !== 'background');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[78dvh] rounded-t-[2rem] px-0 pb-0 sm:max-w-xl"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-3 px-4 pb-2 pt-4 text-left">
          <SheetTitle className="text-base">Colors</SheetTitle>
          <SheetClose asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Close colors"
              className="rounded-full"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-5">
          {colorSlots.map((color) => (
            <ColorRow
              key={color.id}
              label={formatColorLabel(color)}
              hexColor={values[color.id] ?? color.default}
              fallback={color.default}
              onChange={(nextColor) => onColorChange(color.id, nextColor)}
            />
          ))}

          {backgroundSlot ? (
            <ColorRow
              label={formatColorLabel(backgroundSlot)}
              hexColor={
                background === 'transparent'
                  ? backgroundSlot.default
                  : background
              }
              fallback={backgroundSlot.default}
              onChange={onBackgroundChange}
              trailing={
                backgroundSlot.allowTransparent ? (
                  <Button
                    type="button"
                    variant={
                      background === 'transparent' ? 'default' : 'secondary'
                    }
                    size="sm"
                    onClick={() =>
                      onBackgroundChange(
                        background === 'transparent'
                          ? backgroundSlot.default
                          : 'transparent'
                      )
                    }
                  >
                    Transparent
                  </Button>
                ) : null
              }
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type ColorRowProps = {
  label: string;
  hexColor: string;
  fallback: string;
  onChange: (color: string) => void;
  trailing?: React.ReactNode;
};

function ColorRow({
  label,
  hexColor,
  fallback,
  onChange,
  trailing,
}: ColorRowProps) {
  const [localColor, setLocalColor] = React.useState(
    `#${normalizeHexColor(hexColor, fallback)}`
  );
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = React.useRef(onChange);

  onChangeRef.current = onChange;

  React.useEffect(() => {
    if (hexColor === 'transparent') return;
    setLocalColor(`#${normalizeHexColor(hexColor, fallback)}`);
  }, [fallback, hexColor]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const commitColor = React.useCallback((value: string) => {
    onChangeRef.current(value.replace('#', '').toUpperCase());
  }, []);

  const handleInput = React.useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value;
      setLocalColor(value);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => commitColor(value), 240);
    },
    [commitColor]
  );

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value;
      setLocalColor(value);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      commitColor(value);
    },
    [commitColor]
  );

  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-muted/55">
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {localColor.toUpperCase()}
        </span>
        {trailing}
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-border ring-inset transition-shadow focus-within:ring-2 focus-within:ring-primary">
          <span
            aria-hidden="true"
            className="absolute inset-1 rounded-full"
            style={{ background: toCssColor(localColor, fallback) }}
          />
          <input
            type="color"
            value={localColor}
            onInput={handleInput}
            onChange={handleChange}
            aria-label={label}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      </span>
    </label>
  );
}
