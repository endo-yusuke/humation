'use client';

import * as React from 'react';
import type { HumationManifest, PartOption } from '@humation/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  HumationAvatarBuilderState,
  HumationPartGroup,
  HumationPartSubgroup,
} from '@/lib/humation/avatar-state';
import {
  formatPartLabel,
  getPartPreviewDataUri,
} from '@/lib/humation/avatar-state';

type AvatarPartPickerProps = {
  assets: HumationManifest;
  groups: HumationPartGroup[];
  state: HumationAvatarBuilderState;
  onSelectPart: (slotId: string, partId: string) => void;
};

export function AvatarPartPicker({
  assets,
  groups,
  state,
  onSelectPart,
}: AvatarPartPickerProps) {
  const defaultTab = groups[0]?.id ?? '';
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  React.useEffect(() => {
    if (!groups.some((group) => group.id === activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, defaultTab, groups]);

  if (groups.length === 0) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="shrink-0 border-b px-3 pt-3 md:px-5 md:pt-5">
        <TabsList className="h-10 w-full justify-start overflow-x-auto rounded-none bg-transparent p-0">
          {groups.map((group) => (
            <TabsTrigger
              key={group.id}
              value={group.id}
              className="h-10 rounded-none border-b-2 border-transparent px-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-4 md:px-5">
          {groups.map((group) => (
            <TabsContent key={group.id} value={group.id} className="m-0">
              <PartGroupPanel
                assets={assets}
                group={group}
                state={state}
                onSelectPart={onSelectPart}
              />
            </TabsContent>
          ))}
        </div>
      </ScrollArea>
    </Tabs>
  );
}

function PartGroupPanel({
  assets,
  group,
  state,
  onSelectPart,
}: {
  assets: HumationManifest;
  group: HumationPartGroup;
  state: HumationAvatarBuilderState;
  onSelectPart: (slotId: string, partId: string) => void;
}) {
  const [subgroupId, setSubgroupId] = React.useState(
    group.subgroups[0]?.id ?? group.id
  );
  const selectedSubgroup =
    group.subgroups.find((subgroup) => subgroup.id === subgroupId) ??
    group.subgroups[0];

  React.useEffect(() => {
    if (!group.subgroups.some((subgroup) => subgroup.id === subgroupId)) {
      setSubgroupId(group.subgroups[0]?.id ?? group.id);
    }
  }, [group, subgroupId]);

  return (
    <div className="flex flex-col gap-3">
      {group.subgroups.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {group.subgroups.map((subgroup) => (
            <button
              key={subgroup.id}
              type="button"
              onClick={() => setSubgroupId(subgroup.id)}
              className={cx(
                'h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors',
                subgroupId === subgroup.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {subgroup.label}
            </button>
          ))}
        </div>
      ) : null}

      {selectedSubgroup ? (
        <PartGrid
          assets={assets}
          subgroup={selectedSubgroup}
          state={state}
          onSelectPart={onSelectPart}
        />
      ) : null}
    </div>
  );
}

function PartGrid({
  assets,
  subgroup,
  state,
  onSelectPart,
}: {
  assets: HumationManifest;
  subgroup: HumationPartSubgroup;
  state: HumationAvatarBuilderState;
  onSelectPart: (slotId: string, partId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {subgroup.parts.map((part) => (
        <PartButton
          key={part.id}
          assets={assets}
          part={part}
          subgroup={subgroup}
          state={state}
          onSelectPart={onSelectPart}
        />
      ))}
    </div>
  );
}

function PartButton({
  assets,
  part,
  subgroup,
  state,
  onSelectPart,
}: {
  assets: HumationManifest;
  part: PartOption;
  subgroup: HumationPartSubgroup;
  state: HumationAvatarBuilderState;
  onSelectPart: (slotId: string, partId: string) => void;
}) {
  const selected = state.selections[subgroup.selectionSlot] === part.id;
  const label = formatPartLabel(part);

  return (
    <button
      type="button"
      title={label}
      aria-label={`${subgroup.label}: ${label}`}
      aria-pressed={selected}
      data-part-id={part.id}
      data-source-part-id={part.source?.partId}
      onClick={() => onSelectPart(subgroup.selectionSlot, part.id)}
      className={cx(
        'relative flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-2xl bg-background p-3 ring-1 ring-border ring-inset transition active:scale-[0.98]',
        selected
          ? 'bg-accent ring-2 ring-primary'
          : 'hover:bg-accent/60 hover:ring-ring'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getPartPreviewDataUri(assets, part, state)}
        alt=""
        className={cx(
          'max-h-full max-w-full select-none',
          subgroup.selectionSlot === 'glasses' && 'scale-[2.15]'
        )}
        draggable={false}
      />
    </button>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
