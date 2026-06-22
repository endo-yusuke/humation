'use client';

import * as React from 'react';
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// The asset set to build with. Swap this to use another template.
const assets = humation1;

export type AvatarState = {
  selections: Record<string, string>;
  colors: Record<string, string>;
};

export function AvatarBuilder({
  defaultState,
  onChange,
}: {
  /** Initial state, e.g. a previously saved avatar JSON. */
  defaultState?: Partial<AvatarState>;
  /** Called with the serializable avatar state on every change. */
  onChange?: (state: AvatarState) => void;
}) {
  const [selections, setSelections] = React.useState<Record<string, string>>(
    () => ({ ...assets.defaults.selections, ...defaultState?.selections })
  );
  const [colors, setColors] = React.useState<Record<string, string>>(() => ({
    ...assets.defaults.colors,
    ...defaultState?.colors,
  }));

  const update = (
    nextSelections: Record<string, string>,
    nextColors: Record<string, string>
  ) => {
    setSelections(nextSelections);
    setColors(nextColors);
    onChange?.({ selections: nextSelections, colors: nextColors });
  };

  const randomize = () => {
    const next = Object.fromEntries(
      assets.selectionSlots.map((slot) => {
        const parts = assets.parts.filter(
          (part) => part.selectionSlot === slot.id
        );
        return [slot.id, parts[Math.floor(Math.random() * parts.length)].id];
      })
    );
    update(next, colors);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
        {/* Preview */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <Avatar
            assets={assets}
            selections={selections}
            colors={colors}
            size={160}
            className="rounded-2xl"
            title="Avatar preview"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={randomize}>
              Random
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify({ selections, colors }, null, 2)
                )
              }
            >
              Copy JSON
            </Button>
          </div>
          {/* Colors */}
          <div className="grid w-full grid-cols-3 gap-2">
            {assets.colors
              .filter((slot) => slot.id !== 'background')
              .map((slot) => (
                <label
                  key={slot.id}
                  className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
                >
                  <input
                    type="color"
                    value={`#${colors[slot.id] ?? slot.default}`}
                    onChange={(event) =>
                      update(selections, {
                        ...colors,
                        [slot.id]: event.target.value.replace('#', ''),
                      })
                    }
                    className="h-8 w-full cursor-pointer rounded-md border bg-transparent"
                    aria-label={slot.label}
                  />
                  {slot.label}
                </label>
              ))}
          </div>
        </div>

        {/* Part picker */}
        <Tabs
          defaultValue={
            assets.selectionSlots.find((slot) => slot.id === 'head')?.id ??
            assets.selectionSlots[0]?.id
          }
          className="min-w-0 flex-1"
        >
          <TabsList className="w-full">
            {assets.selectionSlots.map((slot) => (
              <TabsTrigger key={slot.id} value={slot.id} className="flex-1">
                {slot.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {assets.selectionSlots.map((slot) => (
            <TabsContent key={slot.id} value={slot.id}>
              <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-5">
                {assets.parts
                  .filter((part) => part.selectionSlot === slot.id)
                  .map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      title={part.name}
                      aria-pressed={selections[slot.id] === part.id}
                      onClick={() =>
                        update({ ...selections, [slot.id]: part.id }, colors)
                      }
                      className={`rounded-lg border p-1 transition-colors hover:bg-accent ${
                        selections[slot.id] === part.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent'
                      }`}
                    >
                      <Avatar
                        assets={assets}
                        selections={{ ...selections, [slot.id]: part.id }}
                        colors={colors}
                        size={56}
                        background="transparent"
                      />
                      <span className="block truncate text-center text-[10px] text-muted-foreground">
                        {part.name}
                      </span>
                    </button>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
